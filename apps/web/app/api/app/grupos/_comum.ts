import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { clienteDosGrupos } from "../../../../lib/communities/grupos"
import { log } from "../../../../lib/logger"
import { nomesDeAutores } from "../perguntas/_comum"

/**
 * Sem `group_memberships(count)`: o embed de contagem exige SELECT de TABELA em
 * `group_memberships`, e a 20261024120000 o trocou por grant de coluna para
 * `authenticated`. O PostgREST responde 403 nesse embed, e a rota traduzia o
 * throw em 503 — a publicação em grupo fechado nunca chegava ao insert. A
 * contagem sai de `contarMembrosAprovados`, como em /api/app/inicio.
 */
export const CAMPOS_DO_GRUPO =
  "id,name,description,rules,visibility,locality_id,owner_user_id,pinned_post_id"

/**
 * A causa de um 503 fica no log do servidor: código e mensagem do Postgres, que
 * dizem qual policy/gatilho recusou. Nunca o corpo do pedido, o texto publicado
 * ou o id de quem pediu.
 */
export function registrarFalha(etapa: string, erro: unknown) {
  const postgres = (erro ?? {}) as { code?: unknown; message?: unknown }
  log.error(`app grupos: ${etapa} failed`, {
    codigo: typeof postgres.code === "string" ? postgres.code : "sem-codigo",
    mensagem: typeof postgres.message === "string" ? postgres.message : String(erro),
  })
}

export async function grupoDaSessao(client: SupabaseClient<Database>, id: string) {
  const { data, error } = await client
    .from("groups")
    .select(CAMPOS_DO_GRUPO)
    .eq("id", id)
    .eq("is_deleted", false)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function participacao(client: SupabaseClient<Database>, id: string, userId: string) {
  const { data, error } = await client
    .from("group_memberships")
    .select("group_id,status,role")
    .eq("group_id", id)
    .eq("user_id", userId)
    .maybeSingle()
  if (error) throw error
  return data
}

type Grupo = NonNullable<Awaited<ReturnType<typeof grupoDaSessao>>>
type Participacao = Awaited<ReturnType<typeof participacao>>

export function apresentarGrupo(
  grupo: Grupo,
  membro: Participacao,
  userId: string,
  membros: number,
) {
  const aprovado = membro?.status === "approved"
  return {
    id: grupo.id,
    nome: grupo.name,
    descricao: grupo.description ?? "",
    regras: grupo.rules ?? "",
    fechado: grupo.visibility === "private",
    membro: aprovado,
    pendente: membro?.status === "pending",
    admin: aprovado && grupo.owner_user_id === userId,
    membros: grupo.visibility === "private" && !aprovado ? null : membros,
    fixada: grupo.pinned_post_id,
  }
}

export function pagina(request: Request): number | null {
  const bruto = new URL(request.url).searchParams.get("depois") ?? "0"
  if (!/^\d+$/.test(bruto)) return null
  const valor = Number(bruto)
  return Number.isSafeInteger(valor) && valor <= 100_000 ? valor : null
}

export const CAMPOS_DA_PUBLICACAO =
  "id,group_id,user_id,content,created_at,photo_path,photo_paths,comments(count),post_reactions(count)"

export type LinhaDaPublicacao = {
  id: string
  group_id: string | null
  user_id: string
  content: string
  created_at: string
  photo_path: string | null
  photo_paths: string[]
  comments: { count: number }[]
  post_reactions: { count: number }[]
}

export async function apresentarPublicacoes(
  client: SupabaseClient<Database>,
  linhas: readonly LinhaDaPublicacao[],
  userId: string,
) {
  if (linhas.length === 0) return []
  const nomes = await nomesDeAutores(
    client,
    linhas.map((linha) => linha.user_id),
  )
  const reacoes = await client
    .from("post_reactions")
    .select("post_id")
    .eq("user_id", userId)
    .in(
      "post_id",
      linhas.map((linha) => linha.id),
    )
  if (reacoes.error) throw reacoes.error
  const minhas = new Set((reacoes.data ?? []).map((linha) => linha.post_id))
  const ids = linhas.map((linha) => linha.id)
  const salvas = await client
    .from("post_saves")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", ids)
  const ocultas = await clienteDosGrupos(client)
    .from("hidden_posts")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", ids)
  if (salvas.error || ocultas.error) throw salvas.error ?? ocultas.error
  const meusSalvos = new Set((salvas.data ?? []).map((linha) => linha.post_id))
  const minhasOcultas = new Set((ocultas.data ?? []).map((linha) => linha.post_id))
  const caminhosDaLinha = (linha: LinhaDaPublicacao) =>
    linha.photo_paths?.length ? linha.photo_paths : linha.photo_path ? [linha.photo_path] : []
  const caminhos = linhas.flatMap(caminhosDaLinha)
  const fotos = new Map<string, string>()
  if (caminhos.length > 0) {
    const assinadas = await client.storage.from("event-photos").createSignedUrls(caminhos, 300)
    if (assinadas.error) throw assinadas.error
    for (const foto of assinadas.data ?? []) {
      if (foto.path && foto.signedUrl) fotos.set(foto.path, foto.signedUrl)
    }
    // Uma foto sem URL não pode derrubar o feed inteiro: a publicação sai sem ela.
    for (const caminho of caminhos) {
      if (!fotos.has(caminho)) console.error("[grupos] foto sem URL assinada:", caminho)
    }
  }
  return linhas.map((linha) => ({
    id: linha.id,
    grupoId: linha.group_id,
    texto: linha.content,
    criadaEm: linha.created_at,
    autor: nomes.get(linha.user_id) ?? "",
    propria: linha.user_id === userId,
    comentarios: linha.comments[0]?.count ?? 0,
    uteis: linha.post_reactions[0]?.count ?? 0,
    util: minhas.has(linha.id),
    salva: meusSalvos.has(linha.id),
    oculta: minhasOcultas.has(linha.id),
    fotos: caminhosDaLinha(linha).flatMap((path) => fotos.get(path) ?? []),
  }))
}

export async function publicacaoDaSessao(client: SupabaseClient<Database>, id: string) {
  const { data, error } = await client
    .from("posts")
    .select(CAMPOS_DA_PUBLICACAO)
    .eq("id", id)
    .eq("is_deleted", false)
    .maybeSingle()
    .overrideTypes<LinhaDaPublicacao | null, { merge: false }>()
  if (error) throw error
  return data
}

export type ComentarioBruto = {
  id: string
  user_id: string
  content: string
  created_at: string
  parent_id: string | null
  reply_to_id: string | null
}
export const CAMPOS_DO_COMENTARIO = "id,user_id,content,created_at,parent_id,reply_to_id"

export async function reacoesDosComentarios(
  client: SupabaseClient<Database>,
  ids: string[],
  userId: string,
) {
  const estados = new Map<string, { uteis: number; util: boolean }>()
  if (ids.length === 0) return estados
  const result = await clienteDosGrupos(client)
    .from("comment_reactions")
    .select("comment_id,user_id")
    .in("comment_id", ids)
  if (result.error) throw result.error
  for (const linha of result.data ?? []) {
    const anterior = estados.get(linha.comment_id) ?? { uteis: 0, util: false }
    estados.set(linha.comment_id, {
      uteis: anterior.uteis + 1,
      util: anterior.util || linha.user_id === userId,
    })
  }
  return estados
}
