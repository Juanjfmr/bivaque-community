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
