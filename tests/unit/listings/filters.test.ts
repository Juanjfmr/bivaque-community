import { describe, expect, it } from "vitest"
import {
  filtersToQuery,
  parseListingFilters,
  valueFilterLabel,
} from "../../../apps/web/lib/listings/filters"

// RECON-027 — prancha 65: o rótulo do filtro de valor e a preservação dos
// filtros no link. Aluguel não inclui condomínio; chamá-lo de "valor máximo"
// confundiria aluguel com custo total.

describe("filtros da busca de Moradia", () => {
  it("rotula Aluguel máximo quando o filtro não inclui condomínio", () => {
    expect(valueFilterLabel("rent")).toBe("Aluguel máximo")
    expect(valueFilterLabel("sale")).toBe("Valor máximo")
    expect(valueFilterLabel(null)).toBe("Valor máximo")
  })

  it("normaliza parâmetros válidos", () => {
    const filters = parseListingFilters({
      q: "cobertura",
      bairro: "Águas Claras",
      tipo_negocio: "rent",
      valor_max: "2500",
      quartos: "2",
      tipo: "apartment",
      sort: "price_asc",
    })
    expect(filters).toEqual({
      search: "cobertura",
      neighborhood: "Águas Claras",
      deal: "rent",
      maxValueCents: 250000,
      minBedrooms: 2,
      propertyType: "apartment",
      sort: "price_asc",
    })
  })

  it("descarta valor inválido em vez de fabricar filtro", () => {
    const filters = parseListingFilters({
      tipo_negocio: "banana",
      valor_max: "-10",
      quartos: "abc",
      tipo: "castelo",
      sort: "aleatorio",
    })
    expect(filters.deal).toBeNull()
    expect(filters.maxValueCents).toBeNull()
    expect(filters.minBedrooms).toBeNull()
    expect(filters.propertyType).toBeNull()
    expect(filters.sort).toBe("recent")
  })

  it("reconstrói o link preservando os filtros", () => {
    const query = filtersToQuery({
      search: null,
      neighborhood: "Águas Claras",
      deal: "rent",
      maxValueCents: 250000,
      minBedrooms: 2,
      propertyType: null,
      sort: "recent",
    })
    expect(query).toContain("bairro=%C3%81guas+Claras")
    expect(query).toContain("tipo_negocio=rent")
    expect(query).toContain("valor_max=2500")
    expect(query).toContain("quartos=2")
    expect(query).not.toContain("sort=")
  })

  it("sem filtro não gera query string", () => {
    expect(
      filtersToQuery({
        search: null,
        neighborhood: null,
        deal: null,
        maxValueCents: null,
        minBedrooms: null,
        propertyType: null,
        sort: "recent",
      }),
    ).toBe("")
  })
})
