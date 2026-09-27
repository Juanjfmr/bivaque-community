import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  firstPhotoPathByListing,
  type MarketHighlight,
  photosFirst,
} from "../../../apps/web/lib/listings/highlights"

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

function item(id: string, photoUrl: string | null): MarketHighlight {
  return { id, title: id, priceCents: 1000, neighborhood: "Centro", photoUrl }
}

describe("novidades do Mercado no Início", () => {
  it("usa a foto de menor posição de cada anúncio", () => {
    // Arrange — fotos fora de ordem, dois anúncios
    const rows = [
      { listing_id: "a", path: "a/2.jpg", position: 2 },
      { listing_id: "b", path: "b/1.jpg", position: 1 },
      { listing_id: "a", path: "a/0.jpg", position: 0 },
    ]

    // Act
    const first = firstPhotoPathByListing(rows)

    // Assert
    expect(first.get("a")).toBe("a/0.jpg")
    expect(first.get("b")).toBe("b/1.jpg")
  })

  it("não inventa foto para anúncio sem foto", () => {
    expect(firstPhotoPathByListing([]).size).toBe(0)
  })

  it("põe anúncios com foto primeiro sem perder a ordem de recência", () => {
    // Arrange — já em ordem de recência
    const items = [item("1", null), item("2", "u2"), item("3", null), item("4", "u4")]

    // Act
    const ordered = photosFirst(items).map((entry) => entry.id)

    // Assert
    expect(ordered).toEqual(["2", "4", "1", "3"])
  })

  it("lê só anúncios ativos de item, com o mesmo público de /mercado", () => {
    const loader = read("apps", "web", "lib", "listings", "highlights.ts")
    const mercado = read("apps", "web", "app", "(shell)", "mercado", "page.tsx")
    for (const clause of ['.eq("status", "active")', '.eq("kind", "item")']) {
      expect(loader).toContain(clause)
      expect(mercado).toContain(clause)
    }
    expect(loader).toContain("community_id.in.(")
  })

  // A faixa é um bloco da descoberta, que a página desenha depois da prévia da
  // comunidade (a ordem entre os blocos muda com a novidade; ver inicio-hub).
  it("o Início monta a faixa depois da prévia da comunidade", () => {
    const page = read("apps", "web", "app", "(shell)", "inicio", "page.tsx")
    expect(page).toContain("<MarketStrip")
    expect(page).toContain('key: "mercado"')
    expect(page.indexOf("<CommunitySection")).toBeLessThan(page.indexOf("{discovery.map("))
  })

  it("erro de carga vira estado recuperável, não faixa vazia", () => {
    const strip = read("apps", "web", "app", "(shell)", "inicio", "market-strip.tsx")
    const section = read("apps", "web", "app", "(shell)", "inicio", "hub-section.tsx")
    expect(strip).toContain('state.status === "error"')
    expect(strip).toContain("<HubError")
    expect(section).toContain("Tentar de novo")
  })
})
