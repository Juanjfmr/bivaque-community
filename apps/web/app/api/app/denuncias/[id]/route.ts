import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { getOwnReport, splitReason } from "../../../../../lib/reports/reports"
import { ehUuid } from "../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

// TROCA-005 — o acompanhamento de uma denúncia. Linha de outra pessoa e linha
// inexistente recebem o MESMO 404: a RLS não devolve a alheia, e a rota não
// confirma a existência de denúncia de ninguém.

export async function GET(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "denuncia-nao-encontrada" }, 404)
  try {
    const denuncia = await getOwnReport(auth.sessao.cliente, id)
    if (denuncia === null) {
      return responder(request, { erro: "denuncia-nao-encontrada" }, 404)
    }
    return responder(
      request,
      { denuncia: { ...denuncia, motivo: splitReason(denuncia.reason) } },
      200,
    )
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
