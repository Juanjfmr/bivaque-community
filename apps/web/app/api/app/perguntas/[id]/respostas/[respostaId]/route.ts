import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../../../lib/logger"
import { replyTextFromBody, validateReply } from "../../../../../../../lib/recommendations/reply"
import { ehUuid, interpretarErroDoBanco } from "../../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string; respostaId: string }> }

/**
 * Editar e excluir a própria resposta (F09 lote 2).
 *
 * A régua do texto é a mesma da criação e da tela antiga — `validateReply`, o
 * módulo que a rota de resposta já usa (5 a 2000). A autoria entra no filtro,
 * como a tela antiga fazia (`.eq("author_id", viewerId)`), e a policy
 * `recommendation_replies_update_own`/`_delete_own` repete a régua no banco: a
 * linha alheia simplesmente não é alcançada. Por isso alheia, de outra pergunta
 * e inexistente dão todas o mesmo 404 — nenhuma delas confirma existência.
 *
 * O `edited_at` é do BANCO (gatilho `recommendation_replies_mark_edited`): a
 * rota devolve o que ficou gravado, não presume a marca.
 */
export async function PATCH(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id, respostaId } = await params
  if (!ehUuid(id) || !ehUuid(respostaId)) {
    return responder(request, { erro: "resposta-nao-encontrada" }, 404)
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)
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
    const { data, error } = await auth.sessao.cliente
      .from("recommendation_replies")
      .update({ body: texto })
      .eq("id", respostaId)
      .eq("request_id", id)
      .eq("author_id", userId)
      .select("id,body,edited_at")
    if (error) {
      const falha = interpretarErroDoBanco(error.code, {
        recusado: "Sua conta não pode editar esta resposta.",
        dados: "Revise a resposta: algo não é aceito.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw error
    }
    const linha = (data ?? [])[0]
    if (linha === undefined) return responder(request, { erro: "resposta-nao-encontrada" }, 404)
    return responder(
      request,
      { resposta: { id: linha.id, corpo: linha.body, editada: linha.edited_at !== null } },
      200,
    )
  } catch (error) {
    log.error("app pergunta: reply edit failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

/**
 * Excluir a própria resposta. Excluir a resposta que resolveu a pergunta
 * reabre o pedido no banco (gatilho `recommendation_replies_reopen_on_delete`,
 * migration 20261024110000) — a tela lê a pergunta de novo para não mostrar
 * "Resolvida" sem a resposta que resolveu.
 */
export async function DELETE(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id, respostaId } = await params
  if (!ehUuid(id) || !ehUuid(respostaId)) {
    return responder(request, { erro: "resposta-nao-encontrada" }, 404)
  }
  const userId = auth.sessao.usuario.id
  try {
    const { data, error } = await auth.sessao.cliente
      .from("recommendation_replies")
      .delete()
      .eq("id", respostaId)
      .eq("request_id", id)
      .eq("author_id", userId)
      .select("id")
    if (error) {
      const falha = interpretarErroDoBanco(error.code, {
        recusado: "Sua conta não pode excluir esta resposta.",
        dados: "Não foi possível excluir esta resposta.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw error
    }
    if ((data ?? []).length === 0) {
      return responder(request, { erro: "resposta-nao-encontrada" }, 404)
    }
    return responder(request, { removido: true }, 200)
  } catch (error) {
    log.error("app pergunta: reply delete failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
