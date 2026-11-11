import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"
import type { NextRequest, NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import {
  clienteDeServicoOuNulo,
  conferirEscrita,
  exigirSessao,
  lerCorpoJson,
  opcoesDoApp,
  responder,
} from "../../../../../lib/app-api/rota-do-app"
import { gravarCepNoCache, lerCepDoCache } from "../../../../../lib/geo/cache"
import { normalizarCep } from "../../../../../lib/geo/cep"
import { geocodificarCep } from "../../../../../lib/geo/geocodificador"
import { localizacaoDaSessao } from "../_comum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Cliente = SupabaseClient<Database>

type ArgumentosDeLocalizacao = Readonly<{
  p_user_id: string
  p_cep: string | null
  p_latitude: number | null
  p_longitude: number | null
}>

/**
 * `set_member_location` aceita `p_cep` nulo — é assim que a localização é
 * apagada —, mas o gerador de tipos não expressa argumento anulável (o mesmo
 * motivo do ajuste de `set_community_image` em normalize-generated-types). O
 * cast fica contido nesta chamada.
 */
async function gravarLocalizacao(
  client: Cliente,
  argumentos: ArgumentosDeLocalizacao,
): Promise<{ error: PostgrestError | null }> {
  const rpc = client.rpc as unknown as (
    funcao: "set_member_location",
    args: ArgumentosDeLocalizacao,
  ) => PromiseLike<{ error: PostgrestError | null }>
  return rpc("set_member_location", argumentos)
}

function respostaDaFalhaDeEscrita(request: NextRequest, codigo: string): NextResponse {
  // Diagnóstico operacional: o código do banco não carrega CPF, CEP nem
  // coordenada; sem ele o 503 vira adivinhação no CI.
  console.error("localizacao: falha na escrita", { codigo })
  if (codigo === "P0002") return responder(request, { erro: "sem-perfil" }, 404)
  if (codigo === "22023") return responder(request, { erro: "dados-invalidos" }, 400)
  return responder(request, { erro: "localizacao-indisponivel" }, 503)
}

/**
 * A localização do perfil (RUN-029 / F10): o CEP opcional e a coordenada
 * derivada dele no servidor.
 *
 * O corpo é `{ cep: string | null }` e nada mais é lido; `user_id` no corpo é
 * ignorado, porque o dono é sempre `auth.sessao.usuario.id`. O cliente de
 * serviço abre DEPOIS da sessão e só para o cache `public.cep_geocodes` e a
 * função `set_member_location` — o único caminho de escrita da coordenada.
 * A resposta devolve só o CEP e a marca de definida: latitude e longitude não
 * saem do banco.
 */
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const auth = await exigirSessao(request)
  if (!auth.ok) return auth.resposta
  const porta = conferirEscrita(request, auth.sessao.via)
  if (porta !== "ok") return responder(request, { erro: porta }, 403)

  const lido = await lerCorpoJson(request)
  if (!lido.ok) return responder(request, { erro: "corpo-invalido" }, 400)
  if (!Object.hasOwn(lido.corpo, "cep")) return responder(request, { erro: "corpo-invalido" }, 400)
  const cepDoPedido = lido.corpo["cep"]
  if (cepDoPedido !== null && typeof cepDoPedido !== "string")
    return responder(request, { erro: "corpo-invalido" }, 400)

  const cep = cepDoPedido === null ? null : normalizarCep(cepDoPedido)
  if (cepDoPedido !== null && cep === null)
    return responder(request, { erro: "dados-invalidos" }, 400)

  const cliente = auth.sessao.cliente
  const userId = auth.sessao.usuario.id
  const servico = clienteDeServicoOuNulo()
  if (servico === null) {
    console.error("localizacao: cliente de servico indisponivel", {
      temUrl: Boolean(process.env["SUPABASE_URL"]),
      temChave: Boolean(process.env["SUPABASE_SERVICE_ROLE_KEY"]),
    })
    return responder(request, { erro: "localizacao-indisponivel" }, 503)
  }

  try {
    if (cep === null) {
      const { error } = await gravarLocalizacao(servico, {
        p_user_id: userId,
        p_cep: null,
        p_latitude: null,
        p_longitude: null,
      })
      if (error !== null) return respostaDaFalhaDeEscrita(request, error.code)
    } else {
      let coordenada = await lerCepDoCache(servico, cep)
      if (coordenada === null) {
        const geocodificada = await geocodificarCep(cep)
        if (geocodificada.estado === "nao-encontrado")
          return responder(request, { erro: "cep-nao-encontrado" }, 422)
        if (geocodificada.estado === "indisponivel")
          return responder(request, { erro: "geocodificador-indisponivel" }, 503)
        coordenada = { cep, ...geocodificada.coordenada }
        try {
          await gravarCepNoCache(servico, cep, geocodificada.coordenada)
        } catch {
          // Sem cache o próximo pedido geocodifica de novo; isso não é motivo
          // para falhar a gravação que a pessoa pediu.
        }
      }
      const { error } = await gravarLocalizacao(servico, {
        p_user_id: userId,
        p_cep: cep,
        p_latitude: coordenada.latitude,
        p_longitude: coordenada.longitude,
      })
      if (error !== null) return respostaDaFalhaDeEscrita(request, error.code)
    }

    const localizacao = await localizacaoDaSessao(cliente)
    return responder(request, { localizacao }, 200)
  } catch {
    return responder(request, { erro: "localizacao-indisponivel" }, 503)
  }
}

export function OPTIONS(request: NextRequest): NextResponse {
  return opcoesDoApp(request)
}
