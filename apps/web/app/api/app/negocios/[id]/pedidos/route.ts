import type { NextRequest, NextResponse } from "next/server"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../../lib/app-api/rota-do-app"
import { type LocalizacaoDoPedido, localizarPedido } from "../../../../../../lib/geo/anuncio"
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

/**
 * RUN-179 (LOC-IMPL L2) — o pedido aceita CEP opcional (ADR-20261022 §3).
 *
 * O CEP não vira nada legível: a rota chama o MESMO módulo do anúncio
 * (`lib/geo/anuncio`), que normaliza, resolve no cache e só vai ao provedor no
 * miss, sob o limitador da própria pessoa. O que sobe para o RPC é o CEP, a
 * coordenada derivada e o bairro — e a coordenada vem do geocodificador do
 * servidor, nunca do corpo: `latitude`/`longitude` enviados pelo cliente são
 * ignorados como qualquer outro campo fora do contrato.
 */
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
        mensagem: "Descreva o serviço em até 500 caracteres, o prazo em até 120 e confira o CEP.",
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

    // A localização é derivada DEPOIS de saber que o pedido pode existir: um
    // CEP de quem está batendo na porta de negócio alheio não gasta provedor.
    let localizacao: LocalizacaoDoPedido | null = null
    if (dados.cep !== null) {
      const servico = clienteDeServicoOuNulo()
      if (servico === null) throw new Error("Localização sem cliente de serviço")
      const localizado = await localizarPedido({
        cliente: servico,
        pessoa: userId,
        cepBruto: dados.cep,
        cidadeId: cidade.id,
      })
      if (!localizado.ok) {
        // A recusa do CEP é do pedido: 429 quando a janela da pessoa acabou, 400
        // quando o CEP não existe, 503 quando o provedor não respondeu.
        if (localizado.erro === "limite-de-consultas")
          return responder(
            request,
            {
              erro: "limite",
              mensagem: "Muitas consultas de CEP em pouco tempo. Tente de novo em alguns minutos.",
            },
            429,
          )
        if (localizado.erro === "cep-nao-encontrado" || localizado.erro === "cep-invalido")
          return responder(
            request,
            { erro: "dados-invalidos", mensagem: "Confira o CEP: ele não foi encontrado." },
            400,
          )
        return responder(
          request,
          {
            erro: "localizacao-indisponivel",
            mensagem: "Não foi possível consultar o CEP agora. Você pode enviar o pedido sem ele.",
          },
          503,
        )
      }
      localizacao = localizado.localizacao
    }

    const { data, error } = await client.rpc("create_service_request", {
      p_provider_id: id,
      p_description: dados.descricao,
      ...(dados.quando === null ? {} : { p_when_text: dados.quando }),
      ...(dados.chave === null ? {} : { p_idempotency_key: dados.chave }),
      ...(localizacao === null
        ? {}
        : {
            p_cep: localizacao.cep,
            ...(localizacao.latitude === null || localizacao.longitude === null
              ? {}
              : { p_latitude: localizacao.latitude, p_longitude: localizacao.longitude }),
            ...(localizacao.bairro === null ? {} : { p_region: localizacao.bairro }),
          }),
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
