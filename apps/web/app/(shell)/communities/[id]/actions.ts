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

// RECON-050 (ADR-20260914-saida-de-comunidade): o titular sai quando quiser.
// O RPC apaga a própria linha aprovada; o trigger D7 cuida do resto (grupos do
// saído passam ao dono, acessos caem) e recusa a saída do dono até que a
// administração seja transferida — por isso a mensagem específica abaixo.
export async function leaveCommunityAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const communityId = formData.get("communityId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    return { ok: false, message: "comunidade inválida" }
  }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: "não autenticado" }
  }

  const { error } = await supabase.rpc("leave_community", { p_community_id: communityId })
  if (error) {
    if (error.message.includes("transfer community ownership")) {
      return {
        ok: false,
        message: "Você é o dono desta comunidade. Transfira a administração antes de sair.",
      }
    }
    return { ok: false, message: "Não foi possível sair agora. Tente novamente." }
  }

  revalidatePath(`/communities/${communityId}`)
  revalidatePath("/communities")
  return { ok: true }
}

// RECON-050: cancelar o próprio pedido pendente. Sem pendência, é no-op —
// a associação aprovada nunca é tocada por esta porta.
export async function cancelCommunityRequestAction(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const communityId = formData.get("communityId")
  if (typeof communityId !== "string" || communityId.length === 0) {
    return { ok: false, message: "comunidade inválida" }
  }

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false, message: "não autenticado" }
  }

  const { error } = await supabase.rpc("cancel_community_request", {
    p_community_id: communityId,
  })
  if (error) {
    return { ok: false, message: "Não foi possível cancelar agora. Tente novamente." }
  }

  revalidatePath(`/communities/${communityId}`)
  revalidatePath("/communities")
  return { ok: true }
}
