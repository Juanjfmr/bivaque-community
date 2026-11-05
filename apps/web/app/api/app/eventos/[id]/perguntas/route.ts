import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import {
  canSendQuestion,
  friendlyQuestionError,
  normalizeQuestion,
} from "../../../../../../lib/events/question-thread"
import { log } from "../../../../../../lib/logger"
import { cidadeDaSessao, ehUuid, encontroDaSessao } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/** O que a função do banco recusa e a tela precisa traduzir. */
const RECUSA_DA_FUNCAO =
  /another context|blocked|organizer|cannot access|event not found|unauthenticated/i

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "evento-nao-encontrado" }, 404)
  const body = await lerCorpoJson(request)
  if (!body.ok || typeof body.corpo["texto"] !== "string" || !canSendQuestion(body.corpo["texto"]))
    return responder(request, { erro: "corpo-invalido" }, 400)
  const texto = body.corpo["texto"]
  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const encontro = await encontroDaSessao(client, id)
    if (encontro === null) return responder(request, { erro: "evento-nao-encontrado" }, 404)
    // Perguntar ao organizador é de quem é da cidade do encontro — a mesma régua
    // da presença. A função do banco também recusaria; aqui a recusa é explícita.
    const cidade = await cidadeDaSessao(client, userId)
    if (cidade === null || cidade.id !== encontro.locality_id) {
      return responder(request, { erro: "de-outra-cidade" }, 403)
    }
    if (encontro.organizer_id === userId) return responder(request, { erro: "recusado" }, 403)
    const aberta = await client.rpc("open_event_question", { p_event_id: id })
    if (aberta.error || !aberta.data) {
      const message = aberta.error?.message ?? ""
      if (RECUSA_DA_FUNCAO.test(message)) {
        return responder(
          request,
          { erro: "recusado", mensagem: friendlyQuestionError(message) },
          403,
        )
      }
      throw aberta.error ?? new Error("question RPC returned no conversation")
    }
    const inserida = await client
      .from("dm_messages")
      .insert({
        conversation_id: aberta.data,
        sender_id: userId,
        content: normalizeQuestion(texto),
      })
      .select("id")
      .single()
    if (inserida.error || !inserida.data) {
      throw inserida.error ?? new Error("message insert returned no result")
    }
    return responder(request, { conversaId: aberta.data, mensagemId: inserida.data.id }, 201)
  } catch (error) {
    log.error("app evento question: write failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
