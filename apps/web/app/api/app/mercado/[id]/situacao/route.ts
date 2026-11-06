import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../../lib/logger"
import { ehUuid } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

// Mudar a situação do próprio anúncio (LAN-F06): pausar, reativar, encerrar ou
// marcar vendido. A única via é a RPC `transition_listing` — a guarda
// `listings_guard_status_transition` recusa UPDATE direto da coluna `status`,
// e é ela (não esta rota) que decide quais passagens valem. O corpo traz só a
// ação; dono e situação vêm do banco.

const ACOES = ["pause", "reactivate", "close", "sell"] as const
type Acao = (typeof ACOES)[number]

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)
  const acao = lido.corpo["acao"]
  if (typeof acao !== "string" || !ACOES.includes(acao as Acao)) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }

  const userId = auth.sessao.usuario.id
  try {
    const transicao = await auth.sessao.cliente.rpc("transition_listing", {
      p_listing_id: id,
      p_action: acao,
    })
    if (transicao.error) {
      // A mensagem do Postgres não vai para a pessoa. P0002 é o anúncio que não
      // existe; 42501 é recusa de dono; 22023 é passagem impossível agora.
      const codigo = transicao.error.code
      if (codigo === "P0002") return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
      if (codigo === "42501") {
        return responder(
          request,
          { erro: "recusado", mensagem: "Só quem anunciou pode mudar a situação deste anúncio." },
          403,
        )
      }
      if (codigo === "22023") {
        return responder(
          request,
          { erro: "estado-invalido", mensagem: "Esta mudança não é possível para este anúncio." },
          409,
        )
      }
      throw transicao.error
    }
    if (typeof transicao.data !== "string") throw new Error("transition without status")
    return responder(request, { status: transicao.data }, 200)
  } catch (error) {
    log.error("app mercado: transition failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
