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
// O texto vai para `public.community_join_reasons` na mesma transação do
// pedido (migration 20260909014034), em tabela própria porque a política de
// `community_memberships` entrega a linha a qualquer membro aprovado — e a
// tela promete leitura só ao autor e a quem analisa. O RPC recebe o texto e a
// RLS da tabela nova é que faz a promessa valer.
export async function requestCommunityMembershipAction(formData: FormData) {
  const communityId = requiredString(formData.get("communityId"))
  const rawReason = formData.get("motivo")
  const reason = typeof rawReason === "string" ? rawReason.trim().slice(0, 500) : ""
  const supabase = await getAuthClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("não autenticado")

  const { error } = await supabase.rpc("request_community_membership", {
    p_community_id: communityId,
    ...(reason.length > 0 ? { p_reason: reason } : {}),
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
