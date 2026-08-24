"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { byteaDigestParam } from "../../../lib/invites-bytea"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import { emailHint } from "./family-invite-email-hint"

type PendingInviteRow = {
  id: string
  invitee_email_digest: string
  invitee_email_hint: string | null
  created_at: string
  expires_at: string
}

type FamilyInviteData = {
  isVerified: boolean
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

export async function getFamilyInviteDataAction(): Promise<FamilyInviteData | null> {
  const userId = await readSessionUserId()
  if (!userId) return null

  const supabase = createServiceClient()
  const [{ data: isVerified }, { data: pendingData }] = await Promise.all([
    supabase.rpc("is_verified_holder", { p_user_id: userId }),
    supabase.rpc("list_pending_invites_with_hint", { p_user_id: userId }),
  ])

  return {
    isVerified: isVerified === true,
    pending: (pendingData as PendingInviteRow[] | null) ?? [],
  }
}

export async function sendFamilyInviteAction(
  formData: FormData,
): Promise<{ token: string } | undefined> {
  const email = formData.get("email")
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("email inválido")
  }

  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  const supabase = createServiceClient()
  const { data: isVerified } = await supabase.rpc("is_verified_holder", {
    p_user_id: userId,
  })
  if (!isVerified) {
    throw new Error("apenas titulares verificados podem enviar convites")
  }

  const { createHash, randomBytes } = await import("node:crypto")
  const token = randomBytes(32)
  const tokenDigest = createHash("sha256").update(token).digest("hex")
  const normalizedEmail = email.trim().toLowerCase()
  const emailDigest = createHash("sha256").update(normalizedEmail).digest("hex")

  const { error } = await supabase.rpc("create_family_invitation", {
    p_inviter_user_id: userId,
    p_token_digest: byteaDigestParam(tokenDigest),
    p_invitee_email_digest: emailDigest,
    p_invitee_email_hint: emailHint(email),
  })

  if (error) {
    if (error.message.includes("maximum 5")) {
      throw new Error("máximo de 5 convites ativos. Revogue um antes de enviar outro.")
    }
    throw new Error(error.message)
  }

  // The link must reach the invitee. Enqueueing is the contract — the Resend
  // adapter (D1) delivers. The raw e-mail only ever lives in the outbox
  // recipient column and never becomes a private table column.
  const { error: outboxError } = await supabase.from("outbox").insert({
    recipient: normalizedEmail,
    channel: "email",
    type: "family_invite",
    payload: { user_id: userId },
  })

  if (outboxError) {
    throw new Error(`Falha ao enfileirar o convite: ${outboxError.message}`)
  }

  revalidatePath("/profile")

  // The token is shown exactly once, right here: it is not persisted, logged,
  // or sent in navigation. The digest is the only stored form (20260815130000).
  return { token: token.toString("hex") }
}

export async function revokeFamilyInviteAction(formData: FormData) {
  const invitationId = formData.get("invitationId")
  if (typeof invitationId !== "string" || invitationId.length === 0) {
    throw new Error("invitationId required")
  }

  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  const supabase = createServiceClient()
  const { error } = await supabase.rpc("revoke_family_invitation", {
    p_invitation_id: invitationId,
    p_inviter_user_id: userId,
  })

  if (error) {
    if (error.message.includes("not found or not revocable")) {
      throw new Error("Convite não encontrado ou já não pode ser revogado.")
    }
    throw new Error(error.message)
  }

  revalidatePath("/profile")
}
