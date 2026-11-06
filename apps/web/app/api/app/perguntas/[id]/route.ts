import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"
import { ehUuid } from "../../eventos/_comum"
import { nomesDeAutores } from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * A pergunta e a conversa dela (F04).
 *
 * O banco decide quem lê: a policy de SELECT de `recommendation_requests` deixa
 * a autoria e quem é da cidade; para qualquer outra pessoa a linha simplesmente
 * não existe. Por isso a resposta é 404 — um 403 diria "existe, mas você não
 * pode", que é justamente o que a RLS não conta.
 *
 * As respostas vêm de `list_question_replies` (migration 20261024110000): é o
 * caminho que devolve a resposta removida pela moderação como aviso, sem texto
 * e sem autor. Um SELECT direto esconderia a resposta removida inteira e a
 * conversa pareceria ter um buraco.
 */
export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const pedido = await client
      .from("recommendation_requests")
      .select(
        "id,author_id,title,body,category,created_at,is_resolved,resolved_reply_id,localities(city_name)",
      )
      .eq("id", id)
      .maybeSingle()
    if (pedido.error) throw pedido.error
    if (!pedido.data) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)

    const conversa = await client.rpc("list_question_replies", { p_request_id: id })
    if (conversa.error) {
      // P0002 é o portão da própria função: a pergunta não existe para quem lê.
      if (conversa.error.code === "P0002") {
        return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
      }
      throw conversa.error
    }

    const linhas = conversa.data ?? []
    const autoresDasRespostas = linhas
      .filter((linha) => !linha.is_removed && typeof linha.author_id === "string")
      .map((linha) => linha.author_id)
    const nomes = await nomesDeAutores(client, [pedido.data.author_id, ...autoresDasRespostas])

    return responder(
      request,
      {
        pergunta: {
          id: pedido.data.id,
          titulo: pedido.data.title,
          corpo: pedido.data.body,
          categoria: pedido.data.category,
          criadaEm: pedido.data.created_at,
          resolvida: pedido.data.is_resolved === true,
          resolvidaPorResposta: pedido.data.resolved_reply_id,
          propria: pedido.data.author_id === userId,
          autor: nomes.get(pedido.data.author_id) ?? "",
          cidade: pedido.data.localities?.city_name ?? "",
        },
        respostas: linhas.map((linha) => ({
          id: linha.id,
          // Resposta removida volta sem texto e sem autor — o aviso é a tela.
          corpo: linha.is_removed ? "" : linha.body,
          autor: linha.is_removed ? "" : (nomes.get(linha.author_id ?? "") ?? ""),
          propria: !linha.is_removed && linha.author_id === userId,
          criadaEm: linha.created_at,
          removida: linha.is_removed === true,
        })),
      },
      200,
    )
  } catch (error) {
    log.error("app pergunta: read failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
