import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import { consultaPedidos, resumoDoPedido } from "../../../../lib/service-requests/app-pedidos"
import { ehUuid } from "../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const depois = new URL(request.url).searchParams.get("depois")
  if (depois !== null && !ehUuid(depois))
    return responder(request, { erro: "dados-invalidos" }, 400)
  try {
    let query = consultaPedidos(auth.sessao.cliente, auth.sessao.usuario.id)
    if (depois !== null) query = query.gt("id", depois)
    const { data, error } = await query.order("id", { ascending: true }).limit(20)
    if (error) throw error
    const pedidos = (data ?? []).map(resumoDoPedido)
    return responder(
      request,
      { pedidos, proximo: pedidos.length === 20 ? (pedidos.at(-1)?.id ?? null) : null },
      200,
    )
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
