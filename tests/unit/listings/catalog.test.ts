import { describe, expect, it } from "vitest"
import {
  buildListingPhotoPath,
  categoryLabel,
  conditionLabel,
  EMPTY_LISTING_SEARCH,
  formatCentsBRL,
  hasActiveFilters,
  isNeighborhoodLike,
  parseListingSearch,
  parsePriceInput,
  relativeTime,
  serializeListingSearch,
  validateNewListing,
} from "../../../apps/web/lib/listings/catalog"

describe("parsePriceInput", () => {
  it("accepts a whole-real amount as cents", () => {
    expect(parsePriceInput("650")).toBe(65000)
  })

  it("accepts a pt-BR decimal amount", () => {
    expect(parsePriceInput("650,00")).toBe(65000)
    expect(parsePriceInput("1.234,56")).toBe(123456)
  })

  it("accepts a currency prefix", () => {
    expect(parsePriceInput("R$ 12")).toBe(1200)
  })

  it("treats an empty string as absent", () => {
    expect(parsePriceInput("  ")).toBeNull()
  })

  it("rejects non-numeric text", () => {
    expect(parsePriceInput("caro demais")).toBe("invalid")
  })
})

describe("formatCentsBRL", () => {
  it("formats cents as Brazilian currency", () => {
    const formatted = formatCentsBRL(65000)
    expect(formatted).toContain("650,00")
    expect(formatted).toContain("R$")
  })
})

describe("parseListingSearch / serializeListingSearch", () => {
  it("defaults to the most recent, first page, no filters", () => {
    const state = parseListingSearch(new URLSearchParams())
    expect(state).toEqual(EMPTY_LISTING_SEARCH)
    expect(hasActiveFilters(state)).toBe(false)
  })

  it("reads repeated category and condition params and ignores unknown values", () => {
    const params = new URLSearchParams(
      "categoria=eletronicos&categoria=nao_existe&condicao=new&ordem=price_asc&pagina=3",
    )
    const state = parseListingSearch(params)
    expect(state.categories).toEqual(["eletronicos"])
    expect(state.conditions).toEqual(["new"])
    expect(state.sort).toBe("price_asc")
    expect(state.page).toBe(3)
  })

  it("round-trips a non-empty filter state", () => {
    const params = new URLSearchParams(
      "categoria=esporte&categoria=infantil&condicao=used_good&regiao=Centro&preco_min=1000&preco_max=9000&ordem=price_desc&pagina=2",
    )
    const state = parseListingSearch(params)
    const roundTripped = parseListingSearch(new URLSearchParams(serializeListingSearch(state)))
    expect(roundTripped).toEqual(state)
    expect(hasActiveFilters(roundTripped)).toBe(true)
  })

  it("omits defaults from the serialized query", () => {
    expect(serializeListingSearch(EMPTY_LISTING_SEARCH)).toBe("")
  })
})

describe("neighborhood guard", () => {
  it("accepts a plain neighborhood", () => {
    expect(isNeighborhoodLike("Centro")).toBe(true)
    expect(isNeighborhoodLike("Águas Claras")).toBe(true)
  })

  it("rejects street, number, complement and CEP", () => {
    expect(isNeighborhoodLike("Rua das Flores 123")).toBe(false)
    expect(isNeighborhoodLike("Apto 12")).toBe(false)
    expect(isNeighborhoodLike("Centro, 45")).toBe(false)
    expect(isNeighborhoodLike("CEP 69000-000")).toBe(false)
  })
})

describe("validateNewListing", () => {
  const validDraft = {
    title: "Mesa de jantar",
    category: "casa_moveis",
    priceInput: "650,00",
    condition: "used_good",
    description: "Mesa usada, sem detalhes.",
    neighborhood: "Centro",
    audienceType: "locality" as const,
    localityId: "00000000-0000-4000-8000-000000000001",
    communityId: null,
    photoCount: 3,
  }

  it("accepts a valid item draft and converts the price to cents", () => {
    const result = validateNewListing(validDraft)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.priceCents).toBe(65000)
      expect(result.value.category).toBe("casa_moveis")
      expect(result.value.communityId).toBeNull()
    }
  })

  it("rejects a short title", () => {
    const result = validateNewListing({ ...validDraft, title: "ab" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.title).toBeDefined()
  })

  it("rejects an address-like neighborhood", () => {
    const result = validateNewListing({ ...validDraft, neighborhood: "Rua das Flores 123" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.neighborhood).toBeDefined()
  })

  it("rejects more photos than the on-screen limit", () => {
    const result = validateNewListing({ ...validDraft, photoCount: 7 })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.photos).toBeDefined()
  })

  it("rejects a district audience without a community", () => {
    const result = validateNewListing({
      ...validDraft,
      audienceType: "community",
      communityId: null,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.audience).toBeDefined()
  })

  it("rejects an unparsable price", () => {
    const result = validateNewListing({ ...validDraft, priceInput: "combinar" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.price).toBeDefined()
  })
})

describe("labels and photo path", () => {
  it("resolves known labels and falls back safely", () => {
    expect(categoryLabel("eletronicos")).toBe("Eletrônicos")
    expect(categoryLabel("unknown")).toBe("Outros")
    expect(conditionLabel("used_good")).toBe("Usado em bom estado")
  })

  it("builds a path rooted at the listing id", () => {
    const path = buildListingPhotoPath("a0000000-0000-4000-8000-000000000001", 2, "image/jpeg")
    expect(path.startsWith("a0000000-0000-4000-8000-000000000001/")).toBe(true)
    expect(path.endsWith(".jpeg")).toBe(true)
  })
})

describe("relativeTime", () => {
  const now = Date.parse("2026-09-10T12:00:00.000Z")

  it("describes recent moments", () => {
    expect(relativeTime("2026-09-10T11:58:00.000Z", now)).toBe("há 2 min")
    expect(relativeTime("2026-09-10T09:00:00.000Z", now)).toBe("há 3 h")
  })

  it("describes days and never goes negative", () => {
    expect(relativeTime("2026-09-08T12:00:00.000Z", now)).toBe("há 2 dias")
    expect(relativeTime("2026-09-11T12:00:00.000Z", now)).toBe("há 1 s")
  })
})
