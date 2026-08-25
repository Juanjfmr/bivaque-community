"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// Onda E Task 5: batch approval path. The plan is explicit — iterating in
// the server does NOT loosen authorization. Each call hits the existing RPC,
// which rechecks the caller's moderator status. "gate once, write N" would
// be a privilege escalation; this code is the safe one.
//
// Found investigating the batch-approval checkbox (20260821000025): every
// action here calls its RPC through service_role, which carries no JWT —
// the RPCs used to read the caller's identity from `(select auth.uid())`
// internally, which was always NULL, so every one of these silently denied
// every caller. The single-row actions additionally passed the wrong id
// entirely: `is_current_user_community_moderator(communityId, userId)` with
// `userId` bound from the FORM's target-member field, checking whether the
// pending member being approved was themselves a moderator (never true) —
// not whether the caller was. Both bugs are fixed by reading the caller's
// own id once per action, from the authenticated (JWT-carrying) client, and
// passing it explicitly to every RPC as p_caller_user_id — the RPC is what
// actually re-validates it (server-side, not just gating a client's say-so).

async function requireCallerUserId(): Promise<string> {
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
      setAll() {
        // Server Action mutates via service_role below; this client is
        // read-only, used only to resolve the caller's own identity.
      },
    },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) throw new Error("não autenticado")
  return user.id
}

async function approveCommunityMemberAction(formData: FormData) {
  const communityId = formData.get("communityId")
  const userId = formData.get("userId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("userId required")
  }

  const callerId = await requireCallerUserId()
  const supabase = createServiceClient()
  const { error } = await supabase.rpc("approve_community_member", {
    p_community_id: communityId,
    p_user_id: userId,
    p_caller_user_id: callerId,
  })
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/communities/${communityId}`)
  revalidatePath(`/communities/${communityId}/admin/pending`)
  revalidatePath("/communities")
}

async function removeCommunityMemberAction(formData: FormData) {
  const communityId = formData.get("communityId")
  const userId = formData.get("userId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("userId required")
  }

  const callerId = await requireCallerUserId()
  const supabase = createServiceClient()
  const { error } = await supabase.rpc("remove_community_member", {
    p_community_id: communityId,
    p_user_id: userId,
    p_caller_user_id: callerId,
  })
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/communities/${communityId}`)
  revalidatePath(`/communities/${communityId}/admin/pending`)
  revalidatePath("/communities")
}

async function approveCommunityMembersBatchAction(formData: FormData) {
  const communityId = formData.get("communityId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }

  // A fila envia um input userIds por linha selecionada; FormData.getAll
  // preserva a ordem e devolve apenas os valores não-vazios.
  const userIds = formData
    .getAll("userIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0)

  if (userIds.length === 0) {
    // Sem selecionados, nada a fazer — não falha a página.
    return
  }

  const callerId = await requireCallerUserId()
  const supabase = createServiceClient()

  // A iteração chama a mesma RPC e a mesma checagem. Não relaxamos authz:
  // cada approve_community_member revalida que o chamador é moderador. Um
  // laço que valida uma vez e escreve N vezes é escalada de privilégio;
  // este código evita isso por construção.
  for (const userId of userIds) {
    const { error } = await supabase.rpc("approve_community_member", {
      p_community_id: communityId,
      p_user_id: userId,
      p_caller_user_id: callerId,
    })
    if (error) {
      throw new Error(error.message)
    }
  }

  revalidatePath(`/communities/${communityId}`)
  revalidatePath(`/communities/${communityId}/admin/pending`)
  revalidatePath("/communities")
}

async function removeCommunityMembersBatchAction(formData: FormData) {
  const communityId = formData.get("communityId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }

  const userIds = formData
    .getAll("userIds")
    .filter((value): value is string => typeof value === "string" && value.length > 0)

  if (userIds.length === 0) {
    return
  }

  const callerId = await requireCallerUserId()
  const supabase = createServiceClient()

  for (const userId of userIds) {
    const { error } = await supabase.rpc("remove_community_member", {
      p_community_id: communityId,
      p_user_id: userId,
      p_caller_user_id: callerId,
    })
    if (error) {
      throw new Error(error.message)
    }
  }

  revalidatePath(`/communities/${communityId}`)
  revalidatePath(`/communities/${communityId}/admin/pending`)
  revalidatePath("/communities")
}

// Delegation: o dono promove e despromove moderadores. A RPC já foi
// corrigida para exigir owner (migration 023, achado da E5). A ação
// itera uma única chamada; não há batch porque promover N é raro.
async function addCommunityModeratorAction(formData: FormData) {
  const communityId = formData.get("communityId")
  const userId = formData.get("userId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("userId required")
  }

  const callerId = await requireCallerUserId()
  const supabase = createServiceClient()
  const { error } = await supabase.rpc("add_community_moderator", {
    p_community_id: communityId,
    p_user_id: userId,
    p_caller_user_id: callerId,
  })
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/communities/${communityId}/admin/pending`)
  revalidatePath(`/communities/${communityId}/admin/moderators`)
}

async function removeCommunityModeratorAction(formData: FormData) {
  const communityId = formData.get("communityId")
  const userId = formData.get("userId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("userId required")
  }

  const callerId = await requireCallerUserId()
  const supabase = createServiceClient()
  const { error } = await supabase.rpc("remove_community_moderator", {
    p_community_id: communityId,
    p_user_id: userId,
    p_caller_user_id: callerId,
  })
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/communities/${communityId}/admin/pending`)
  revalidatePath(`/communities/${communityId}/admin/moderators`)
}

// Onda G Task 3, Step 6: revogar a ficha de um prestador é ato do dono da
// comunidade que o atestou (ADR conta-de-prestador, decisão 2). O RPC
// reconfere a posse no banco; aqui o caller real sai do contexto
// autenticado, nunca do FormData.
async function revokeProviderAccountAction(formData: FormData) {
  const communityId = formData.get("communityId")
  const providerUserId = formData.get("providerUserId")
  const reason = formData.get("reason")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }
  if (typeof providerUserId !== "string" || providerUserId.length === 0) {
    throw new Error("providerUserId required")
  }
  if (typeof reason !== "string" || reason.trim().length === 0) {
    throw new Error("a revogação exige motivo")
  }

  const callerId = await requireCallerUserId()
  const serviceClient = createServiceClient()
  const { error } = await serviceClient.rpc("revoke_provider_account", {
    p_provider_user_id: providerUserId,
    p_owner_user_id: callerId,
    p_reason: reason.trim(),
  })
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/communities/${communityId}/admin/providers`)
}

export {
  addCommunityModeratorAction,
  approveCommunityMemberAction,
  approveCommunityMembersBatchAction,
  removeCommunityMemberAction,
  removeCommunityMembersBatchAction,
  removeCommunityModeratorAction,
  revokeProviderAccountAction,
}
