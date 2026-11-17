import { describe, expect, it } from "vitest"

// SEC-016 — o teto GLOBAL da geocodificação (300 consultas reais por hora no
// processo), somado ao teto por pessoa. Arquivo próprio porque a janela vive no
// módulo: encher os 300 aqui contaminaria os testes por pessoa do outro arquivo.
import { consumirConsulta, JANELA_MS, TETO_GLOBAL, TETO_POR_PESSOA } from "web/lib/geo/limite"

const AGORA = 1_800_000_000_000

describe("teto global de consultas ao provedor", () => {
  it("esgotado o teto do processo, uma pessoa nova é recusada; passada a hora, libera", () => {
    for (let indice = 0; indice < TETO_GLOBAL; indice++) {
      expect(consumirConsulta(`global-${indice}`, AGORA).liberado).toBe(true)
    }

    const recusa = consumirConsulta("pessoa-nova", AGORA + 1)
    expect(recusa.liberado).toBe(false)
    if (recusa.liberado) throw new Error("esperava recusa")
    expect(recusa.esperarMs).toBeGreaterThan(0)
    expect(recusa.esperarMs).toBeLessThanOrEqual(JANELA_MS)

    // Janela deslizante: a hora passou, o processo respira de novo.
    expect(consumirConsulta("pessoa-nova", AGORA + JANELA_MS + 1).liberado).toBe(true)
  })

  it("quem é barrado pelo teto global não gasta a cota dele", () => {
    const T = AGORA + 10 * JANELA_MS
    const pessoa = "pessoa-com-quase-toda-a-cota"
    // Nove a menos do que o teto por pessoa — depois do alívio global, ainda
    // resta quinhão, e é isso que mostra que a recusa global não consumiu nada.
    for (let indice = 0; indice < TETO_POR_PESSOA - 1; indice++) {
      expect(consumirConsulta(pessoa, T + 5_000).liberado).toBe(true)
    }
    // O processo enche no instante T (mais cedo que a cota acima, então ela
    // continua dentro da janela quando o global aliviar).
    for (let indice = 0; indice < TETO_GLOBAL - (TETO_POR_PESSOA - 1); indice++) {
      expect(consumirConsulta(`enchente-${indice}`, T).liberado).toBe(true)
    }

    expect(consumirConsulta(pessoa, T + 5_001).liberado).toBe(false)

    // As entradas que encheram o processo já saíram da janela; as da pessoa não.
    expect(consumirConsulta(pessoa, T + JANELA_MS + 1).liberado).toBe(true)
    // E o teto por pessoa continua valendo, inteiro.
    expect(consumirConsulta(pessoa, T + JANELA_MS + 2).liberado).toBe(false)
  })
})
