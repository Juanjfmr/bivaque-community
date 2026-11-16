import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { falhaDaAcao, pedidoDoMembro } from "../../../../../lib/service-requests/app-pedidos"
import { ehUuid } from "../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

// F07 (RUN-177) — cancelar e encerrar o pedido pelo app.
//
// A posse NÃO é decidida aqui: `cancel_service_request` é do solicitante e
// `close_service_request` é de qualquer participante, ambos `security definer`
// com o ator tirado de `auth.uid()`. A rota chama e traduz a recusa. O estado
// repetido é sucesso (idempotência): cancelar o que já está cancelado e
// encerrar o que já está encerrado devolvem o pedido como ele está.

const ACOES = ["cancelar", "encerrar"] as const
type Acao = (typeof ACOES)[number]

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

export async function PATCH(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
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
  const acao = lido.ok ? lido.corpo["acao"] : undefined
  if (!ACOES.includes(acao as Acao))
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Escolha cancelar ou encerrar." },
      400,
    )

  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const pedido = await pedidoDoMembro(client, userId, id)
    if (pedido === null) return responder(request, { erro: "pedido-nao-encontrado" }, 404)

    if (acao === "cancelar" && pedido.lado !== "solicitante")
      return responder(
        request,
        {
          erro: "recusado",
          mensagem: "Só quem fez o pedido pode cancelá-lo. Para encerrar, use Encerrar pedido.",
        },
        403,
      )
    if (acao === "cancelar" && pedido.situacao === "closed")
      return responder(
        request,
        { erro: "situacao-final", mensagem: "Este pedido já foi encerrado." },
        409,
      )
    if (acao === "encerrar" && pedido.situacao === "cancelled")
      return responder(
        request,
        { erro: "situacao-final", mensagem: "Pedido cancelado não é encerrado." },
        409,
      )

    const jaNoEstado =
      (acao === "cancelar" && pedido.situacao === "cancelled") ||
      (acao === "encerrar" && pedido.situacao === "closed")
    if (!jaNoEstado) {
      const { error } =
        acao === "cancelar"
          ? await client.rpc("cancel_service_request", { p_request_id: id })
          : await client.rpc("close_service_request", { p_request_id: id })
      if (error) {
        const falha = falhaDaAcao(error.code)
        return responder(request, { erro: falha.erro, mensagem: falha.mensagem }, falha.status)
      }
    }

    const atual = await pedidoDoMembro(client, userId, id)
    if (atual === null) throw new Error("Pedido sem confirmação")
    return responder(request, { pedido: atual }, 200)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
