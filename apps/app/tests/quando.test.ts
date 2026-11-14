import { afterEach, describe, expect, it, vi } from "vitest"

import { quandoDe } from "../src/telas/comum"

describe("quandoDe", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("lê a data em texto ISO que a API manda em criadaEm", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-14T12:00:00.000Z"))
    expect(quandoDe("2026-11-14T11:30:00.000000+00:00")).toBe("há 30 min")
    expect(quandoDe("2026-11-14T09:00:00.000000+00:00")).toBe("há 3 h")
    expect(quandoDe("2026-11-13T11:00:00.000000+00:00")).toBe("ontem")
    expect(quandoDe("2026-11-10T12:00:00.000000+00:00")).toBe("há 4 dias")
  })

  it("continua lendo milissegundos, como a demonstração manda", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-14T12:00:00.000Z"))
    expect(quandoDe(Date.parse("2026-11-14T11:55:00.000Z"))).toBe("há 5 min")
  })
})
