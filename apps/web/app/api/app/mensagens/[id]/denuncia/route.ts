import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../../lib/logger"
import { composeReason, validateReportInput } from "../../../../../../lib/reports/reports"
import { ehUuid, interpretarErroDoBanco } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * Denunciar UMA mensagem de conversa (F09-A), alvo `message`.
 *
 * O mecanismo já existe — `reports` com o enum estendido, auto-denúncia
 * bloqueada e índice de duplicata, todos com prova em pgTAP e fila do operador
 * em `20261107044654`. Aqui só se reusa: a validação do motivo vem de
 * `lib/reports/reports` e a autoria é da sessão, nunca do corpo.
 *
 * Visibilidade pela leitura da sessão: mensagem de conversa alheia não é
 * denunciável, e a resposta é 404 — um 403 confirmaria a existência dela.
 * Conteúdo próprio é 403 antes da escrita, como na denúncia de pergunta.
 */
export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "mensagem-nao-encontrada" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return responder(request, { erro: "corpo-invalido" }, 400)
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)
  const motivo = lido.corpo["motivo"]
  const explicacao = lido.corpo["explicacao"] ?? ""
  if (typeof motivo !== "string" || typeof explicacao !== "string")
    return responder(request, { erro: "dados-invalidos" }, 400)
  const validado = validateReportInput({ reason: motivo, explanation: explicacao })
  if (!validado.ok) return responder(request, { erro: validado.error }, 400)

  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const mensagem = await client.from("dm_messages").select("sender_id").eq("id", id).maybeSingle()
    if (mensagem.error) throw mensagem.error
    if (!mensagem.data) return responder(request, { erro: "mensagem-nao-encontrada" }, 404)
    if (mensagem.data.sender_id === userId)
      return responder(request, { erro: "proprio-conteudo" }, 403)

    const result = await client
      .from("reports")
      .insert({
        reporter_user_id: userId,
        target_type: "message",
        target_id: id,
        reason: composeReason(validado.label, validado.explanation),
      })
      .select("id")
      .single()
    if (result.error) {
      if (result.error.code === "23505")
        return responder(
          request,
          { erro: "ja-denunciado", mensagem: "Você já denunciou esta mensagem." },
          409,
        )
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Sua conta não pode denunciar este conteúdo.",
        dados: "Revise o motivo da denúncia.",
      })
      if (falha.status === 503)
        log.error("app mensagem: report failed", { error: result.error.message, userId })
      return responder(request, falha.corpo, falha.status)
    }
    if (!result.data) throw new Error("insert without result")
    return responder(request, { denuncia: { id: result.data.id } }, 201)
  } catch (error) {
    log.error("app mensagem: report failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
