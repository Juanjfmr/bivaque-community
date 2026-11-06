import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { cidadeDaSessao } from "../eventos/_comum"

/**
 * O que as rotas da área "Você" compartilham (RUN-016 / ADR-20261105).
 *
 * O dono é SEMPRE `auth.sessao.usuario.id`; nada aqui aceita um id de fora. O
 * cliente é o da sessão, sob RLS: a autorização é a policy, não um filtro que
 * esta camada inventa.
 *
 * Falha de leitura sobe (`throw`): a rota decide entre 503 e seguir, e um erro
 * de banco nunca vira lista vazia.
 */

type Cliente = SupabaseClient<Database>

export type PerfilDaPessoa = Readonly<{ nome: string; bio: string | null; cidade: string }>
export type ContagensDoPerfil = Readonly<{
  salvos: number
  anuncios: number
  perguntas: number
  grupos: number
}>
export type PerfilDaConta = Readonly<{
  perfil: PerfilDaPessoa
  contagens: ContagensDoPerfil
  conta: Readonly<{ exclusaoPendente: boolean }>
}>

/** O perfil da sessão, ou `null` quando a linha não existe. */
export async function perfilDaSessao(
  client: Cliente,
  userId: string,
): Promise<PerfilDaPessoa | null> {
  const { data, error } = await client
    .from("profiles")
    .select("display_name,bio")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  if (data === null) return null
  const cidade = await cidadeDaSessao(client, userId)
  return { nome: data.display_name, bio: data.bio, cidade: cidade?.nome ?? "" }
}

async function contarSalvos(client: Cliente, userId: string): Promise<number> {
  const { count, error } = await client
    .from("listing_saves")
    .select("listing_id", { count: "exact", head: true })
    .eq("user_id", userId)
  if (error) throw error
  return count ?? 0
}

async function contarAnuncios(client: Cliente, userId: string): Promise<number> {
  const { count, error } = await client
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("owner_user_id", userId)
  if (error) throw error
  return count ?? 0
}

async function contarPerguntas(client: Cliente, userId: string): Promise<number> {
  const { count, error } = await client
    .from("recommendation_requests")
    .select("id", { count: "exact", head: true })
    .eq("author_id", userId)
    .eq("is_deleted", false)
  if (error) throw error
  return count ?? 0
}

async function contarGrupos(client: Cliente, userId: string): Promise<number> {
  const { count, error } = await client
    .from("group_memberships")
    .select("group_id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "approved")
  if (error) throw error
  return count ?? 0
}

/** O corpo de `GET /api/app/voce`; `null` é sessão sem perfil. */
export async function lerConta(client: Cliente, userId: string): Promise<PerfilDaConta | null> {
  const [perfil, salvos, anuncios, perguntas, grupos, pendente] = await Promise.all([
    perfilDaSessao(client, userId),
    contarSalvos(client, userId),
    contarAnuncios(client, userId),
    contarPerguntas(client, userId),
    contarGrupos(client, userId),
    client.rpc("is_account_deletion_pending"),
  ])
  if (pendente.error) throw pendente.error
  if (perfil === null) return null
  return {
    perfil,
    contagens: { salvos, anuncios, perguntas, grupos },
    conta: { exclusaoPendente: pendente.data === true },
  }
}
