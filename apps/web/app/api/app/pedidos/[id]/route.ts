import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../../lib/app-api/rota-do-app"
import { pedidoDoMembro } from "../../../../../lib/service-requests/app-pedidos"
import { ehUuid } from "../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "pedido-nao-encontrado" }, 404)
  try {
    const pedido = await pedidoDoMembro(auth.sessao.cliente, auth.sessao.usuario.id, id)
    return pedido === null
      ? responder(request, { erro: "pedido-nao-encontrado" }, 404)
      : responder(request, { pedido }, 200)
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
