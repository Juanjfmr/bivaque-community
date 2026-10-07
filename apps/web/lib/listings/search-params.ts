import type { ListingSearchFilters } from "./types"

type Params = Record<string, string | string[] | undefined>
export function propertySearchParams(params: Params) {
  const text = (name: string) => (typeof params[name] === "string" ? params[name].trim() : "")
  const maxRent = text("aluguel_max")
  const rooms = text("quartos_min")
  const maxRentNumber = /^\d+(?:[.,]\d{1,2})?$/.test(maxRent)
    ? Math.round(Number(maxRent.replace(",", ".")) * 100)
    : undefined
  const minBedrooms = /^\d{1,2}$/.test(rooms) ? Number(rooms) : undefined
  const filters: ListingSearchFilters = {
    query: text("q"),
    propertyType: text("tipo"),
    neighborhood: text("bairro"),
    maxRentCents:
      maxRentNumber !== undefined && Number.isSafeInteger(maxRentNumber)
        ? maxRentNumber
        : undefined,
    minBedrooms,
  }
  const values = {
    q: text("q"),
    tipo: text("tipo"),
    bairro: text("bairro"),
    aluguel_max: maxRent,
    quartos_min: rooms,
  }
  return { filters, values }
}
