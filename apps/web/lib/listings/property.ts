// Moradia no app (RUN-164): o mesmo rascunho que a web lia de `FormData` passou
// a ser lido de JSON, com as mesmas validações (`validatePropertyDraft`) e as
// mesmas colunas que a RPC `create_property_listing` e o UPDATE de
// `property_details` gravam. Nenhuma rota inventa coluna própria: este é o
// único lugar onde o rascunho vira linha de `listings`/`property_details`.

import { validateAddress } from "./address"
import {
  type PropertyDraftInput,
  parseOptionalArea,
  parseOptionalCents,
  parseOptionalInt,
} from "./validation"

/** O rascunho como o formulário da web o nomeava — o corpo do app fala igual. */
export function lerRascunhoDoImovel(corpo: Record<string, unknown>): PropertyDraftInput {
  const texto = (campo: string): string => {
    const valor = corpo[campo]
    return typeof valor === "string" ? valor : ""
  }
  return {
    title: texto("title"),
    deal: texto("deal"),
    propertyType: texto("propertyType"),
    rent: texto("rent"),
    condoFee: texto("condoFee"),
    iptu: texto("iptu"),
    salePrice: texto("salePrice"),
    bedrooms: texto("bedrooms"),
    suites: texto("suites"),
    parkingSpots: texto("parkingSpots"),
    areaM2: texto("areaM2"),
    description: texto("description"),
    neighborhood: texto("neighborhood"),
    address: texto("address"),
    availableFrom: texto("availableFrom"),
  }
}

/** A linha que a edição relê: só as colunas que o rascunho cobre. */
export type ImovelGravado = Readonly<{
  title: string
  description: string | null
  neighborhood: string | null
  address: string | null
  property_details: Readonly<{
    deal: string
    property_type: string
    rent_cents: number | null
    condo_fee_cents: number | null
    iptu_cents: number | null
    sale_price_cents: number | null
    bedrooms: number | null
    suites: number | null
    parking_spots: number | null
    area_m2: number | null
    available_from: string | null
  }> | null
}>

function centavosParaCampo(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return ""
  return String(Math.round(cents / 100))
}

function numeroParaCampo(valor: number | null | undefined): string {
  if (valor === null || valor === undefined) return ""
  return String(valor)
}

/** O gravado de volta ao formato dos campos, como a página de edição da web fazia. */
export function rascunhoDoBanco(linha: ImovelGravado): PropertyDraftInput {
  const detalhes = linha.property_details
  return {
    title: linha.title,
    deal: detalhes?.deal ?? "",
    propertyType: detalhes?.property_type ?? "",
    rent: centavosParaCampo(detalhes?.rent_cents),
    condoFee: centavosParaCampo(detalhes?.condo_fee_cents),
    iptu: centavosParaCampo(detalhes?.iptu_cents),
    salePrice: centavosParaCampo(detalhes?.sale_price_cents),
    bedrooms: numeroParaCampo(detalhes?.bedrooms),
    suites: numeroParaCampo(detalhes?.suites),
    parkingSpots: numeroParaCampo(detalhes?.parking_spots),
    areaM2: numeroParaCampo(detalhes?.area_m2),
    description: linha.description ?? "",
    neighborhood: linha.neighborhood ?? "",
    address: linha.address ?? "",
    availableFrom: detalhes?.available_from ?? "",
  }
}

/**
 * O corpo manda só no campo que veio; campo ausente preserva o gravado. É o que
 * impede o app de apagar suítes, vagas, IPTU e disponibilidade que ele não
 * mostra — a diferença deliberada em relação ao formulário da web, que enviava
 * todos os campos e por isso podia zerar o que não exibia.
 */
export function juntarRascunho(
  atual: PropertyDraftInput,
  corpo: Record<string, unknown>,
): PropertyDraftInput {
  const lido = lerRascunhoDoImovel(corpo)
  const campo = (chave: keyof PropertyDraftInput, valorAtual: string | undefined): string =>
    typeof corpo[chave] === "string" ? (lido[chave] ?? "") : (valorAtual ?? "")
  return {
    title: campo("title", atual.title),
    deal: campo("deal", atual.deal),
    propertyType: campo("propertyType", atual.propertyType),
    rent: campo("rent", atual.rent),
    condoFee: campo("condoFee", atual.condoFee),
    iptu: campo("iptu", atual.iptu),
    salePrice: campo("salePrice", atual.salePrice),
    bedrooms: campo("bedrooms", atual.bedrooms),
    suites: campo("suites", atual.suites),
    parkingSpots: campo("parkingSpots", atual.parkingSpots),
    areaM2: campo("areaM2", atual.areaM2),
    description: campo("description", atual.description),
    neighborhood: campo("neighborhood", atual.neighborhood),
    address: campo("address", atual.address),
    availableFrom: campo("availableFrom", atual.availableFrom),
  }
}

/** Vazio é "não informar", nunca erro (address.ts); já validado antes. */
export function enderecoDoRascunho(bruto: string | undefined): string | null {
  const resultado = validateAddress(bruto)
  return resultado.ok ? resultado.value : null
}

/** O `p_listing` da RPC — o mesmo objeto que a action da web montava. */
export function anuncioDoRascunho(
  rascunho: PropertyDraftInput,
  opcoes: Readonly<{ status: "draft" | "active"; localityId: string }>,
) {
  return {
    status: opcoes.status,
    title: rascunho.title.trim(),
    description: rascunho.description.trim() || null,
    neighborhood: rascunho.neighborhood.trim() || null,
    address: enderecoDoRascunho(rascunho.address),
    published_at: opcoes.status === "active" ? new Date().toISOString() : null,
    locality_id: opcoes.localityId,
    community_id: null,
  }
}

/** As colunas de `property_details`, iguais na criação e na edição. */
export function detalhesDoRascunho(rascunho: PropertyDraftInput) {
  return {
    deal: rascunho.deal as "rent" | "sale",
    property_type: rascunho.propertyType as
      | "apartment"
      | "house"
      | "studio"
      | "room"
      | "land"
      | "commercial",
    rent_cents: parseOptionalCents(rascunho.rent),
    condo_fee_cents: parseOptionalCents(rascunho.condoFee),
    iptu_cents: parseOptionalCents(rascunho.iptu),
    sale_price_cents: parseOptionalCents(rascunho.salePrice),
    bedrooms: parseOptionalInt(rascunho.bedrooms),
    suites: parseOptionalInt(rascunho.suites),
    parking_spots: parseOptionalInt(rascunho.parkingSpots),
    area_m2: parseOptionalArea(rascunho.areaM2),
    available_from: rascunho.availableFrom.trim() || null,
  }
}
