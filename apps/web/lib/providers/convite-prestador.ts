import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

/**
 * TROCA-005 — o convite de prestador lido e aceito pela porta do app.
 *
 * A leitura é pública porque quem abre o link ainda não tem conta: a RPC
 * `read_provider_invitation` é executável por `anon` e devolve só a comunidade e
 * o estado. Token malformado e token desconhecido recebem a mesma resposta, para
 * a rota não virar oráculo de existência. O aceite é da sessão e confere o
 * e-mail no banco (`accept_provider_invitation`).
 */

export const TOKEN_DO_CONVITE = /^[0-9a-fA-F]{64}$/

export type EstadoDoConvite = "pendente" | "aceito" | "revogado" | "expirado"

export type ConviteDePrestador = Readonly<{
  comunidadeId: string
  comunidade: string
  estado: EstadoDoConvite
}>

const ESTADOS: Readonly<Record<string, EstadoDoConvite>> = {
  pending: "pendente",
  accepted: "aceito",
  revoked: "revogado",
  expired: "expirado",
}

function ambiente(): { url: string; anon: string } {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anon = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anon) throw new Error("configuração do Supabase ausente")
  return { url, anon }
}

/** Cliente público, sem cookie e sem sessão: só a RPC de leitura do convite. */
export function clientePublico(): SupabaseClient<Database> {
  const { url, anon } = ambiente()
  return createClient<Database>(url, anon, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

type LinhaDoConvite = { community_id: string; community_name: string; status: string }

export async function lerConviteDePrestador(
  token: string,
  client: SupabaseClient<Database> = clientePublico(),
): Promise<ConviteDePrestador | null> {
  if (!TOKEN_DO_CONVITE.test(token)) return null
  const { data, error } = await client.rpc("read_provider_invitation", { p_token: token })
  if (error) throw error
  const linha = (Array.isArray(data) ? data[0] : undefined) as LinhaDoConvite | undefined
  if (linha === undefined) return null
  const estado = ESTADOS[linha.status]
  if (estado === undefined) return null
  return { comunidadeId: linha.community_id, comunidade: linha.community_name, estado }
}

export type ResultadoDoAceite =
  | { readonly ok: true }
  | { readonly ok: false; readonly motivo: MotivoDoAceite }

export type MotivoDoAceite =
  | "convite-nao-encontrado"
  | "convite-expirado"
  | "convite-usado"
  | "conta-recusada"
  | "outro-email"
  | "indisponivel"

/** Aceita com a sessão da pessoa; o e-mail sai do servidor, nunca do corpo. */
export async function aceitarConviteDePrestador(
  client: SupabaseClient<Database>,
  token: string,
  email: string | null,
): Promise<ResultadoDoAceite> {
  if (!TOKEN_DO_CONVITE.test(token) || email === null) {
    return { ok: false, motivo: "convite-nao-encontrado" }
  }
  const { error } = await client.rpc("accept_provider_invitation", {
    p_token: token,
    p_email: email,
  })
  if (error === null) return { ok: true }
  if (error.code === "P0002") return { ok: false, motivo: "outro-email" }
  if (error.code === "P0003") return { ok: false, motivo: "convite-usado" }
  if (error.code === "P0004") return { ok: false, motivo: "convite-expirado" }
  if (error.code === "42501") return { ok: false, motivo: "conta-recusada" }
  return { ok: false, motivo: "indisponivel" }
}
