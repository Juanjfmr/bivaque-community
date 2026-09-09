"use server"

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import type { Database } from "supabase/database.generated"

async function getAuthClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
}

function requiredString(value: FormDataEntryValue | null): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("valor obrigatório ausente")
  }
  return value
}

// RECON-004 (prancha 42, correção do responsável 07/09 §3): o formulário de
// participação envia junto um "motivo" opcional (campo `motivo` no FormData).
// O RPC `request_community_membership(uuid)` aceita apenas o id da comunidade
// e este contrato proíbe criar migration, RPC ou coluna — portanto o texto é
// coletado na tela mas NÃO é persistido nesta leva. Ele não vira publicação
// nem biografia em nenhum caminho: é simplesmente descartado na fronteira.
// Persistência do motivo (coluna + parâmetro no RPC + leitura restrita a quem
// analisa e ao solicitante) precisa de contrato próprio, com teste positivo e
// negativo de acesso; registrar como dependência aberta no relatório.
export async function requestCommunityMembershipAction(formData: FormData) {
  const communityId = requiredString(formData.get("communityId"))
  const supabase = await getAuthClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("não autenticado")

  const { error } = await supabase.rpc("request_community_membership", {
    p_community_id: communityId,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/communities/${communityId}`)
  revalidatePath("/communities")
}

export async function transferCommunityOwnershipAction(formData: FormData) {
  const communityId = requiredString(formData.get("communityId"))
  const newOwnerId = requiredString(formData.get("newOwnerId"))
  const supabase = await getAuthClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("não autenticado")

  const { error } = await supabase.rpc("transfer_community_ownership", {
    p_community_id: communityId,
    p_new_owner_user_id: newOwnerId,
  })
  if (error) throw new Error(error.message)

  revalidatePath(`/communities/${communityId}`)
  revalidatePath("/communities")
}
