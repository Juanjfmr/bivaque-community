"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import {
  COMMUNITY_IMAGE_BUCKET,
  communityImagePath,
  isCommunityImageKind,
  validateCommunityImage,
} from "../../../lib/communities/community-media"
import { log } from "../../../lib/logger"
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

// Variantes por linha com o id ligado (RECON-049, par 73): o React 19
// rejeita name/value em botão cujo formAction é função ("will get
// overridden"), então o userId viaja como primeiro argumento do bind —
// formAction={fn.bind(null, member.user_id)}. O comportamento é o mesmo da
// ação original; nada de authz nova aqui.
export async function approveCommunityMemberByIdAction(userId: string, formData: FormData) {
  formData.set("userId", userId)
  await approveCommunityMemberAction(formData)
}

export async function removeCommunityMemberByIdAction(userId: string, formData: FormData) {
  formData.set("userId", userId)
  await removeCommunityMemberAction(formData)
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

// RECON-034 — faixa e miniatura da comunidade. O dono envia, troca e remove.
//
// O caminho do objeto é determinístico (`<communityId>/<kind>`): trocar
// SOBRESCREVE o mesmo objeto, então a troca não deixa arquivo antigo. A
// autorização é decidida aqui (dono) e REVALIDADA na RPC `set_community_image`,
// que recebe o chamador explícito — service_role é privilégio, não identidade.
async function requireCommunityOwner(communityId: string, callerId: string) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("communities")
    .select("id, owner_user_id, banner_path, thumbnail_path")
    .eq("id", communityId)
    .eq("is_deleted", false)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error("comunidade não encontrada")
  if (data.owner_user_id !== callerId) {
    throw new Error("só quem responde pela comunidade pode alterar as imagens")
  }
  return data
}

function readImageInput(formData: FormData): {
  communityId: string
  kind: "banner" | "thumbnail"
  file: File
} {
  const communityId = formData.get("communityId")
  const kind = formData.get("kind")
  const file = formData.get("image")

  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }
  if (typeof kind !== "string" || !isCommunityImageKind(kind)) {
    throw new Error("kind required")
  }
  if (!(file instanceof File)) {
    throw new Error("no file provided")
  }

  const validation = validateCommunityImage({ mimeType: file.type, sizeBytes: file.size })
  if (!validation.ok) {
    throw new Error(
      validation.reason === "mime"
        ? "formato não permitido: use PNG, JPG ou WEBP"
        : "imagem maior que 10MB",
    )
  }

  return { communityId, kind, file }
}

async function setCommunityImageAction(formData: FormData) {
  const { communityId, kind, file } = readImageInput(formData)
  const callerId = await requireCallerUserId()
  const community = await requireCommunityOwner(communityId, callerId)

  const path = communityImagePath(communityId, kind)
  const service = createServiceClient()

  const { error: uploadError } = await service.storage
    .from(COMMUNITY_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: true })
  if (uploadError) throw new Error(uploadError.message)

  const { error: pointerError } = await service.rpc("set_community_image", {
    p_community_id: communityId,
    p_kind: kind,
    p_path: path,
    p_caller_user_id: callerId,
  })

  if (pointerError) {
    // Primeira imagem: o objeto ainda não é referenciado por ninguém, então
    // removê-lo evita órfão. Numa troca o ponteiro já aponta para o mesmo
    // caminho e os bytes novos já estão no ar — apagar destruiria a imagem
    // anterior sem necessidade.
    const previous = kind === "banner" ? community.banner_path : community.thumbnail_path
    if (previous === null) {
      await service.storage.from(COMMUNITY_IMAGE_BUCKET).remove([path])
    }
    throw new Error(pointerError.message)
  }

  revalidatePath(`/communities/${communityId}`)
  revalidatePath(`/communities/${communityId}/admin/media`)
  revalidatePath("/communities")
}

async function removeCommunityImageAction(formData: FormData) {
  const communityId = formData.get("communityId")
  const kind = formData.get("kind")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("communityId required")
  }
  if (typeof kind !== "string" || !isCommunityImageKind(kind)) {
    throw new Error("kind required")
  }

  const callerId = await requireCallerUserId()
  const community = await requireCommunityOwner(communityId, callerId)
  const previous = kind === "banner" ? community.banner_path : community.thumbnail_path
  if (previous === null) return

  const service = createServiceClient()

  // Limpar o ponteiro PRIMEIRO torna o objeto inalcançável na mesma operação,
  // mesmo que a remoção do arquivo falhe logo depois (a policy de leitura só
  // expõe o que a comunidade referencia).
  const { error: pointerError } = await service.rpc("set_community_image", {
    p_community_id: communityId,
    p_kind: kind,
    p_path: null,
    p_caller_user_id: callerId,
  })
  if (pointerError) throw new Error(pointerError.message)

  const { error: removeError } = await service.storage
    .from(COMMUNITY_IMAGE_BUCKET)
    .remove([previous])
  if (removeError) {
    log.error("community-images: pointer cleared but object removal failed", {
      community_id: communityId,
      kind,
      error: removeError.message,
    })
  }

  revalidatePath(`/communities/${communityId}`)
  revalidatePath(`/communities/${communityId}/admin/media`)
  revalidatePath("/communities")
}

export {
  addCommunityModeratorAction,
  approveCommunityMemberAction,
  approveCommunityMembersBatchAction,
  removeCommunityImageAction,
  removeCommunityMemberAction,
  removeCommunityMembersBatchAction,
  removeCommunityModeratorAction,
  revokeProviderAccountAction,
  setCommunityImageAction,
}
