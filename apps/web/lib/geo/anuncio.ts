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
 * O aproximado é uma GRADE, não só um deslocamento — e a grade é o que o banco
 * cobra (CHECK `listings_localizacao_aproximada_na_grade`, RUN-175 / revisão R3).
 *
 * Duas constantes, uma fórmula:
 *
 * - `PASSO_DA_GRADE = 0,001°` é a granularidade PUBLICADA: o ponto cai num nó da
 *   grade de 0,001° (~111 m), então nenhum valor mais fino que isso chega ao
 *   banco quando a escolha é aproximada.
 * - `DESLOCAMENTO_APROXIMADO = 0,003°` (~333 m) empurra o ponto para sul e oeste:
 *   o publicado fica entre ~278 m e ~389 m por eixo do real — ~393 m a ~550 m de
 *   distância em linha reta, nunca menos que o piso de 300 m do ADR.
 *
 * O CHECK repete `(coordenada + DESLOCAMENTO) / PASSO` inteiro; um UPDATE bruto
 * pelo PostgREST com a coordenada crua não fecha essa conta e é recusado (23514).
 */
/** A grade publicada e o deslocamento — exportados para o teste e para o relatório. */
export const PASSO_DA_GRADE = 0.001
export const DESLOCAMENTO_APROXIMADO = 0.003

/** `round(coordenada / PASSO)` na fórmula do banco, com o deslocamento somado. */
function naGrade(coordenada: number): number {
  const passo = Math.round(coordenada / PASSO_DA_GRADE) * PASSO_DA_GRADE
  // `toFixed(5)` corta o ruído de ponto flutuante (ex.: -3.1019999999999998),
  // e o resultado continua sendo múltiplo de 0,001 deslocado de 0,003.
  return Number((passo - DESLOCAMENTO_APROXIMADO).toFixed(5))
}

export function aproximarCoordenada(
  latitude: number,
  longitude: number,
): Readonly<{ latitude: number; longitude: number }> {
  return { latitude: naGrade(latitude), longitude: naGrade(longitude) }
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
