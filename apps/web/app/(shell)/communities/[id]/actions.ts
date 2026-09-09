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

// RECON-009 (prancha 43, correção do responsável 07/09 §3): o motivo opcional
// agora tem destino — o RPC `request_community_membership(uuid, text)` (já
// migrado em 20260909014034) grava o texto em `community_join_reasons` na
// mesma transação do pedido, legível só pelo autor e por quem modera (policy
// própria). Texto vazio é normalizado a null pelo próprio RPC: o pedido sem
// motivo é válido e idempotente (`on conflict do nothing`).
export async function requestJoinWithReasonAction(formData: FormData): Promise<void> {
  const communityId = formData.get("communityId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    throw new Error("comunidade inválida")
  }
  const motivoRaw = formData.get("motivo")
  // O teto de 500 caracteres é o check da coluna; aparar aqui só evita
  // enviar texto a mais, nunca corta um motivo válido.
  const motivo = typeof motivoRaw === "string" ? motivoRaw.trim().slice(0, 500) : ""

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    throw new Error("não autenticado")
  }

  const { error } = await supabase.rpc("request_community_membership", {
    p_community_id: communityId,
    p_reason: motivo,
  })
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/communities/${communityId}`)
  revalidatePath("/communities")
}
