import type { NextRequest, NextResponse } from "next/server"
import { exigirSessao, opcoesDoApp, responder } from "../../../../lib/app-api/rota-do-app"
import {
  consultaPedidos,
  distanciaDoPedido,
  resumoDoPedido,
} from "../../../../lib/service-requests/app-pedidos"
import { ehUuid } from "../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// F07 (RUN-177) — os pedidos dos DOIS lados. Antes a lista era só do
// solicitante; agora o dono do negócio também vê o que recebeu, com o `lado` no
// payload dizendo qual é o dele. A RLS de `service_requests` é quem decide o
// que cada sessão enxerga.
//
// RUN-179 — cada linha leva o bairro (`region`) e a distância em metros do ponto
// de vista de QUEM LÊ, calculada pela RPC por linha (a origem vem de auth.uid()
// no banco; sem origem cadastrada o campo é `null`).

export async function GET(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const depois = new URL(request.url).searchParams.get("depois")
  if (depois !== null && !ehUuid(depois))
    return responder(request, { erro: "dados-invalidos" }, 400)
  try {
    const userId = auth.sessao.usuario.id
    let query = consultaPedidos(auth.sessao.cliente, userId)
    if (depois !== null) query = query.gt("id", depois)
    const { data, error } = await query.order("id", { ascending: true }).limit(20)
    if (error) throw error
    const pedidos = await Promise.all(
      (data ?? []).map(async (linha) =>
        resumoDoPedido(linha, userId, await distanciaDoPedido(auth.sessao.cliente, linha.id)),
      ),
    )
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
