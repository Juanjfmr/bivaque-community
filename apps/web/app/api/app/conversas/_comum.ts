import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function cursorDe(valor: string | null): { data: string; id: string } | null {
  if (valor === null) return null
  const partes = valor.split("|")
  const data = partes[0] ?? ""
  const id = partes[1] ?? ""
  if (
    partes.length !== 2 ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|\+00:00)$/.test(data) ||
    !Number.isFinite(Date.parse(data)) ||
    !UUID.test(id)
  )
    return null
  return { data, id }
}

export async function conversaDaSessao(client: SupabaseClient<Database>, id: string) {
  const { data, error } = await client
    .from("dm_conversations")
    .select("id,participant_a,participant_b,context_type,context_id,created_at")
    .eq("id", id)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * O outro participante: é o perfil que o cabeçalho da conversa abre. A lista e o
 * detalhe já leem a linha sob a RLS de participante; o id não é uma porta nova.
 */
export function outroParticipante(
  conversa: { participant_a: string; participant_b: string },
  userId: string,
): string {
  return conversa.participant_a === userId ? conversa.participant_b : conversa.participant_a
}

export async function nomeDaConversa(client: SupabaseClient<Database>, id: string) {
  const { data, error } = await client.rpc("conversation_counterpart_name", {
    p_conversation_id: id,
  })
  if (error) throw error
  return data?.trim() || "Participante"
}

export function mensagemDaLinha(
  linha: { id: string; content: string; sender_id: string; created_at: string },
  userId: string,
) {
  return {
    id: linha.id,
    conteudo: linha.content,
    minha: linha.sender_id === userId,
    criadaEm: linha.created_at,
  }
}
