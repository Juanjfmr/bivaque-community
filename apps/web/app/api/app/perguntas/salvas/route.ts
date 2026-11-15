import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../lib/logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const LIMITE_DE_SALVOS = 50

/**
 * As perguntas que a pessoa está seguindo (F04), para a tela Salvos.
 *
 * A leitura parte de `recommendation_saves` com a sessão: a RLS já devolve só as
 * linhas do próprio `user_id`. Pedido apagado (`is_deleted`) não vira item de
 * tela, como na lista da cidade. Falha de leitura é 503, não lista vazia.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const salvas = await client
      .from("recommendation_saves")
      .select("request_id")
      .order("saved_at", { ascending: false })
      .limit(LIMITE_DE_SALVOS)
    if (salvas.error) throw salvas.error

    const ids = (salvas.data ?? []).map((linha) => linha.request_id)
    if (ids.length === 0) return responder(request, { perguntas: [] }, 200)

    const result = await client
      .from("recommendation_requests")
      .select("id,title,category,created_at,is_resolved")
      .in("id", ids)
      .eq("is_deleted", false)
    if (result.error) throw result.error

    const porId = new Map((result.data ?? []).map((linha) => [linha.id, linha]))
    // A ordem é a do salvamento, não a da consulta: `in` não promete ordem.
    const perguntas = ids.flatMap((id) => {
      const linha = porId.get(id)
      if (linha === undefined) return []
      return [
        {
          id: linha.id,
          titulo: linha.title,
          categoria: linha.category,
          criadaEm: linha.created_at,
          resolvida: linha.is_resolved === true,
        },
      ]
    })
    return responder(request, { perguntas }, 200)
  } catch (error) {
    log.error("app perguntas: saved list failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
