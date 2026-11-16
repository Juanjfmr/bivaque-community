import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { gravarCepNoCache, lerCepDoCache } from "./cache"
import { normalizarCep } from "./cep"
import { geocodificarCep } from "./geocodificador"
import { consumirConsulta } from "./limite"

/**
 * A localização do ANÚNCIO (RUN-175 / ADR-20261022 §§1, 2 e 7 + ADR-20261116).
 *
 * Um módulo só, chamado pelo POST e pelo PATCH do Mercado — o anúncio nasce e é
 * editado com a mesma régua: cache-first (`public.cep_geocodes`), limitador por
 * pessoa só na chamada real de rede, bairro derivado casado com `neighborhoods`
 * pelo nome normalizado (o mesmo vizinho que o perfil grava) e coordenada
 * arredondada no servidor quando a escolha é aproximada.
 *
 * CEP conhecido sem coordenada é SUCESSO PARCIAL (ADR-20261116 §3): cidade e
 * bairro valem, a posição fica nula e a escolha é forçada a aproximada — o
 * anúncio interiorano não trava.
 *
 * Nada aqui imprime CEP nem coordenada.
 */

type Cliente = SupabaseClient<Database>

export type LocalizacaoPublica = "exata" | "aproximada"

export type LocalizacaoDoAnuncio = Readonly<{
  cep: string
  latitude: number | null
  longitude: number | null
  localizacaoPublica: LocalizacaoPublica
  /** Bairro que veio do CEP, já na grafia de `neighborhoods`; `null` se não veio. */
  bairroDerivado: string | null
}>

export type FalhaDALocalizacao =
  | "cep-invalido"
  | "cep-nao-encontrado"
  | "geocodificador-indisponivel"
  | "limite-de-consultas"

export type ResultadoDALocalizacao =
  | Readonly<{ ok: true; localizacao: LocalizacaoDoAnuncio }>
  | Readonly<{ ok: false; erro: FalhaDALocalizacao; esperarMs?: number }>

/**
 * O piso do aproximado: 0,003° de latitude dá ~333 m. Deslocar para sul e oeste
 * (e cortar em 5 casas) põe o ponto publicado entre ~333 m e ~470 m do real —
 * nunca menos que o piso de 300 m e dentro da faixa 300-500 m do ADR.
 */
const PASSO_APROXIMADO = 0.003

export function aproximarCoordenada(
  latitude: number,
  longitude: number,
): Readonly<{ latitude: number; longitude: number }> {
  return {
    latitude: Number((latitude - PASSO_APROXIMADO).toFixed(5)),
    longitude: Number((longitude - PASSO_APROXIMADO).toFixed(5)),
  }
}

/** Sem acento, minúsculo, espaço colapsado — a mesma chave de `neighborhoods`. */
function chaveDoNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * A grafia canônica de um bairro da cidade, quando existe; `null` quando o nome
 * não é um bairro do catálogo (o texto de quem anuncia vale como veio).
 */
async function bairroCanonico(
  cliente: Cliente,
  cidadeId: string,
  bairro: string,
): Promise<string | null> {
  const procurado = chaveDoNome(bairro)
  if (procurado === "") return null
  const { data, error } = await cliente
    .from("neighborhoods")
    .select("name")
    .eq("locality_id", cidadeId)
    .ilike("name", bairro.trim())
    .limit(5)
  if (error) throw error
  const casado = (data ?? []).find((linha) => chaveDoNome(linha.name) === procurado)
  return casado?.name ?? null
}

export type PedidoDALocalizacao = Readonly<{
  cliente: Cliente
  /** Quem está anunciando: a chave do limitador de geocodificação. */
  pessoa: string
  /** O CEP como veio do corpo (com máscara ou não). */
  cepBruto: string
  /** A escolha do anunciante; o servidor decide se ela vale. */
  escolha: LocalizacaoPublica
  /** Desapego: a coordenada é sempre aproximada, sem oferta de exata. */
  forcarAproximada: boolean
  cidadeId: string
}>

export async function localizarAnuncio(
  pedido: PedidoDALocalizacao,
): Promise<ResultadoDALocalizacao> {
  const cep = normalizarCep(pedido.cepBruto)
  if (cep === null) return { ok: false, erro: "cep-invalido" }

  let coordenada = await lerCepDoCache(pedido.cliente, cep)
  let bairroDerivado: string | null = null

  if (coordenada === null) {
    // Cache hit não consome cota: só a chamada real ao provedor é limitada.
    const limite = consumirConsulta(pedido.pessoa)
    if (!limite.liberado) {
      return { ok: false, erro: "limite-de-consultas", esperarMs: limite.esperarMs }
    }
    const geocodificada = await geocodificarCep(cep)
    if (geocodificada.estado === "nao-encontrado") return { ok: false, erro: "cep-nao-encontrado" }
    if (geocodificada.estado === "indisponivel") {
      return { ok: false, erro: "geocodificador-indisponivel" }
    }
    if (geocodificada.estado === "encontrado") {
      coordenada = { cep, ...geocodificada.coordenada }
      try {
        await gravarCepNoCache(pedido.cliente, cep, geocodificada.coordenada)
      } catch {
        // Sem cache o próximo pedido geocodifica de novo; não é motivo para
        // recusar o anúncio que a pessoa está publicando.
      }
    }
    // `sem-coordenada`: a coordenada fica nula e a escolha é forçada abaixo.
    const bairroDoCep = geocodificada.endereco.bairro
    if (bairroDoCep !== null) {
      bairroDerivado = await bairroCanonico(pedido.cliente, pedido.cidadeId, bairroDoCep)
    }
  }

  const semPosicao = coordenada === null
  const aproximada = pedido.forcarAproximada || semPosicao || pedido.escolha === "aproximada"
  const ponto =
    coordenada === null
      ? { latitude: null, longitude: null }
      : aproximada
        ? aproximarCoordenada(coordenada.latitude, coordenada.longitude)
        : { latitude: coordenada.latitude, longitude: coordenada.longitude }

  return {
    ok: true,
    localizacao: {
      cep,
      latitude: ponto.latitude,
      longitude: ponto.longitude,
      localizacaoPublica: aproximada ? "aproximada" : "exata",
      bairroDerivado,
    },
  }
}

/** A escolha que veio do corpo, ou o padrão do servidor (aproximada). */
export function lerEscolha(bruto: unknown): LocalizacaoPublica | null {
  if (bruto === undefined) return "aproximada"
  if (bruto === "exata" || bruto === "aproximada") return bruto
  return null
}
