import type { Page } from "@playwright/test"
import { describe, expect, it, vi } from "vitest"
import { aplicarStubMercado } from "../../../../apps/app/tests/e2e/stub-mercado"

describe("interceptacoes do Mercado", () => {
  it.each([
    ["http://127.0.0.1:3200/api/app/mercado?tipo=item", 0],
    ["http://127.0.0.1:3200/api/app/mercado?tipo=property&quartos=2", 0],
    ["http://127.0.0.1:3200/api/app/mercado/i3/interesse", 1],
    ["http://127.0.0.1:3200/api/app/mercado/i3", 2],
    ["http://127.0.0.1:3200/api/app/mercado/i3?origem=lista", 2],
  ])("intercepta %s apenas com o handler %i", (url, indice) => {
    const registrar = vi.fn()
    aplicarStubMercado({ route: registrar } as unknown as Page)
    const padroes = registrar.mock.calls.map(([padrao]) => padrao)
    expect(padroes).toHaveLength(3)
    expect(padroes.every((padrao) => padrao instanceof RegExp)).toBe(true)
    expect(padroes.map((padrao: RegExp) => padrao.test(url))).toEqual(
      padroes.map((_, atual) => atual === indice),
    )
  })
})
