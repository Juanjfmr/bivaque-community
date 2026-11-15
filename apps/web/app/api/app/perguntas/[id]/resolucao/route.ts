import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../../lib/logger"
import { callResolutionRpc } from "../../../../../../lib/recommendations/resolution-rpcs"
import { ehUuid } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

/**
 * Resolver ou reabrir a pergunta (F04).
 *
 * A posse é do banco: as RPCs de resolução checam `author_id = auth.uid()` e
 * levantam P0002 para "não existe", "não é sua" e "a resposta não é desta
 * pergunta" — as três viram 404, como no detalhe, porque um 403 confirmaria a
 * existência que a RLS não conta. A frase do Postgres nunca vai para a pessoa.
 *
 * São três ações e três RPCs já existentes (RECON-035): `marcar` fecha a
 * pergunta na resposta escolhida, `resolver` fecha sem resposta e `reabrir`
 * mantém a memória da última resolução. Todas são idempotentes.
 */
const ACOES = ["resolver", "reabrir", "marcar"] as const
type Acao = (typeof ACOES)[number]

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "corpo-invalido" }, 400)
  }
  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, lido.status)
  const acao = lido.corpo["acao"]
  if (typeof acao !== "string" || !ACOES.includes(acao as Acao)) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Escolha resolver, reabrir ou marcar." },
      400,
    )
  }
  const respostaId = lido.corpo["respostaId"]
  if (respostaId !== undefined && (typeof respostaId !== "string" || !ehUuid(respostaId))) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  if (acao === "marcar" && respostaId === undefined) {
    return responder(
      request,
      { erro: "dados-invalidos", mensagem: "Escolha a resposta que resolveu a pergunta." },
      400,
    )
  }

  const userId = auth.sessao.usuario.id
  try {
    const cliente = auth.sessao.cliente
    let resultado: Awaited<ReturnType<typeof callResolutionRpc>>
    if (acao === "reabrir") {
      resultado = await callResolutionRpc(cliente, "reopen_recommendation", { p_request_id: id })
    } else if (acao === "marcar" && respostaId !== undefined) {
      resultado = await callResolutionRpc(cliente, "mark_recommendation_reply_resolved", {
        p_request_id: id,
        p_reply_id: respostaId,
      })
    } else {
      resultado = await callResolutionRpc(cliente, "mark_recommendation_resolved", {
        p_request_id: id,
      })
    }
    if (resultado.error) {
      const codigo = resultado.error.code
      if (codigo === "P0002") {
        return responder(request, { erro: "pergunta-nao-encontrada" }, 404)
      }
      if (codigo === "42501") {
        return responder(
          request,
          {
            erro: "recusado",
            mensagem: "Só quem perguntou pode resolver ou reabrir esta pergunta.",
          },
          403,
        )
      }
      if (codigo === "22023") {
        return responder(
          request,
          { erro: "estado-invalido", mensagem: "Esta mudança não é possível agora." },
          409,
        )
      }
      throw new Error(resultado.error.message)
    }
    return responder(
      request,
      {
        resolvida: acao !== "reabrir",
        resolvidaPorResposta: acao === "marcar" ? (respostaId ?? null) : null,
      },
      200,
    )
  } catch (error) {
    log.error("app pergunta: resolution failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
