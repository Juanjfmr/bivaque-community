import { describe, expect, it } from "vitest"
import type { Loaded } from "../../../apps/web/app/(shell)/inicio/hub-loaders"
import {
  discoverySettled,
  hubNovelty,
  hubVisibility,
  newLabel,
} from "../../../apps/web/app/(shell)/inicio/hub-view"
import {
  countInWindow,
  LAST_VISIT_KEY,
  NOVELTY_MAX_DAYS,
  noveltyWindow,
  orderByNovelty,
  swapLastVisit,
} from "../../../apps/web/app/(shell)/inicio/novelty"
import type { HubData } from "../../../apps/web/app/(shell)/inicio/use-hub-data"
import type { MarketHighlight } from "../../../apps/web/lib/listings/highlights"

// "O que mudou desde a sua última visita" no Início (25/09/2026). Tudo que
// decide número, selo, visibilidade e ordem é puro e provado aqui; o que o
// navegador mostra é provado pela captura rolada da mesma rodada.

const NOW = new Date("2026-09-25T12:00:00Z")
const DAY = 24 * 60 * 60 * 1000

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
  }
}

function ready<T>(data: T): Loaded<T> {
  return { status: "ready", data }
}

function hubData(overrides: Partial<HubData> = {}): HubData {
  return {
    events: ready([]),
    questions: ready({ items: [], count: 0, createdAts: [] }),
    guide: ready({ items: [], createdAts: [] }),
    properties: ready({ items: [], createdAts: [] }),
    market: ready([]),
    listingTimes: ready([]),
    ...overrides,
  }
}

const highlight: MarketHighlight = {
  id: "a",
  title: "Berço",
  priceCents: 100,
  neighborhood: "Flores",
  photoUrl: null,
}

describe("última visita", () => {
  it("devolve a visita anterior e grava a atual", () => {
    // Arrange
    const previous = NOW.getTime() - DAY
    const storage = memoryStorage({ [LAST_VISIT_KEY]: String(previous) })

    // Act
    const result = swapLastVisit(storage, NOW)

    // Assert
    expect(result).toBe(previous)
    expect(storage.data.get(LAST_VISIT_KEY)).toBe(String(NOW.getTime()))
  })

  it("primeira visita, valor ilegível ou do futuro não viram visita anterior", () => {
    expect(swapLastVisit(memoryStorage(), NOW)).toBeNull()
    expect(swapLastVisit(memoryStorage({ [LAST_VISIT_KEY]: "lixo" }), NOW)).toBeNull()
    const future = String(NOW.getTime() + DAY)
    expect(swapLastVisit(memoryStorage({ [LAST_VISIT_KEY]: future }), NOW)).toBeNull()
  })

  it("armazenamento que falha não derruba a página", () => {
    const broken = {
      getItem: () => {
        throw new Error("bloqueado")
      },
      setItem: () => {
        throw new Error("bloqueado")
      },
    }
    expect(swapLastVisit(broken, NOW)).toBeNull()
    expect(swapLastVisit(null, NOW)).toBeNull()
  })
})

describe("janela de novidade", () => {
  it("vai da visita anterior até a abertura desta", () => {
    const span = noveltyWindow(NOW.getTime() - DAY, NOW)
    expect(span?.since.getTime()).toBe(NOW.getTime() - DAY)
    expect(span?.until).toBe(NOW)
    expect(noveltyWindow(null, NOW)).toBeNull()
  })

  it("nunca olha além de 30 dias", () => {
    const span = noveltyWindow(NOW.getTime() - 400 * DAY, NOW)
    expect(span?.since.getTime()).toBe(NOW.getTime() - NOVELTY_MAX_DAYS * DAY)
  })

  it("conta só o que chegou dentro da janela", () => {
    // Arrange
    const span = { since: new Date(NOW.getTime() - DAY), until: NOW }
    const times = [
      new Date(NOW.getTime() - 2 * DAY).toISOString(), // antes da visita anterior
      new Date(NOW.getTime() - DAY / 2).toISOString(), // novo
      NOW.toISOString(), // exatamente na abertura: conta
      new Date(NOW.getTime() + 60_000).toISOString(), // publicado depois de abrir
    ]

    // Act / Assert
    expect(countInWindow(times, span)).toBe(2)
  })
})

describe("ordem por novidade", () => {
  it("mais novidade primeiro; empate mantém a ordem padrão", () => {
    const ordered = orderByNovelty([
      { key: "mercado", novelty: 0 },
      { key: "listas", novelty: 3 },
      { key: "imoveis", novelty: 3 },
      { key: "outro", novelty: 1 },
    ])
    expect(ordered.map((block) => block.key)).toEqual(["listas", "imoveis", "outro", "mercado"])
  })

  it("sem novidade nenhuma, a página é a de sempre", () => {
    const blocks = [
      { key: "a", novelty: 0 },
      { key: "b", novelty: 0 },
    ]
    expect(orderByNovelty(blocks).map((block) => block.key)).toEqual(["a", "b"])
  })
})

describe("o que a página decide", () => {
  it("pronto e vazio some; carregando e erro continuam à vista", () => {
    const visibility = hubVisibility(
      hubData({
        events: { status: "loading" },
        market: { status: "error" },
        guide: ready({
          items: [{ id: "g", name: "Escola", categoryLabel: "Colégio" }],
          createdAts: [],
        }),
      }),
    )
    expect(visibility).toEqual({
      events: true,
      market: true,
      questions: false,
      guide: true,
      properties: false,
    })
  })

  it("sem visita anterior não há novidade em lugar nenhum", () => {
    const data = hubData({ listingTimes: ready([NOW.toISOString()]) })
    expect(hubNovelty(data, null)).toEqual({ market: 0, questions: 0, guide: 0, properties: 0 })
    expect(hubNovelty(data, undefined)).toEqual({
      market: 0,
      questions: 0,
      guide: 0,
      properties: 0,
    })
  })

  it("conta a novidade de cada vertical pela mesma janela", () => {
    const recent = new Date(NOW.getTime() - DAY / 2).toISOString()
    const old = new Date(NOW.getTime() - 3 * DAY).toISOString()
    const data = hubData({
      listingTimes: ready([recent, recent, old]),
      questions: ready({ items: [], count: 2, createdAts: [recent, old] }),
      market: ready([highlight]),
    })
    const span = { since: new Date(NOW.getTime() - DAY), until: NOW }
    expect(hubNovelty(data, span)).toEqual({ market: 2, questions: 1, guide: 0, properties: 0 })
  })

  it("a ordem espera a descoberta inteira", () => {
    expect(discoverySettled(hubData())).toBe(true)
    expect(discoverySettled(hubData({ guide: { status: "loading" } }))).toBe(false)
    expect(discoverySettled(hubData({ guide: { status: "error" } }))).toBe(true)
  })

  it("escreve o selo no gênero certo e respeita o teto", () => {
    expect(newLabel(1, "m")).toBe("1 novo")
    expect(newLabel(3, "f")).toBe("3 novas")
    expect(newLabel(50, "m")).toBe("50+ novos")
  })
})
