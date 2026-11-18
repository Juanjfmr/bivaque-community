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

  // Os formulários de imóvel saíram da web (RUN-164): a folha de Imóveis do app
  // é quem publica, a gestão edita, e a rota grava o endereço pelo módulo que
  // fala com as duas. O aviso de que ele fica visível continua na folha, agora
  // preso à escolha do local (RUN-175).
  it("a folha de imóvel avisa que o endereço fica visível, e a rota o grava", () => {
    const folha = readFileSync(
      join(root, "apps", "app", "components", "bivaque", "formulario-imovel.tsx"),
      "utf8",
    )
    expect(folha).toContain("o endereço aparece no local exato")
    expect(folha).toContain('id="imovel-localizacao"')
    // A rota grava o rascunho com a localização junto: CEP, coordenada e escolha.
    const rota = web("app", "api", "app", "mercado", "_criar.ts")
    expect(rota).toContain("...anuncioDoRascunho(rascunho")
    expect(rota).toContain("localizacao_publica: localizacao.localizacaoPublica")
    expect(web("lib", "listings", "property.ts")).toContain(
      "address: enderecoDoRascunho(rascunho.address)",
    )
  })

  it("as páginas do anúncio mostram o endereço quando ele existe", () => {
    expect(web("app", "(shell)", "mercado", "[id]", "page.tsx")).toContain("{listing.address ? (")
    expect(web("app", "(shell)", "imoveis", "[id]", "page.tsx")).toContain("{property.address ? (")
  })
})
