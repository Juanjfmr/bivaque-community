import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../../lib/logger"
import { replyTextFromBody, validateReply } from "../../../../../../lib/recommendations/reply"
import { ehUuid, interpretarErroDoBanco } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * Responder a uma pergunta da cidade (F04).
 *
 * A autoria é da sessão e a pergunta é lida antes da escrita: quem não alcança
 * o pedido recebe 404, como no detalhe, e não uma recusa que confirma a
 * existência. A policy de INSERT repete a mesma régua no banco — a checagem
 * aqui existe para a resposta ser legível, não para substituí-la.
 *
 * O que volta é a linha GRAVADA, não o texto que a tela mandou: a tela mostra o
 * que o banco guardou.
 */
export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Envie a resposta em JSON." },
      400,
    )
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  const texto = replyTextFromBody(lido.corpo["texto"])
  if (texto === null) {
    return responder(request, { erro: "dados-invalidos", mensagem: "Escreva a sua resposta." }, 400)
  }
  const problema = validateReply(texto)
  if (problema !== null) {
    return responder(request, { erro: "dados-invalidos", mensagem: problema }, 400)
  }

  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const pedido = await client
      .from("recommendation_requests")
      .select("id")
      .eq("id", id)
      .maybeSingle()
    if (pedido.error) throw pedido.error
    if (!pedido.data) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)

    const resultado = await client
      .from("recommendation_replies")
      .insert({ request_id: id, author_id: userId, body: texto })
      .select("id,body,created_at")
      .single()
    if (resultado.error) {
      const falha = interpretarErroDoBanco(resultado.error.code, {
        recusado: "Sua conta não pode responder esta pergunta.",
        dados: "Revise a resposta: algo não é aceito.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw resultado.error
    }
    if (!resultado.data) throw new Error("insert without result")
    return responder(
      request,
      {
        resposta: {
          id: resultado.data.id,
          corpo: resultado.data.body,
          criadaEm: resultado.data.created_at,
        },
      },
      201,
    )
  } catch (error) {
    log.error("app pergunta: reply failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
