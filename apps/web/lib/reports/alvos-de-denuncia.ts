import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

type Cliente = SupabaseClient<Database>

/**
 * TROCA-005 — o que a pessoa pode denunciar a partir da Ajuda do app.
 *
 * A folha "Nova denúncia" não pede link nem id: oferece o conteúdo que a RLS da
 * sessão já deixa enxergar — publicações recentes da cidade e os grupos de que a
 * pessoa participa. Só entram alvos de OUTRA pessoa e conteúdo não apagado; o
 * servidor confere de novo no insert (`createReport` + RLS). O autor nunca é
 * devolvido: a denúncia não identifica ninguém, nem na tela nem no registro.
 */

export type AlvoDeDenuncia = Readonly<{
  tipo: "post" | "group"
  id: string
  titulo: string
}>

const LIMITE_DE_PUBLICACOES = 8
const LIMITE_DE_GRUPOS = 6
const TITULO_MAX = 120

type LinhaDoFeed = { id: string; user_id: string; content: string | null }

function recortar(texto: string): string {
  const limpo = texto.replace(/\s+/g, " ").trim()
  if (limpo.length <= TITULO_MAX) return limpo
  return `${limpo.slice(0, TITULO_MAX - 1).trimEnd()}…`
}

async function cidadeDaPessoa(client: Cliente, userId: string): Promise<string | null> {
  const { data, error } = await client
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", userId)
    .eq("kind", "current")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data?.locality_id ?? null
}

export async function alvosDeDenuncia(
  client: Cliente,
  userId: string,
): Promise<readonly AlvoDeDenuncia[]> {
  const cidade = await cidadeDaPessoa(client, userId)
  if (cidade === null) return []

  const [feed, participacoes] = await Promise.all([
    client.rpc("feed_posts", { p_locality_id: cidade, p_order: "recent" }),
    client
      .from("group_memberships")
      .select("group_id")
      .eq("user_id", userId)
      .eq("status", "approved"),
  ])
  if (feed.error) throw feed.error
  if (participacoes.error) throw participacoes.error

  const publicacoes = ((feed.data ?? []) as LinhaDoFeed[])
    .filter((linha) => linha.user_id !== userId && (linha.content ?? "").trim() !== "")
    .slice(0, LIMITE_DE_PUBLICACOES)
    .map((linha) => ({
      tipo: "post" as const,
      id: linha.id,
      titulo: recortar(linha.content ?? ""),
    }))

  const ids = [...new Set((participacoes.data ?? []).map((linha) => linha.group_id))]
  if (ids.length === 0) return publicacoes

  const grupos = await client
    .from("groups")
    .select("id,name")
    .in("id", ids)
    .eq("is_deleted", false)
    // Grupo da própria pessoa não é alvo de denúncia dela (a RLS deixaria ler).
    .neq("owner_user_id", userId)
    .order("name")
    .limit(LIMITE_DE_GRUPOS)
  if (grupos.error) throw grupos.error

  return [
    ...publicacoes,
    ...(grupos.data ?? []).map((grupo) => ({
      tipo: "group" as const,
      id: grupo.id,
      titulo: grupo.name,
    })),
  ]
}
