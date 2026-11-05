import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { log } from "../../../../../../lib/logger"
import { ehUuid, interpretarErroDoBanco } from "../../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Context = { params: Promise<{ id: string }> }

// "Tenho interesse" abre (ou reaproveita, é idempotente) a conversa com quem
// anunciou — a mesma RPC que a web já usa. O corpo não carrega nada: só precisa
// ser JSON válido quando vier. O próprio dono não abre conversa consigo, e a
// mensagem do Postgres nunca chega à pessoa.

export async function POST(request: NextRequest, { params }: Context): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "anuncio-nao-encontrado" }, 404)

  const contentType = request.headers.get("content-type")?.toLowerCase()
  if (contentType !== undefined && contentType !== "") {
    if (!contentType.startsWith("application/json")) {
      return responder(request, { erro: "corpo-invalido" }, 400)
    }
    const lido = await lerCorpoJson(request)
    if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  }

  const client = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  try {
    const leitura = await client
      .from("listings")
      .select("id, owner_user_id")
      .eq("id", id)
      .maybeSingle()
    if (leitura.error) throw leitura.error
    if (leitura.data === null) return responder(request, { erro: "anuncio-nao-encontrado" }, 404)
    const { owner_user_id: donoId } = leitura.data

    if (donoId === userId) {
      return responder(
        request,
        {
          erro: "dados-invalidos",
          mensagem: "Você não pode abrir conversa com o seu próprio anúncio.",
        },
        400,
      )
    }

    const aberta = await client.rpc("open_conversation", {
      p_other_user_id: donoId,
      p_context_type: "listing",
      p_context_id: id,
    })
    if (aberta.error) {
      const falha = interpretarErroDoBanco(aberta.error.code, {
        recusado: "Não é possível abrir conversa com esta pessoa.",
        dados: "Revise os dados do anúncio: algo não é aceito.",
      })
      if (falha.status !== 503) return responder(request, falha.corpo, falha.status)
      throw aberta.error
    }
    if (!aberta.data) throw new Error("open_conversation returned no conversation")
    return responder(request, { conversaId: aberta.data }, 200)
  } catch (error) {
    log.error("app mercado: interest failed", {
      error: error instanceof Error ? error.message : "unknown",
      userId,
    })
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
