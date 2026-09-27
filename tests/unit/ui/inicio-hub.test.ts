import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  COUNT_CAP,
  countThisWeek,
  formatCount,
  guideCategoryLabel,
  type HubEvent,
} from "../../../apps/web/app/(shell)/inicio/hub-loaders"

// O Início como atalho do Bivaque (25/09/2026). A parte pura dos carregadores
// é provada aqui; a composição da página, por leitura de fonte. LIMITE: nada
// aqui mede layout em navegador — isso é o e2e inicio-phone-typography.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")
const inicio = (file: string) => read("apps", "web", "app", "(shell)", "inicio", file)

function event(id: string, startsAt: string): HubEvent {
  return { id, title: id, startsAt, venue: null }
}

describe("contadores do hub", () => {
  it("conta só os encontros dos próximos 7 dias", () => {
    // Arrange
    const now = new Date("2026-09-25T12:00:00Z")
    const events = [
      event("passado", "2026-09-25T11:00:00Z"),
      event("hoje", "2026-09-25T20:00:00Z"),
      event("em-seis-dias", "2026-10-01T12:00:00Z"),
      event("em-oito-dias", "2026-10-03T12:00:00Z"),
    ]

    // Act
    const count = countThisWeek(events, now)

    // Assert
    expect(count).toBe(2)
  })

  it("mostra o teto como N+ em vez de fingir um número exato", () => {
    expect(formatCount(3)).toBe("3")
    expect(formatCount(COUNT_CAP)).toBe(`${COUNT_CAP}+`)
  })

  it("traduz a categoria do Guia e não inventa rótulo desconhecido", () => {
    expect(guideCategoryLabel("school")).toBe("Colégio")
    expect(guideCategoryLabel("nova-categoria")).toBe("Guia")
  })
})

describe("composição do Início", () => {
  const page = inicio("page.tsx")

  // A descoberta é montada em blocos antes do JSX e desenhada por
  // `discovery.map`; por isso a ordem fixa é medida só dentro do return, e a
  // ordem padrão da descoberta pela declaração dos blocos.
  it("segue a ordem: retornos, semana, comunidade, descoberta", () => {
    const jsx = page.slice(page.indexOf('<div className="flex flex-1 flex-col">'))
    const order = [
      "<HubShortcuts",
      "<ReturnStrip />",
      "<WeekEventsCarousel",
      "<CommunitySection",
      "{discovery.map(",
    ].map((marker) => jsx.indexOf(marker))
    for (const position of order) expect(position).toBeGreaterThan(-1)
    expect([...order].sort((a, b) => a - b)).toEqual(order)

    const blocks = ['key: "mercado"', 'key: "listas"', 'key: "imoveis"'].map((marker) =>
      page.indexOf(marker),
    )
    for (const position of blocks) expect(position).toBeGreaterThan(-1)
    expect([...blocks].sort((a, b) => a - b)).toEqual(blocks)
  })

  it("só reordena a descoberta com visita anterior e depois que ela toda chegou", () => {
    expect(page).toContain(
      "const discovery = novelty && discoverySettled(hub.data) ? orderByNovelty(blocks) : blocks",
    )
  })

  it("sem comunidade, o convite a entrar vem antes dos atalhos e a prévia some", () => {
    const jsx = page.slice(page.indexOf('<div className="flex flex-1 flex-col">'))
    expect(jsx.indexOf("<JoinCommunityCard />")).toBeLessThan(jsx.indexOf("<HubShortcuts"))
    expect(page).toContain("{hasCommunity ? null : <JoinCommunityCard />}")
    expect(inicio("join-community.tsx")).toContain('href="/communities"')
  })

  it("seção pronta e vazia não é desenhada", () => {
    for (const file of ["market-strip.tsx", "questions-guide.tsx", "week-events.tsx"]) {
      expect(inicio(file), file).toMatch(
        /state\.status === "ready" && state\.data[.a-z]*\.length === 0\) return null/,
      )
    }
    expect(inicio("hub-section.tsx")).not.toContain("HubEmpty")
  })

  it("a barra de seções lista só o que existe e tem volta aos atalhos", () => {
    expect(page).toContain("...discovery.flatMap((block) => block.links)")
    expect(inicio("section-nav.tsx")).toContain('aria-label="Voltar aos atalhos"')
  })

  it("a comunidade é prévia, não feed infinito", () => {
    const section = inicio("community-section.tsx")
    expect(section).toContain("previewLimit = 3")
    expect(section).toContain(".slice(0, previewLimit)")
    expect(section).toContain("Ver todas as publicações")
  })

  it("a barra de seções aponta só para seções que a página monta", () => {
    const ids = [...page.matchAll(/\{ id: "(secao-[a-z]+)"/g)].map((match) => match[1])
    const sources = [
      "hub-section.tsx",
      "market-strip.tsx",
      "week-events.tsx",
      "questions-guide.tsx",
      "community-section.tsx",
    ]
      .map(inicio)
      .join("\n")
    expect(ids.length).toBeGreaterThan(0)
    for (const id of ids) expect(sources, id).toContain(`"${id}"`)
  })

  it("a barra retrátil some da árvore de acessibilidade enquanto está recolhida", () => {
    const nav = inicio("section-nav.tsx")
    expect(nav).toContain("inert={!shown}")
    expect(nav).toContain("aria-hidden={!shown}")
    expect(nav).toContain("lg:hidden")
  })
})
