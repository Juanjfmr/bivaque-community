import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { lerNovaPergunta } from "../../../../../../lib/recommendations/create"
import { ehUuid, interpretarErroDoBanco } from "../../../eventos/_comum"
import { apresentarPergunta, nomesDeAutores } from "../../../perguntas/_comum"
import { grupoDaSessao, participacao, registrarFalha } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/** O teto do bloco de perguntas do feed: é um bloco, não uma paginação. */
const LIMITE = 20

type LinhaPergunta = {
  id: string
  author_id: string
  title: string
  category: Database["public"]["Enums"]["recommendation_category"]
  created_at: string
  is_resolved: boolean
  group_id: string | null
  recommendation_replies: { count: number }[]
}

/**
 * As perguntas do grupo e a pergunta nova (RUN-178).
 *
 * A pergunta feita num grupo Aberto é UMA linha de `recommendation_requests`
 * com origem dupla — cidade do grupo + grupo (ADR-20261024 §1, forma no
 * ADR-20261116). Não há post espelho: o feed do grupo lê esta rota, e as
 * Indicações da cidade leem a mesma linha por `list_indications`.
 *
 * O POST não aceita origem do corpo: a cidade e o grupo saem do grupo lido no
 * servidor, e os quatro vetos (não membro, grupo Fechado, grupo fora do ar,
 * cidade diferente) ficam na policy do banco. A recusa chega aqui como 403 com
 * a próxima ação, nunca com o texto da policy.
 */
export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const grupo = await grupoDaSessao(client, id)
    if (!grupo) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
    const membro = await participacao(client, id, userId)
    if (grupo.visibility === "private" && membro?.status !== "approved") {
      // Grupo Fechado é reservado aos membros, como as publicações.
      return responder(request, { perguntas: [] }, 200)
    }
    const { data, error } = await client
      .from("recommendation_requests")
      // O embed do contador precisa da dica da FK: `recommendation_requests`
      // aponta duas vezes para `recommendation_replies` (respostas da pergunta e
      // a resposta que resolveu), e `recommendation_replies(count)` sozinho é
      // ambíguo — o PostgREST responde PGRST201 e a rota virava 503.
      .select(
        "id,author_id,title,category,created_at,is_resolved,group_id,recommendation_replies!recommendation_replies_request_id_fkey(count)",
      )
      .eq("group_id", id)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(LIMITE)
      .overrideTypes<LinhaPergunta[], { merge: false }>()
    if (error) throw error
    const linhas = data ?? []
    const nomes = await nomesDeAutores(
      client,
      linhas.map((linha) => linha.author_id),
    )
    return responder(
      request,
      {
        perguntas: linhas.map((linha) =>
          apresentarPergunta(
            {
              id: linha.id,
              title: linha.title,
              category: linha.category,
              created_at: linha.created_at,
              is_resolved: linha.is_resolved,
              reply_count: linha.recommendation_replies[0]?.count ?? 0,
              author_id: linha.author_id,
              group_id: linha.group_id,
              group_name: grupo.name,
            },
            nomes,
            userId,
          ),
        ),
      },
      200,
    )
  } catch (error) {
    registrarFalha("group questions", error)
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const lido = await lerCorpoJson(request)
  const userId = auth.sessao.usuario.id
  const pergunta = lido.ok ? lerNovaPergunta(lido.corpo) : null
  if (!pergunta) return responder(request, { erro: "dados-invalidos" }, 400)
  try {
    const client = auth.sessao.cliente
    const grupo = await grupoDaSessao(client, id)
    if (!grupo) return responder(request, { erro: "grupo-nao-encontrado" }, 404)
    const membro = await participacao(client, id, userId)
    if (membro?.status !== "approved") return responder(request, { erro: "nao-membro" }, 403)
    const criado = await client
      .from("recommendation_requests")
      .insert({
        ...pergunta,
        author_id: userId,
        // A origem é do BANCO: a cidade é a do grupo, e é a policy que confere.
        locality_id: grupo.locality_id,
        group_id: id,
      })
      .select("id,author_id,title,category,created_at,is_resolved,group_id")
      .single()
    if (criado.error) {
      const falha = interpretarErroDoBanco(criado.error.code, {
        recusado:
          "A pergunta não foi aceita. Perguntar à cidade é só em grupo aberto, com quem participa dele: confira o grupo e tente de novo.",
        dados: "Revise o texto da pergunta.",
      })
      if (falha.status === 503) registrarFalha("group question", criado.error)
      return responder(request, falha.corpo, falha.status)
    }
    if (!criado.data) throw new Error("insert without result")
    const nomes = await nomesDeAutores(client, [userId])
    return responder(
      request,
      {
        pergunta: apresentarPergunta(
          {
            id: criado.data.id,
            title: criado.data.title,
            category: criado.data.category,
            created_at: criado.data.created_at,
            is_resolved: criado.data.is_resolved,
            reply_count: 0,
            author_id: criado.data.author_id,
            group_id: criado.data.group_id,
            group_name: grupo.name,
          },
          nomes,
          userId,
        ),
      },
      201,
    )
  } catch (error) {
    registrarFalha("group question", error)
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
