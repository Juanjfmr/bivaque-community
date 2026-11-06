import type { NextRequest, NextResponse } from "next/server"
import {
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { alcanceDaCidade, consultaNegocios } from "../../../../../../lib/providers/app-negocios"
import { pedidoDoMembro } from "../../../../../../lib/service-requests/app-pedidos"
import {
  requestInputFromBody,
  serviceRequestFailure,
} from "../../../../../../lib/service-requests/request-form"
import { cidadeDaSessao, ehUuid } from "../../../eventos/_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
type Contexto = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Contexto): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)
  const { id } = await params
  if (!ehUuid(id)) return responder(request, { erro: "negocio-nao-encontrado" }, 404)
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return responder(request, { erro: "dados-invalidos" }, 400)
  }
  const lido = await lerCorpoJson(request)
  const dados = lido.ok ? requestInputFromBody(lido.corpo) : null
  if (dados === null)
    return responder(
      request,
      {
        erro: "dados-invalidos",
        mensagem: "Descreva o serviço em até 500 caracteres e o prazo em até 120.",
      },
      400,
    )

  try {
    const client = auth.sessao.cliente
    const userId = auth.sessao.usuario.id
    const cidade = await cidadeDaSessao(client, userId)
    if (cidade === null) return responder(request, { erro: "sem-cidade" }, 403)
    const alcance = await alcanceDaCidade(client, cidade.id)
    const perfil = await consultaNegocios(client, alcance).eq("id", id).maybeSingle()
    if (perfil.error) throw perfil.error
    if (perfil.data === null) return responder(request, { erro: "negocio-nao-encontrado" }, 404)
    if (perfil.data.owner_user_id === userId)
      return responder(request, { erro: "proprio-negocio" }, 403)
    const { data, error } = await client.rpc("create_service_request", {
      p_provider_id: id,
      p_description: dados.descricao,
      ...(dados.quando === null ? {} : { p_when_text: dados.quando }),
      ...(dados.chave === null ? {} : { p_idempotency_key: dados.chave }),
    })
    if (error) {
      const falha = serviceRequestFailure(error.code)
      return responder(request, { erro: falha.erro, mensagem: falha.mensagem }, falha.status)
    }
    if (typeof data !== "string" || !ehUuid(data)) throw new Error("Pedido sem confirmação")
    const pedido = await pedidoDoMembro(client, userId, data)
    if (pedido === null) throw new Error("Pedido sem confirmação")
    return responder(request, { pedido }, 201)
  } catch {
    return responder(request, { erro: "escrita-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
