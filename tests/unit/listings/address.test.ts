import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ADDRESS_MAX, validateAddress } from "../../../apps/web/lib/listings/address"
import { validateNewListing } from "../../../apps/web/lib/listings/catalog"
import { validateListingEdit } from "../../../apps/web/lib/listings/lifecycle"
import { validatePropertyDraft } from "../../../apps/web/lib/listings/validation"

// Endereço por escolha de quem anuncia (decisão do dono, 25/09/2026; migration
// 20260925174442). Vazio é "não informar", nunca erro; informado, vai ao banco.

const root = join(import.meta.dirname, "..", "..", "..")
const web = (...segments: string[]) => readFileSync(join(root, "apps", "web", ...segments), "utf8")

const itemDraft = {
  title: "Mesa de jantar",
  category: "casa_moveis",
  priceInput: "650,00",
  condition: "used",
  description: "Mesa usada, sem detalhes.",
  neighborhood: "Centro",
  audienceType: "locality" as const,
  localityId: "00000000-0000-4000-8000-000000000001",
  communityId: null,
  photoCount: 0,
}

describe("validação do endereço", () => {
  it("vazio ou só espaços é não informar", () => {
    expect(validateAddress("")).toEqual({ ok: true, value: null })
    expect(validateAddress("   ")).toEqual({ ok: true, value: null })
    expect(validateAddress(undefined)).toEqual({ ok: true, value: null })
  })

  it("aceita endereço completo, com número e complemento, e normaliza espaços", () => {
    expect(validateAddress("  Rua das Flores,   123 - apto 45 ")).toEqual({
      ok: true,
      value: "Rua das Flores, 123 - apto 45",
    })
  })

  it("recusa curto demais e longo demais", () => {
    expect(validateAddress("ab").ok).toBe(false)
    expect(validateAddress("x".repeat(ADDRESS_MAX + 1)).ok).toBe(false)
  })
})

describe("o endereço nos três formulários de anúncio", () => {
  it("Mercado, novo: leva o endereço adiante e aceita sem ele", () => {
    const withAddress = validateNewListing({ ...itemDraft, address: "Rua das Flores, 123" })
    expect(withAddress.ok && withAddress.value.address).toBe("Rua das Flores, 123")
    const without = validateNewListing(itemDraft)
    expect(without.ok && without.value.address).toBeNull()
  })

  it("Mercado, edição: endereço inválido vira erro do campo", () => {
    const result = validateListingEdit({ ...itemDraft, address: "ab" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.address).toMatch(/curto/)
  })

  it("Imóveis: endereço inválido aponta o campo address", () => {
    const result = validatePropertyDraft({
      title: "Apartamento de 2 quartos",
      deal: "rent",
      propertyType: "apartment",
      rent: "1800",
      condoFee: "",
      iptu: "",
      salePrice: "",
      bedrooms: "2",
      suites: "",
      parkingSpots: "",
      areaM2: "",
      description: "",
      neighborhood: "Centro",
      address: "x".repeat(ADDRESS_MAX + 1),
      availableFrom: "",
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.field).toBe("address")
  })

  it("os formulários gravam o endereço e avisam que ele fica visível", () => {
    const novo = web("app", "(shell)", "mercado", "novo", "page.tsx")
    const editar = web("app", "(shell)", "mercado", "[id]", "editar", "page.tsx")
    const imovel = web("app", "(shell)", "imoveis", "property-form.tsx")
    const actions = web("lib", "listings", "actions.ts")
    for (const source of [novo, editar, imovel]) expect(source).toContain("{ADDRESS_HINT}")
    expect(novo).toContain("address: value.address,")
    expect(editar).toContain("address: value.address,")
    expect(actions.match(/address: addressValue\(draft\.address\)/g)?.length).toBe(2)
  })

  it("as páginas do anúncio mostram o endereço quando ele existe", () => {
    expect(web("app", "(shell)", "mercado", "[id]", "page.tsx")).toContain("{listing.address ? (")
    expect(web("app", "(shell)", "imoveis", "[id]", "page.tsx")).toContain("{property.address ? (")
  })
})
