"use server"

// Onda E Task 6 — server actions for the community member invitation flow.
//
// Semantics are the OPPOSITE of the family invite (§5.4): verification is
// mandatory (D15), the link carries community scope (D14 — a leaked link
// yields a pending request, not access), and attribution is captured
// (the dono sees who invited the request).

import { allowSlidingWindow, LIMITS } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { callCommunityInviteRpc } from "../../../lib/community-invite-rpcs"
import { createLimiterStore } from "../../../lib/limits"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

type PendingInviteRow = {
  id: string
  community_id: string
  expires_at: string
  created_at: string
}

type CommunityInviteData = {
  isVerified: boolean
  isMember: boolean
  pending: PendingInviteRow[]
}

async function readSessionUserId(): Promise<string | null> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user?.id ?? null
}

async function memberInviteQuotaAllows(userId: string): Promise<boolean> {
  const url = process.env["UPSTASH_REDIS_REST_URL"]
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"]
  if (!url || !token) return true
  const { Redis } = await import("@upstash/redis")
  const store = createLimiterStore(new Redis({ url, token }))
  return allowSlidingWindow(
    store,
    `bivaque:limit:memberInvite:${userId}`,
    LIMITS.memberInvite.limit,
    LIMITS.memberInvite.windowMs,
  )
}

export async function getCommunityInviteDataAction(
  communityId: string,
): Promise<CommunityInviteData | null> {
  const userId = await readSessionUserId()
  if (!userId) return null

  const supabase = createServiceClient()
  const [verifiedResult, memberResult, pendingResult] = await Promise.all([
    supabase.rpc("is_verified_holder", { p_user_id: userId }),
    callCommunityInviteRpc(supabase, "is_community_member", { p_community_id: communityId }),
    callCommunityInviteRpc(supabase, "list_pending_community_invitations", {
      p_inviter_user_id: userId,
      p_community_id: communityId,
    }),
  ])

  return {
    isVerified: verifiedResult.data === true,
    isMember: memberResult.data === true,
    pending: pendingResult.data ?? [],
  }
}

export async function sendCommunityInviteAction(
  formData: FormData,
): Promise<{ token: string; inviteId: string } | undefined> {
  const communityId = formData.get("communityId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }

  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  const quotaAllows = await memberInviteQuotaAllows(userId)
  if (!quotaAllows) {
    throw new Error("cota de convites esgotada. Tente novamente mais tarde.")
  }

  const supabase = createServiceClient()

  const { createHash, randomBytes } = await import("node:crypto")
  const token = randomBytes(32)
  const tokenDigest = createHash("sha256").update(token).digest()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const { data: inviteId, error } = await callCommunityInviteRpc(
    supabase,
    "create_community_invitation",
    {
      p_community_id: communityId,
      p_inviter_user_id: userId,
      p_token_digest: tokenDigest.toString("hex"),
      p_expires_at: expiresAt.toISOString(),
    },
  )

  if (error) {
    if (error.message.includes("only verified members")) {
      throw new Error("apenas membros verificados podem convidar")
    }
    if (error.message.includes("only approved members")) {
      throw new Error("você precisa ser membro aprovado desta comunidade para convidar")
    }
    throw new Error(error.message)
  }

  // Enfileiramento no outbox, mesma rota que o convite familiar usa.
  // O token NÃO vai no payload — o link é mostrado uma única vez na resposta.
  const { error: outboxError } = await supabase.from("outbox").insert({
    recipient: "owner-link@local",
    channel: "email",
    type: "community_invite",
    payload: { community_id: communityId, inviter_user_id: userId, invite_id: inviteId },
  })

  if (outboxError) {
    throw new Error(`Falha ao enfileirar a entrega: ${outboxError.message}`)
  }

  revalidatePath(`/communities/${communityId}`)

  return { token: token.toString("hex"), inviteId: inviteId ?? "" }
}

export async function revokeCommunityInviteAction(formData: FormData) {
  const inviteId = formData.get("inviteId")
  if (typeof inviteId !== "string" || inviteId.length === 0) {
    throw new Error("inviteId required")
  }

  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  const supabase = createServiceClient()
  const { error } = await callCommunityInviteRpc(supabase, "revoke_community_invitation", {
    p_invitation_id: inviteId,
    p_inviter_user_id: userId,
  })

  if (error) {
    if (error.message.includes("not found or not revocable")) {
      throw new Error("Convite não encontrado ou já não pode ser revogado.")
    }
    throw new Error(error.message)
  }

  const communityId = formData.get("communityId")
  if (typeof communityId === "string" && communityId.length > 0) {
    revalidatePath(`/communities/${communityId}`)
  }
}

export async function acceptCommunityInviteAction(
  formData: FormData,
): Promise<{ communityId: string } | { needsVerification: true } | undefined> {
  const token = formData.get("token")
  if (typeof token !== "string" || token.length === 0) {
    throw new Error("token required")
  }

  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  const { createHash } = await import("node:crypto")
  const tokenDigest = createHash("sha256").update(Buffer.from(token, "hex")).digest()

  const supabase = createServiceClient()
  const { data: communityId, error } = await callCommunityInviteRpc(
    supabase,
    "accept_community_invitation",
    {
      p_token_digest: tokenDigest.toString("hex"),
      p_user_id: userId,
    },
  )

  if (error) {
    if (error.message.includes("verification required")) {
      return { needsVerification: true }
    }
    if (error.message.includes("not found")) {
      throw new Error("Convite não encontrado.")
    }
    if (error.message.includes("already")) {
      throw new Error("Este convite já foi usado.")
    }
    if (error.message.includes("expired")) {
      throw new Error("Convite expirado.")
    }
    throw new Error(error.message)
  }

  return { communityId: communityId ?? "" }
}
