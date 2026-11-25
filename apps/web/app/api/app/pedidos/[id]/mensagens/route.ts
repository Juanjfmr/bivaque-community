import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import {
  mensagensDoPedido,
  pedidoDoMembro,
  responderPedido,
} from "../../../../../../lib/service-requests/app-pedidos"
import { ehUuid } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

// TROCA-005 — a conversa de UM pedido, para o prestador responder dentro da
// folha de Meu negócio. A posse não é decidida aqui: `pedidoDoMembro` lê o
// pedido sob a RLS da sessão, e um pedido de outra pessoa devolve 404. A
// conversa é a do PEDIDO no banco — nunca um id que veio no corpo.

async function conversaDoPedido(
  client: Parameters<typeof pedidoDoMembro>[0],
  userId: string,
  id: string,
) {
  const pedido = await pedidoDoMembro(client, userId, id)
  if (pedido === null || pedido.conversaId === null) return null
  return { pedido, conversaId: pedido.conversaId }
}

export async function GET(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "pedido-nao-encontrado" }, 404)
  try {
    const achado = await conversaDoPedido(auth.sessao.cliente, auth.sessao.usuario.id, id)
    if (achado === null) return responder(request, { erro: "pedido-nao-encontrado" }, 404)
    return responder(
      request,
      {
        pedido: achado.pedido,
        mensagens: await mensagensDoPedido(
          auth.sessao.cliente,
          auth.sessao.usuario.id,
          achado.conversaId,
        ),
      },
      200,
    )
  } catch {
    return responder(request, { erro: "leitura-indisponivel" }, 503)
  }
}

export async function POST(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "pedido-nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const lido = await lerCorpoJson(request)
  const conteudo = lido.ok ? lido.corpo["conteudo"] : undefined
  if (typeof conteudo !== "string") return responder(request, { erro: "dados-invalidos" }, 400)

  try {
    const resultado = await responderPedido(
      auth.sessao.cliente,
      auth.sessao.usuario.id,
      id,
      conteudo,
    )
    if (!resultado.ok) {
      const status =
        resultado.motivo === "pedido-nao-encontrado" || resultado.motivo === "sem-conversa"
          ? 404
          : resultado.motivo === "recusado"
            ? 403
            : resultado.motivo === "indisponivel"
              ? 503
              : 400
      return responder(request, { erro: resultado.motivo, mensagem: resultado.mensagem }, status)
    }
    return responder(request, { pedido: resultado.pedido, mensagens: resultado.mensagens }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
