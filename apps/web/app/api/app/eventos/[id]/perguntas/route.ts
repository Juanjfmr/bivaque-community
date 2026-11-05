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

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
type OpenQuestion = (
  fn: "open_event_question",
  args: { p_event_id: string },
) => PromiseLike<{ data: string | null; error: { message: string } | null }>

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!UUID.test(id)) return responder(request, { erro: "evento-nao-encontrado" }, 404)
  const body = await lerCorpoJson(request)
  if (!body.ok || typeof body.corpo["texto"] !== "string" || !canSendQuestion(body.corpo["texto"]))
    return responder(request, { erro: "corpo-invalido" }, 400)
  const texto = body.corpo["texto"]
  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const event = await client.from("events").select("organizer_id").eq("id", id).maybeSingle()
    if (event.error) throw event.error
    if (!event.data) return responder(request, { erro: "evento-nao-encontrado" }, 404)
    if (event.data.organizer_id === userId) return responder(request, { erro: "recusado" }, 403)
    const rpc = client.rpc as unknown as OpenQuestion
    const opened = await rpc("open_event_question", { p_event_id: id })
    if (opened.error || !opened.data) {
      const message = opened.error?.message ?? ""
      if (
        /another context|blocked|organizer|cannot access|event not found|unauthenticated/i.test(
          message,
        )
      )
        return responder(
          request,
          { erro: "recusado", mensagem: friendlyQuestionError(message) },
          403,
        )
      throw opened.error ?? new Error("question RPC returned no conversation")
    }
    const inserted = await client
      .from("dm_messages")
      .insert({
        conversation_id: opened.data,
        sender_id: userId,
        content: normalizeQuestion(texto),
      })
      .select("id")
      .single()
    if (inserted.error || !inserted.data)
      throw inserted.error ?? new Error("message insert returned no result")
    return responder(request, { conversaId: opened.data, mensagemId: inserted.data.id }, 201)
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
