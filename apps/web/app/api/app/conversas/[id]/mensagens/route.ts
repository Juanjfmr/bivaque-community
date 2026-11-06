import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { canSendQuestion, normalizeQuestion } from "../../../../../../lib/events/question-thread"
import { conversaDaSessao, mensagemDaLinha, UUID } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!UUID.test(id)) return responder(request, { erro: "nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return responder(request, { erro: "corpo-invalido" }, 400)
  const corpo = await lerCorpoJson(request)
  if (
    !corpo.ok ||
    typeof corpo.corpo["texto"] !== "string" ||
    !canSendQuestion(corpo.corpo["texto"])
  )
    return responder(request, { erro: "corpo-invalido" }, 400)
  try {
    const client = auth.sessao.cliente
    if (!(await conversaDaSessao(client, id)))
      return responder(request, { erro: "nao-encontrado" }, 404)
    const { data, error } = await client
      .from("dm_messages")
      .insert({
        conversation_id: id,
        sender_id: auth.sessao.usuario.id,
        content: normalizeQuestion(corpo.corpo["texto"]),
      })
      .select("id,content,sender_id,created_at")
      .single()
    if (error) {
      if (error.code === "42501" || error.code === "P0001")
        return responder(request, { erro: "recusado" }, 403)
      if (error.code === "23514" || error.code === "22023")
        return responder(request, { erro: "corpo-invalido" }, 400)
      throw error
    }
    if (!data) throw new Error("sem resultado")
    return responder(request, { mensagem: mensagemDaLinha(data, auth.sessao.usuario.id) }, 201)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
