import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../../lib/app-api/rota-do-app"
import { correctionStatusLabel } from "../../../../../../lib/guide/app-guia"
import { log } from "../../../../../../lib/logger"
import { ehUuid } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * "Minhas sugestões" de um verbete (F08).
 *
 * Devolve só as sugestões da própria pessoa para o artigo publicado da
 * referência — a RLS `select own` já impõe isso e o filtro por `requester_id` é
 * defesa em profundidade. É o acompanhamento do que ela enviou: a curadoria
 * decide na web, e aqui ela vê em que pé ficou.
 *
 * Lista vazia não é 404: quem enviou nada, ou uma referência que ainda não tem
 * artigo, recebe `sugestoes: []`. O 404 fica para a referência que não existe
 * para esta pessoa.
 */
export async function GET(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "entrada-nao-encontrada" }, 404)
  const userId = auth.sessao.usuario.id
  try {
    const client = auth.sessao.cliente
    const entrada = await client
      .from("arrival_guide_entries")
      .select("id")
      .eq("id", id)
      .eq("status", "approved")
      .maybeSingle()
    if (entrada.error) throw entrada.error
    if (!entrada.data) return responder(request, { erro: "entrada-nao-encontrada" }, 404)

    const artigo = await client
      .from("guide_articles")
      .select("id")
      .eq("entry_id", id)
      .eq("status", "published")
      .maybeSingle()
    if (artigo.error) throw artigo.error
    if (!artigo.data) return responder(request, { sugestoes: [] }, 200)

    const result = await client
      .from("guide_correction_requests")
      .select("id,status,description,decision_note,created_at")
      .eq("article_id", artigo.data.id)
      .eq("requester_id", userId)
      .order("created_at", { ascending: false })
    if (result.error) throw result.error

    return responder(
      request,
      {
        sugestoes: (result.data ?? []).map((linha) => ({
          id: linha.id,
          status: correctionStatusLabel(linha.status),
          descricao: linha.description,
          decisao: linha.decision_note,
          criadaEm: linha.created_at,
        })),
      },
      200,
    )
  } catch (error) {
    log.error("app guia: correction requests read failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
