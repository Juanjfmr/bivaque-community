import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { formatarCep } from "../../../../lib/geo/cep"
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

export type LocalizacaoDoPerfil = Readonly<{ cep: string | null; definida: boolean }>
export type PerfilDaPessoa = Readonly<{
  nome: string
  bio: string | null
  cidade: string
  localizacao: LocalizacaoDoPerfil
  /** false quando o CEP existe mas nenhuma fonte o localiza (ADR-20261112). */
  distanciaDisponivel: boolean
}>
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

/**
 * O CEP do dono da sessão, a marca de definida e se há posição — nunca a
 * coordenada em si.
 *
 * A função do banco resolve o dono por `auth.uid()`; esta camada não aceita id
 * de fora. Falha sobe: perfil vazio não é "sem localização".
 */
export async function localizacaoDaSessao(
  client: Cliente,
): Promise<Readonly<{ localizacao: LocalizacaoDoPerfil; distanciaDisponivel: boolean }>> {
  const { data, error } = await client.rpc("get_my_profile_location")
  if (error) throw error
  const linha = data[0]
  if (linha === undefined)
    return { localizacao: { cep: null, definida: false }, distanciaDisponivel: false }
  // O gerador de tipos trata colunas de `returns table` como não nulas; o CEP
  // do perfil é anulável de verdade, então quem decide é o valor em runtime.
  const cep: unknown = linha.cep
  return {
    localizacao: {
      cep: typeof cep === "string" ? formatarCep(cep) : null,
      definida: linha.definida === true,
    },
    distanciaDisponivel: linha.com_coordenada === true,
  }
}

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
  const [cidade, { localizacao, distanciaDisponivel }] = await Promise.all([
    cidadeDaSessao(client, userId),
    localizacaoDaSessao(client),
  ])
  return {
    nome: data.display_name,
    bio: data.bio,
    cidade: cidade?.nome ?? "",
    localizacao,
    distanciaDisponivel,
  }
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
