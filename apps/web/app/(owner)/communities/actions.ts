"use server"

import { revalidatePath } from "next/cache"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// Onda E Task 5: batch approval path. The plan is explicit — iterating in
// the server does NOT loosen authorization. Each call hits the existing RPC,
// which rechecks private.is_community_moderator. "gate once, write N"
// would be a privilege escalation; this code is the safe one.

async function approveCommunityMemberAction(formData: FormData) {
  const communityId = formData.get("communityId")
  const userId = formData.get("userId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("userId required")
  }

  const supabase = createServiceClient()
  const { data: isVerified } = await supabase.rpc("is_current_user_community_moderator", {
    p_community_id: communityId,
    p_user_id: userId,
  })
  if (!isVerified) {
    throw new Error("apenas moderadores podem aprovar")
  }

  const { error } = await supabase.rpc("approve_community_member", {
    p_community_id: communityId,
    p_user_id: userId,
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

  const supabase = createServiceClient()
  const { data: isVerified } = await supabase.rpc("is_current_user_community_moderator", {
    p_community_id: communityId,
    p_user_id: userId,
  })
  if (!isVerified) {
    throw new Error("apenas moderadores podem remover")
  }

  const { error } = await supabase.rpc("remove_community_member", {
    p_community_id: communityId,
    p_user_id: userId,
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

  const supabase = createServiceClient()

  // A iteração chama a mesma RPC e a mesma checagem. Não relaxamos authz:
  // cada approve_community_member revalida que o chamador é moderador. Um
  // laço que valida uma vez e escreve N vezes é escalada de privilégio;
  // este código evita isso por construção.
  for (const userId of userIds) {
    const { error } = await supabase.rpc("approve_community_member", {
      p_community_id: communityId,
      p_user_id: userId,
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

  const supabase = createServiceClient()

  for (const userId of userIds) {
    const { error } = await supabase.rpc("remove_community_member", {
      p_community_id: communityId,
      p_user_id: userId,
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

  const supabase = createServiceClient()
  const { error } = await supabase.rpc("add_community_moderator", {
    p_community_id: communityId,
    p_user_id: userId,
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

  const supabase = createServiceClient()
  const { error } = await supabase.rpc("remove_community_moderator", {
    p_community_id: communityId,
    p_user_id: userId,
  })
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/communities/${communityId}/admin/pending`)
  revalidatePath(`/communities/${communityId}/admin/moderators`)
}

export {
  addCommunityModeratorAction,
  approveCommunityMemberAction,
  approveCommunityMembersBatchAction,
  removeCommunityMemberAction,
  removeCommunityMembersBatchAction,
  removeCommunityModeratorAction,
}
