// RECON-027 — filtros da busca de Moradia (prancha 65, painel 1).
//
// Lógica pura: normaliza os parâmetros de URL, dá o rótulo correto ao filtro de
// valor e reconstrói o link preservando os filtros (voltar/recarregar/nova aba).
// A regra da reviewNote está aqui e não no JSX: quando o filtro NÃO inclui
// condomínio, o valor só pode ser rotulado como "Aluguel máximo" — aluguel e
// custo total são coisas diferentes.

import type { ListingDeal, PropertyType } from "./types"

export type ListingSort = "recent" | "price_asc" | "price_desc"

export interface ListingFilters {
  search: string | null
  neighborhood: string | null
  deal: ListingDeal | null
  maxValueCents: number | null
  minBedrooms: number | null
  propertyType: PropertyType | null
  sort: ListingSort
}

export type RawSearchParams = Record<string, string | string[] | undefined>

export const MAX_VALUE_OPTIONS = [1500, 2500, 4000, 6000] as const
export const BEDROOM_OPTIONS = [1, 2, 3, 4] as const

export const DEAL_OPTIONS: readonly ListingDeal[] = ["rent", "sale"]
export const PROPERTY_TYPE_OPTIONS: readonly PropertyType[] = [
  "apartment",
  "house",
  "studio",
  "room",
]

function firstValue(raw: string | string[] | undefined): string | null {
  if (Array.isArray(raw)) {
    const [first] = raw
    return first ?? null
  }
  return raw ?? null
}

function parsePositiveInt(raw: string | string[] | undefined): number | null {
  const value = firstValue(raw)
  if (value === null || !/^\d+$/.test(value)) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function parseEnum<T extends string>(
  raw: string | string[] | undefined,
  allowed: readonly T[],
): T | null {
  const value = firstValue(raw)
  if (value === null) return null
  return (allowed as readonly string[]).includes(value) ? (value as T) : null
}

export function parseListingFilters(params: RawSearchParams): ListingFilters {
  const sortRaw = firstValue(params["sort"])
  const sort: ListingSort = sortRaw === "price_asc" || sortRaw === "price_desc" ? sortRaw : "recent"

  return {
    search: firstValue(params["q"])?.trim() || null,
    neighborhood: firstValue(params["bairro"])?.trim() || null,
    deal: parseEnum(params["tipo_negocio"], DEAL_OPTIONS),
    maxValueCents: (() => {
      const reais = parsePositiveInt(params["valor_max"])
      return reais === null ? null : reais * 100
    })(),
    minBedrooms: parsePositiveInt(params["quartos"]),
    propertyType: parseEnum(params["tipo"], PROPERTY_TYPE_OPTIONS),
    sort,
  }
}

// "Aluguel máximo" quando o filtro é de aluguel e não inclui condomínio;
// "Valor máximo" para venda (preço é o valor cheio).
export function valueFilterLabel(deal: ListingDeal | null): string {
  return deal === "rent" ? "Aluguel máximo" : "Valor máximo"
}

export function filtersToQuery(filters: ListingFilters): string {
  const params = new URLSearchParams()
  if (filters.search) params.set("q", filters.search)
  if (filters.neighborhood) params.set("bairro", filters.neighborhood)
  if (filters.deal) params.set("tipo_negocio", filters.deal)
  if (filters.maxValueCents !== null && filters.maxValueCents % 100 === 0) {
    params.set("valor_max", String(filters.maxValueCents / 100))
  }
  if (filters.minBedrooms !== null) params.set("quartos", String(filters.minBedrooms))
  if (filters.propertyType) params.set("tipo", filters.propertyType)
  if (filters.sort !== "recent") params.set("sort", filters.sort)
  const query = params.toString()
  return query.length > 0 ? `?${query}` : ""
}

// Um resultado vazio não é erro; um erro de leitura é. Esta função separa os
// dois para a tela não confundir um com o outro.
export function isTrueEmptyState(count: number): boolean {
  return count === 0
}
