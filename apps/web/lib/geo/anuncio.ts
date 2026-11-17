import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"
import { gravarCepNoCache, lerCepDoCache } from "./cache"
import { normalizarCep } from "./cep"
import { geocodificarCep } from "./geocodificador"
import { consumirConsulta } from "./limite"

/**
 * A localização que nasce de um CEP (RUN-175 no anúncio, RUN-179 no pedido).
 *
 * Um módulo só: cache-first (`public.cep_geocodes`), limitador por pessoa só na
 * chamada real de rede e bairro casado com `neighborhoods` pelo nome normalizado
 * (o mesmo vizinho que o perfil grava). O anúncio publica esse ponto; o pedido
 * nunca publica — só usa a distância e o bairro.
 *
 * CEP conhecido sem coordenada é SUCESSO PARCIAL (ADR-20261116 §3): cidade e
 * bairro valem, a posição fica nula — nem o anúncio nem o pedido interiorano
 * travam.
 *
 * Nada aqui imprime CEP nem coordenada.
 */

type Cliente = SupabaseClient<Database>

export type LocalizacaoPublica = "exata" | "aproximada"

export type FalhaDALocalizacao =
  | "cep-invalido"
  | "cep-nao-encontrado"
  | "geocodificador-indisponivel"
  | "limite-de-consultas"

type Falha = Readonly<{ ok: false; erro: FalhaDALocalizacao; esperarMs?: number }>

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
 *
 * O PEDIDO não passa por aqui: a coordenada dele nunca é publicada, então não há
 * o que arredondar (e a distância ao prestador fica na precisão do CEP).
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

/** O que um CEP resolve, antes de qualquer decisão de publicação. */
export type CepConhecido = Readonly<{
  cep: string
  coordenada: Readonly<{ latitude: number; longitude: number }> | null
  /** Bairro como a fonte devolveu (texto livre; pode não ser do catálogo). */
  bairroDoCep: string | null
  /** O mesmo bairro na grafia de `neighborhoods`, quando casa. */
  bairroDerivado: string | null
}>

export type PedidoDoCep = Readonly<{
  cliente: Cliente
  /** Quem está consultando: a chave do limitador de geocodificação. */
  pessoa: string
  /** O CEP como veio do corpo (com máscara ou não). */
  cepBruto: string
  /** A cidade da sessão: é nela que o bairro é procurado no catálogo. */
  cidadeId: string
}>

/**
 * O CEP vira ponto e bairro — cache primeiro, provedor só no miss, e só sob o
 * limitador de quem está pedindo. É o único caminho de consulta: o anúncio e o
 * pedido passam por aqui (o que muda entre eles é só o que se publica).
 */
async function localizarCep(
  pedido: PedidoDoCep,
): Promise<Readonly<{ ok: true; local: CepConhecido }> | Falha> {
  const cep = normalizarCep(pedido.cepBruto)
  if (cep === null) return { ok: false, erro: "cep-invalido" }

  const emCache = await lerCepDoCache(pedido.cliente, cep)
  // Vencida (SEC-016) conta como ausente: consulta o provedor e regrava. A
  // coordenada velha fica como rede — provedor fora ou limite negado ainda
  // resolvem o CEP em vez de falhar.
  const vencida = emCache?.vencida
    ? { latitude: emCache.latitude, longitude: emCache.longitude }
    : null
  let coordenada: Readonly<{ latitude: number; longitude: number }> | null =
    emCache !== null && !emCache.vencida
      ? { latitude: emCache.latitude, longitude: emCache.longitude }
      : null
  let bairroDoCep = emCache?.bairro ?? null

  if (coordenada === null) {
    // Cache hit não consome cota: só a chamada real ao provedor é limitada.
    const limite = consumirConsulta(pedido.pessoa)
    if (!limite.liberado) {
      if (vencida === null) {
        return { ok: false, erro: "limite-de-consultas", esperarMs: limite.esperarMs }
      }
      coordenada = vencida
    } else {
      const geocodificada = await geocodificarCep(cep)
      if (geocodificada.estado === "indisponivel") {
        if (vencida === null) return { ok: false, erro: "geocodificador-indisponivel" }
        coordenada = vencida
      } else {
        if (geocodificada.estado === "nao-encontrado") {
          return { ok: false, erro: "cep-nao-encontrado" }
        }
        bairroDoCep = geocodificada.endereco.bairro ?? bairroDoCep
        if (geocodificada.estado === "encontrado") {
          coordenada = geocodificada.coordenada
          try {
            // O bairro é gravado junto: sem ele o cache hit perderia o bairro e só a
            // PRIMEIRA geocodificação de cada CEP no país teria esse dado (RUN-179).
            await gravarCepNoCache(pedido.cliente, cep, geocodificada.coordenada, bairroDoCep)
          } catch {
            // Sem cache o próximo pedido geocodifica de novo; não é motivo para
            // recusar o anúncio ou o pedido que a pessoa está enviando.
          }
        }
      }
      // `sem-coordenada`: a coordenada fica nula e o ponto publicado é decidido
      // pelo chamador (anúncio força aproximada; pedido fica sem distância).
    }
  }

  const bairroDerivado =
    bairroDoCep === null ? null : await bairroCanonico(pedido.cliente, pedido.cidadeId, bairroDoCep)

  return {
    ok: true,
    local: {
      cep,
      coordenada:
        coordenada === null
          ? null
          : { latitude: coordenada.latitude, longitude: coordenada.longitude },
      bairroDoCep,
      bairroDerivado,
    },
  }
}

export type LocalizacaoDoAnuncio = Readonly<{
  cep: string
  latitude: number | null
  longitude: number | null
  localizacaoPublica: LocalizacaoPublica
  /** Bairro que veio do CEP, já na grafia de `neighborhoods`; `null` se não veio. */
  bairroDerivado: string | null
}>

export type ResultadoDALocalizacao =
  | Readonly<{ ok: true; localizacao: LocalizacaoDoAnuncio }>
  | Falha

export type PedidoDALocalizacao = PedidoDoCep &
  Readonly<{
    /** A escolha do anunciante; o servidor decide se ela vale. */
    escolha: LocalizacaoPublica
    /** Desapego: a coordenada é sempre aproximada, sem oferta de exata. */
    forcarAproximada: boolean
  }>

export async function localizarAnuncio(
  pedido: PedidoDALocalizacao,
): Promise<ResultadoDALocalizacao> {
  const resultado = await localizarCep(pedido)
  if (!resultado.ok) return resultado
  const { cep, coordenada, bairroDerivado } = resultado.local

  const aproximada =
    pedido.forcarAproximada || coordenada === null || pedido.escolha === "aproximada"
  const ponto =
    coordenada === null
      ? { latitude: null, longitude: null }
      : aproximada
        ? aproximarCoordenada(coordenada.latitude, coordenada.longitude)
        : coordenada

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

export type LocalizacaoDoPedido = Readonly<{
  cep: string
  latitude: number | null
  longitude: number | null
  /**
   * O bairro que vai para o prestador. O catálogo empresta a grafia quando
   * conhece o nome; fora dele, o texto da fonte vale — é o mesmo bairro, e a
   * coluna `region` aceita texto livre.
   */
  bairro: string | null
}>

export type ResultadoDoPedido = Readonly<{ ok: true; localizacao: LocalizacaoDoPedido }> | Falha

/**
 * A localização do PEDIDO (RUN-179 / ADR-20261022 §3): mesmo cache, mesmo
 * limitador, mesmo geocodificador — e nenhum arredondamento, porque a coordenada
 * do pedido nunca é publicada. O que sai daqui vai para colunas que ninguém lê
 * cruas (grant por coluna em `service_requests`).
 */
export async function localizarPedido(pedido: PedidoDoCep): Promise<ResultadoDoPedido> {
  const resultado = await localizarCep(pedido)
  if (!resultado.ok) return resultado
  const { cep, coordenada, bairroDerivado, bairroDoCep } = resultado.local
  return {
    ok: true,
    localizacao: {
      cep,
      latitude: coordenada?.latitude ?? null,
      longitude: coordenada?.longitude ?? null,
      // A coluna `region` proíbe CEP no lugar do bairro (CHECK de 20261022120200):
      // um texto que seja só dígitos não entra.
      bairro:
        bairroDerivado ?? (bairroDoCep !== null && !/^\d+$/.test(bairroDoCep) ? bairroDoCep : null),
    },
  }
}

/** A escolha que veio do corpo, ou o padrão do servidor (aproximada). */
export function lerEscolha(bruto: unknown): LocalizacaoPublica | null {
  if (bruto === undefined) return "aproximada"
  if (bruto === "exata" || bruto === "aproximada") return bruto
  return null
}
