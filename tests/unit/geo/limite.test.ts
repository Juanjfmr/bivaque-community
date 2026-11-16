import { describe, expect, it } from "vitest"

// RUN-175 — o limitador deslizante da geocodificação (ADR-20261116 §2): 20
// consultas reais por pessoa por hora; cache hit não chega aqui.
import { consumirConsulta, JANELA_MS, TETO_POR_PESSOA } from "web/lib/geo/limite"

const AGORA = 1_800_000_000_000

describe("consumirConsulta", () => {
  it("libera até o teto e recusa a próxima com o tempo de espera", () => {
    const pessoa = "pessoa-teto"
    for (let i = 0; i < TETO_POR_PESSOA; i++) {
      expect(consumirConsulta(pessoa, AGORA + i).liberado).toBe(true)
    }

    const recusa = consumirConsulta(pessoa, AGORA + TETO_POR_PESSOA)
    expect(recusa.liberado).toBe(false)
    if (recusa.liberado) throw new Error("esperava recusa")
    expect(recusa.esperarMs).toBeGreaterThan(0)
    expect(recusa.esperarMs).toBeLessThanOrEqual(JANELA_MS)
  })

  it("a janela desliza: passada a hora, a cota volta", () => {
    const pessoa = "pessoa-janela"
    for (let i = 0; i < TETO_POR_PESSOA; i++) consumirConsulta(pessoa, AGORA + i)
    expect(consumirConsulta(pessoa, AGORA + 10).liberado).toBe(false)
    expect(consumirConsulta(pessoa, AGORA + JANELA_MS + 1).liberado).toBe(true)
  })

  it("o teto é por pessoa: uma não gasta a cota da outra", () => {
    for (let i = 0; i < TETO_POR_PESSOA; i++) consumirConsulta("pessoa-a", AGORA + i)
    expect(consumirConsulta("pessoa-a", AGORA + 30).liberado).toBe(false)
    expect(consumirConsulta("pessoa-b", AGORA + 30).liberado).toBe(true)
  })
})
