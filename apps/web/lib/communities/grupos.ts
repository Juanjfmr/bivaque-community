import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

export const MOTIVO_MAX = 300
export function lerMotivo(valor: unknown): string | null {
  if (valor === undefined) return ""
  if (typeof valor !== "string") return null
  const motivo = valor.trim()
  return motivo.length <= MOTIVO_MAX ? motivo : null
}

export function entrarNoGrupo(client: SupabaseClient<Database>, grupoId: string, motivo: string) {
  return client.rpc("join_group", {
    p_group_id: grupoId,
    ...(motivo === "" ? {} : { p_reason: motivo }),
  })
}

/**
 * A participação da etapa de interesses da entrada (BUG-CIDADE-GRUPOS).
 *
 * A entrada só grava interesse (`user_group_interests`), e a Comunidade lista
 * `group_memberships`: quem marcava "Entrar" nunca virava membro. Aqui cada id
 * marcado que a consulta confirma **público, da cidade atual e não apagado**
 * entra pela RPC canônica `join_group`, no cliente da SESSÃO — a função é
 * SECURITY DEFINER e resolve o dono por `auth.uid()`, então um cliente de
 * privilégio não serve.
 *
 * O corpo da entrada não é confiável: id de grupo privado, de outra cidade ou
 * inexistente é ignorado sem erro para a pessoa (a consulta já exige o recorte,
 * e grupo fechado não vira pedido por acidente). Falha do banco devolve
 * `ok: false`: a rota responde 503 e a nova tentativa é idempotente, porque
 * `join_group` não duplica participação.
 */
export async function entrarNosGruposDaEntrada(
  client: SupabaseClient<Database>,
  localityId: string,
  groupIds: readonly string[],
): Promise<Readonly<{ ok: true }> | Readonly<{ ok: false; motivo: string }>> {
  if (groupIds.length === 0) return { ok: true }

  const { data, error } = await client
    .from("groups")
    .select("id")
    .in("id", [...groupIds])
    .eq("locality_id", localityId)
    .eq("visibility", "public")
    .eq("is_deleted", false)
  if (error) return { ok: false, motivo: error.message }

  for (const grupo of data ?? []) {
    const { error: erroDoJoin } = await client.rpc("join_group", { p_group_id: grupo.id })
    if (erroDoJoin) return { ok: false, motivo: erroDoJoin.message }
  }
  return { ok: true }
}

export function lerComentarioDoGrupo(corpo: Record<string, unknown>) {
  const content = typeof corpo["texto"] === "string" ? corpo["texto"].trim() : ""
  const alvo = corpo["respondeA"]
  if (
    content.length < 1 ||
    content.length > 1000 ||
    (alvo !== undefined && alvo !== null && typeof alvo !== "string")
  )
    return null
  return { content, reply_to_id: typeof alvo === "string" ? alvo : null }
}

type Posts = Database["public"]["Tables"]["posts"]
type Comentarios = Database["public"]["Tables"]["comments"]
type CamposDoFio = { parent_id: string | null; reply_to_id: string | null }
type BancoDosGrupos = Database & {
  public: {
    Tables: {
      posts: {
        Row: Posts["Row"] & { photo_paths: string[] }
        Insert: Posts["Insert"] & { photo_paths?: string[] }
        Update: Posts["Update"] & { photo_paths?: string[] }
      }
      comments: {
        Row: Comentarios["Row"] & CamposDoFio
        Insert: Comentarios["Insert"] & Partial<CamposDoFio>
        Update: Comentarios["Update"] & Partial<CamposDoFio>
      }
      hidden_posts: {
        Row: { user_id: string; post_id: string; hidden_at: string }
        Insert: { user_id: string; post_id: string; hidden_at?: string }
        Update: { hidden_at?: string }
        Relationships: []
      }
      comment_reactions: {
        Row: { user_id: string; comment_id: string; created_at: string }
        Insert: { user_id: string; comment_id: string; created_at?: string }
        Update: { created_at?: string }
        Relationships: []
      }
    }
  }
}
// shortcut: colunas RUN-021 tipadas só nesta jornada; substituir pela geração pública na integração.
export function clienteDosGrupos(client: SupabaseClient<Database>): SupabaseClient<BancoDosGrupos> {
  return client as unknown as SupabaseClient<BancoDosGrupos>
}
