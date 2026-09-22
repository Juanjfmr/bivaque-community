import { describe, expect, it } from "vitest"
import {
  buildSearchGroups,
  GROUP_PREVIEW_LIMIT,
  matchesTerm,
  snippet,
} from "../../../apps/web/lib/search/groups"

const provider = (id: string, name: string) => ({
  id,
  display_name: name,
  category: "assistencia_tecnica" as const,
  bio: `bio de ${name}`,
})

const guideEntry = (id: string, name: string, description: string | null = null) => ({
  id,
  name,
  description,
  category: "school" as const,
})

const event = (id: string, title: string, description: string | null = null) => ({
  id,
  title,
  description,
  starts_at: "2026-10-10T14:00:00.000Z",
  venue: null,
})

describe("buildSearchGroups", () => {
  it("groups only the implemented types, in prancha order", () => {
    const groups = buildSearchGroups({
      term: "escola",
      providers: [provider("p1", "Escola Segura Assistencia")],
      guideEntries: [guideEntry("g1", "Escola Modelo do Centro", "Ensino integral.")],
      events: [event("e1", "Feira de troca de livros")],
    })
    expect(groups.map((group) => group.key)).toEqual(["guia", "servicos"])
  })

  it("drops a group with zero authorized items instead of rendering an empty section", () => {
    const groups = buildSearchGroups({
      term: "escola",
      providers: [],
      guideEntries: [guideEntry("g1", "Escola Modelo do Centro")],
      events: [],
    })
    expect(groups.map((group) => group.key)).toEqual(["guia"])
  })

  it("keeps the fuzzy RPC hits — the count is the authorized list, not a re-filter", () => {
    const groups = buildSearchGroups({
      term: "climatza",
      providers: [provider("p1", "Climatiza Manaus")],
      guideEntries: [],
      events: [],
    })
    const servicos = groups.find((group) => group.key === "servicos")
    expect(servicos?.total).toBe(1)
    expect(servicos?.items[0]?.title).toBe("Climatiza Manaus")
  })

  it("caps the preview at the limit but reports the full authorized total", () => {
    const many = Array.from({ length: 7 }, (_, i) => guideEntry(`g${i}`, `Escola ${i}`))
    const groups = buildSearchGroups({
      term: "escola",
      providers: [],
      guideEntries: many,
      events: [],
    })
    const guia = groups.find((group) => group.key === "guia")
    expect(guia?.items.length).toBe(GROUP_PREVIEW_LIMIT)
    expect(guia?.total).toBe(7)
  })

  it("carries the canonical term into the domain destinations", () => {
    const groups = buildSearchGroups({
      term: "climatiza",
      providers: [provider("p1", "Climatiza Manaus")],
      guideEntries: [guideEntry("g1", "Assistência Climatiza")],
      events: [event("e1", "Climatiza — dia de serviço")],
    })
    const encoded = encodeURIComponent("climatiza")
    expect(groups.find((g) => g.key === "servicos")?.verTodosHref).toBe(
      `/explorar/servicos?q=${encoded}`,
    )
    expect(groups.find((g) => g.key === "guia")?.verTodosHref).toBe(`/guide?q=${encoded}`)
    // Eventos has no term filter in its own domain (prancha 48): the honest
    // destination is the list itself, declared in the card — never a link
    // that pretends to carry a parameter the page ignores.
    expect(groups.find((g) => g.key === "eventos")?.verTodosHref).toBe("/events")
    expect(groups.find((g) => g.key === "servicos")?.items[0]?.href).toBe("/prestadores/p1")
  })

  it("is case-insensitive for the client-side groups", () => {
    const groups = buildSearchGroups({
      term: "ESCOLA",
      providers: [],
      guideEntries: [guideEntry("g1", "Escola Modelo do Centro")],
      events: [],
    })
    expect(groups.find((g) => g.key === "guia")?.total).toBe(1)
  })
})

describe("snippet", () => {
  it("returns null for empty text", () => {
    expect(snippet(null)).toBeNull()
    expect(snippet("   ")).toBeNull()
  })

  it("keeps short text intact", () => {
    expect(snippet("Ensino integral.")).toBe("Ensino integral.")
  })

  it("cuts long text at a word boundary with an ellipsis", () => {
    const long = `${"a".repeat(80)} ${"b".repeat(80)}`
    const result = snippet(long, 100)
    expect(result?.endsWith("…")).toBe(true)
    expect(result?.length).toBeLessThanOrEqual(101)
    expect(result).toBe(`${"a".repeat(80)}…`)
  })
})

describe("matchesTerm", () => {
  it("tolerates null fields", () => {
    expect(matchesTerm("escola", [null, undefined, "Escola Modelo"])).toBe(true)
    expect(matchesTerm("escola", [null, "hospital"])).toBe(false)
  })
})
