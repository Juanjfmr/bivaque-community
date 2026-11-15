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
 * Denunciar a pergunta ou uma resposta dela (F04).
 *
 * Uma rota, dois alvos: sem `respostaId` o alvo é o pedido; com ele, a resposta
 * — e a resposta precisa ser DESTA pergunta, senão o uuid chutado entraria na
 * fila do operador por outro caminho. O mecanismo (`reports`, enum estendido,
 * auto-denúncia bloqueada, índice de duplicata) já existe e tem prova em pgTAP;
 * aqui só se reusa: a validação do motivo vem de `lib/reports/reports` e a
 * autoria é da sessão, nunca do corpo.
 *
 * Visibilidade pela leitura da sessão: pergunta ou resposta que a RLS não
 * mostra não é denunciável, e a resposta é 404 — um 403 confirmaria existência.
 * Conteúdo próprio é 403 antes da escrita, como na publicação de grupo.
 */
export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    return responder(request, { erro: "corpo-invalido" }, 400)
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)
  const motivo = lido.corpo["motivo"]
  const explicacao = lido.corpo["explicacao"] ?? ""
  if (typeof motivo !== "string" || typeof explicacao !== "string")
    return responder(request, { erro: "dados-invalidos" }, 400)
  const respostaId = lido.corpo["respostaId"]
  if (respostaId !== undefined && (typeof respostaId !== "string" || !ehUuid(respostaId)))
    return responder(request, { erro: "dados-invalidos" }, 400)
  const validado = validateReportInput({ reason: motivo, explanation: explicacao })
  if (!validado.ok) return responder(request, { erro: validado.error }, 400)

  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const pedido = await client
      .from("recommendation_requests")
      .select("author_id")
      .eq("id", id)
      .eq("is_deleted", false)
      .maybeSingle()
    if (pedido.error) throw pedido.error
    if (!pedido.data) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)

    let alvo: "recommendation_request" | "recommendation_reply" = "recommendation_request"
    let alvoId = id
    let autor = pedido.data.author_id
    if (respostaId !== undefined) {
      const resposta = await client
        .from("recommendation_replies")
        .select("author_id,request_id")
        .eq("id", respostaId)
        .eq("is_deleted", false)
        .maybeSingle()
      if (resposta.error) throw resposta.error
      if (!resposta.data || resposta.data.request_id !== id)
        return responder(request, { erro: "resposta-nao-encontrada" }, 404)
      alvo = "recommendation_reply"
      alvoId = respostaId
      autor = resposta.data.author_id
    }
    if (autor === userId) return responder(request, { erro: "proprio-conteudo" }, 403)

    const result = await client
      .from("reports")
      .insert({
        reporter_user_id: userId,
        target_type: alvo,
        target_id: alvoId,
        reason: composeReason(validado.label, validado.explanation),
      })
      .select("id")
      .single()
    if (result.error) {
      if (result.error.code === "23505")
        return responder(
          request,
          {
            erro: "ja-denunciado",
            mensagem:
              alvo === "recommendation_request"
                ? "Você já denunciou esta pergunta."
                : "Você já denunciou esta resposta.",
          },
          409,
        )
      const falha = interpretarErroDoBanco(result.error.code, {
        recusado: "Sua conta não pode denunciar este conteúdo.",
        dados: "Revise o motivo da denúncia.",
      })
      if (falha.status === 503)
        log.error("app pergunta: report failed", { error: result.error.message, userId })
      return responder(request, falha.corpo, falha.status)
    }
    if (!result.data) throw new Error("insert without result")
    return responder(request, { denuncia: { id: result.data.id } }, 201)
  } catch (error) {
    log.error("app pergunta: report failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
