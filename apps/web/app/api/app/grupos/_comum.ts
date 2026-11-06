import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { nomesDeAutores } from "../perguntas/_comum"

export const CAMPOS_DO_GRUPO =
  "id,name,description,rules,visibility,locality_id,owner_user_id,pinned_post_id,group_memberships(count)"

export async function grupoDaSessao(client: SupabaseClient<Database>, id: string) {
  const { data, error } = await client
    .from("groups")
    .select(CAMPOS_DO_GRUPO)
    .eq("group_memberships.status", "approved")
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

export function apresentarGrupo(grupo: Grupo, membro: Participacao, userId: string) {
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
    membros:
      grupo.visibility === "private" && !aprovado ? null : (grupo.group_memberships[0]?.count ?? 0),
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
    if (fotos.size !== new Set(caminhos).size) throw new Error("photo unavailable")
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
    fotos: caminhosDaLinha(linha).map((path) => fotos.get(path)),
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
