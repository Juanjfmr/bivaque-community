// RECON-028 — prancha 65, painel 2, agora na porta do app (RUN-169). Lógica
// pura do alerta de Moradia: os critérios que a rota grava, a linha que ela
// devolve e o link de volta aos resultados. Sem React e sem banco, para que a
// regra seja uma função testável — a rota `/api/app/imoveis/alertas` e a tela
// `AlertasDeImovel` do app consomem daqui.

import { formatMoney } from "./costs"
import { valueFilterLabel } from "./filters"
import type { ListingDeal, ListingKind } from "./types"

export interface ListingAlert {
  id: string
  name: string
  kind: ListingKind
  localityId: string | null
  neighborhood: string | null
  deal: ListingDeal | null
  maxValueCents: number | null
  minBedrooms: number | null
  isActive: boolean
  createdAt: string
}

export const ALERT_NAME_MIN = 2
export const ALERT_NAME_MAX = 80

// Os limites são os CHECKs da tabela (`listing_alerts`, 20260911043053:174-196):
// a rota recusa com 400 antes de o banco recusar, em vez de traduzir o erro dele.
const ALERT_MAX_VALUE_CENTS = 100_000_000
const ALERT_MAX_BEDROOMS = 20

/** As colunas que esta lógica lê e escreve — uma lista só, para as duas rotas. */
export const COLUNAS_DO_ALERTA =
  "id,name,kind,locality_id,neighborhood,deal,max_value_cents,min_bedrooms,is_active,created_at"

/** A linha do banco, com os nomes da tabela. */
export interface LinhaDoAlerta {
  id: string
  name: string
  kind: ListingKind
  locality_id: string | null
  neighborhood: string | null
  deal: ListingDeal | null
  max_value_cents: number | null
  min_bedrooms: number | null
  is_active: boolean
  created_at: string
}

/**
 * O critério normalizado, com os nomes do banco. É exatamente o que
 * `createListingAlertAction` gravava (owner e `kind: "property"` são da rota,
 * não do corpo) e o que o dispatch da entrega casa (`private.dispatch_listing_alerts`
 * lê kind, locality_id, neighborhood, deal, max_value_cents, min_bedrooms e
 * is_active — nenhuma coluna além destas é inventada aqui).
 */
export interface ListingAlertCriteria {
  name: string
  neighborhood: string | null
  deal: ListingDeal | null
  maxValueCents: number | null
  minBedrooms: number | null
  isActive: boolean
}

export type AlertCriteriaLido =
  | { readonly ok: true; readonly criterios: ListingAlertCriteria }
  | { readonly ok: false; readonly campo: string }

function texto(valor: unknown): string | null | undefined {
  if (valor === undefined || valor === null) return null
  return typeof valor === "string" ? valor.trim() : undefined
}

function inteiro(valor: unknown): number | null | undefined {
  if (valor === undefined || valor === null) return null
  return typeof valor === "number" && Number.isSafeInteger(valor) ? valor : undefined
}

/**
 * O nome que a action antiga derivava dos filtros quando a pessoa não digitava
 * um: "Moradia para alugar em Centro". Só o aluguel ganhava o complemento, e a
 * venda ficava "Moradia" — a paridade é com o que está gravado, não com o que
 * seria mais bonito.
 */
export function alertNameFromCriteria(
  deal: ListingDeal | null,
  neighborhood: string | null,
): string {
  const partes = ["Moradia"]
  if (deal === "rent") partes.push("para alugar")
  if (neighborhood !== null) partes.push(`em ${neighborhood}`)
  return partes.join(" ").slice(0, ALERT_NAME_MAX)
}

/**
 * Valida o corpo de criação/edição do alerta. Uma função só para as duas rotas
 * e para o que sobrou da antiga action: `nome` vazio vira o nome derivado dos
 * critérios, `quartos: 0` vira "qualquer" (como o `parsePositiveInt` da web
 * fazia) e `valorMaxCents` já vem em centavos — a unidade da tabela.
 */
export function parseAlertCriteria(corpo: Record<string, unknown>): AlertCriteriaLido {
  const nome = texto(corpo["nome"])
  const bairro = texto(corpo["bairro"])
  const negocio = corpo["tipoNegocio"] ?? null
  const valor = inteiro(corpo["valorMaxCents"])
  const quartos = inteiro(corpo["quartos"])
  const ativo = corpo["ativo"] ?? true

  if (nome === undefined) return { ok: false, campo: "nome" }
  if (bairro === undefined || (bairro !== null && (bairro.length < 1 || bairro.length > 80)))
    return { ok: false, campo: "bairro" }
  if (negocio !== null && negocio !== "rent" && negocio !== "sale")
    return { ok: false, campo: "tipoNegocio" }
  if (valor === undefined || (valor !== null && (valor < 0 || valor > ALERT_MAX_VALUE_CENTS)))
    return { ok: false, campo: "valorMaxCents" }
  if (quartos === undefined || (quartos !== null && (quartos < 0 || quartos > ALERT_MAX_BEDROOMS)))
    return { ok: false, campo: "quartos" }
  if (typeof ativo !== "boolean") return { ok: false, campo: "ativo" }

  const nomeFinal = nome === null || nome === "" ? alertNameFromCriteria(negocio, bairro) : nome
  if (nomeFinal.length < ALERT_NAME_MIN || nomeFinal.length > ALERT_NAME_MAX)
    return { ok: false, campo: "nome" }

  return {
    ok: true,
    criterios: {
      name: nomeFinal,
      neighborhood: bairro,
      deal: negocio,
      maxValueCents: valor,
      minBedrooms: quartos === null || quartos === 0 ? null : quartos,
      isActive: ativo,
    },
  }
}

/** A linha do banco no formato que a apresentação (e o app) entende. */
export function alertaDaLinha(linha: LinhaDoAlerta): ListingAlert {
  return {
    id: linha.id,
    name: linha.name,
    kind: linha.kind,
    localityId: linha.locality_id,
    neighborhood: linha.neighborhood,
    deal: linha.deal,
    maxValueCents: linha.max_value_cents,
    minBedrooms: linha.min_bedrooms,
    isActive: linha.is_active,
    createdAt: linha.created_at,
  }
}

/**
 * O corpo do alerta para o app. `busca` são só as chaves que a busca do app lê
 * (`src/mercado/filtros-url.ts`); o nome das colunas fica do lado do banco.
 */
export function alertaParaCorpo(alerta: ListingAlert): Record<string, unknown> {
  return {
    id: alerta.id,
    nome: alerta.name,
    bairro: alerta.neighborhood,
    tipoNegocio: alerta.deal,
    valorMaxCents: alerta.maxValueCents,
    quartos: alerta.minBedrooms,
    ativo: alerta.isActive,
    criadoEm: alerta.createdAt,
    busca: alertSearchParams(alerta),
  }
}

// "Aluguel · Até R$ 2.500 · 2+ quartos" — os critérios do cartão, separados por
// ponto médio, como a prancha 65.
export function alertCriteriaParts(alert: ListingAlert): string[] {
  const parts: string[] = []
  if (alert.deal === "rent") parts.push("Aluguel")
  if (alert.deal === "sale") parts.push("Venda")
  if (alert.maxValueCents !== null) parts.push(`Até ${formatMoney(alert.maxValueCents)}`)
  if (alert.minBedrooms !== null) parts.push(`${alert.minBedrooms}+ quartos`)
  return parts
}

export function alertCriteriaLabel(alert: ListingAlert): string {
  const parts = alertCriteriaParts(alert)
  return parts.length > 0 ? parts.join(" · ") : "Todos os imóveis"
}

export function formatAlertDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}/${date.getFullYear()}`
}

// "Ativo · Criado em 20/05/2024" — a linha de situação do cartão.
export function alertStatusLabel(alert: ListingAlert): string {
  const situation = alert.isActive ? "Ativo" : "Inativo"
  const created = formatAlertDate(alert.createdAt)
  return created === "" ? situation : `${situation} · Criado em ${created}`
}

/**
 * As chaves de filtro que a busca do app lê (`src/mercado/filtros-url.ts`: `q`,
 * `tipo`, `quartos`, `valor_max`, `preco_min`, `preco_max`). O alerta só tem
 * valor e quartos para oferecer.
 *
 * PERDA DECLARADA (RUN-169): o formulário antigo também gravava `bairro` e
 * `tipo_negocio`, e a busca antiga levava `sort` — o app não lê nenhuma das
 * três, então elas não entram na URL. A perda está no RELATORIO do lote e nos
 * filtros do Mercado (Lote C), não escondida num filtro que não filtra.
 */
export function alertSearchParams(alerta: ListingAlert): Record<string, string> {
  const busca: Record<string, string> = {}
  // A busca do app conta reais inteiros; um teto quebrado (centavos) não vira
  // filtro arredondado — é omitido, e a tela mostra o critério no texto.
  if (alerta.maxValueCents !== null && alerta.maxValueCents % 100 === 0)
    busca["valor_max"] = String(alerta.maxValueCents / 100)
  if (alerta.minBedrooms !== null) busca["quartos"] = String(alerta.minBedrooms)
  return busca
}

// Abrir o alerta leva aos resultados do app com os critérios que ele filtra.
export function alertSearchHref(alerta: ListingAlert): string {
  const query = new URLSearchParams(alertSearchParams(alerta)).toString()
  return query === "" ? "/app/imoveis" : `/app/imoveis?${query}`
}

// O rótulo do teto de valor: "Aluguel máximo" quando não inclui condomínio.
export function alertValueLabel(deal: ListingDeal | null): string {
  return valueFilterLabel(deal)
}
