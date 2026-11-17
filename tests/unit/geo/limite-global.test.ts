import { beforeEach, describe, expect, it } from "vitest"

// SEC-016 — o teto GLOBAL da geocodificação (300 consultas reais por hora no
// processo), somado ao teto por pessoa. A janela vive no módulo: cada caso zera
// antes, e os horários entram sempre em ordem crescente.
import {
  consumirConsulta,
  JANELA_MS,
  reiniciarJanelasParaTeste,
  TETO_GLOBAL,
  TETO_POR_PESSOA,
} from "web/lib/geo/limite"

const AGORA = 1_800_000_000_000

beforeEach(() => {
  reiniciarJanelasParaTeste()
})

describe("teto global de consultas ao provedor", () => {
  it("esgotado o teto do processo, uma pessoa nova é recusada; passada a hora, libera", () => {
    for (let indice = 0; indice < TETO_GLOBAL; indice++) {
      expect(consumirConsulta(`global-${indice}`, AGORA + indice).liberado).toBe(true)
    }

    const recusa = consumirConsulta("pessoa-nova", AGORA + TETO_GLOBAL)
    expect(recusa.liberado).toBe(false)
    if (recusa.liberado) throw new Error("esperava recusa")
    expect(recusa.esperarMs).toBeGreaterThan(0)
    expect(recusa.esperarMs).toBeLessThanOrEqual(JANELA_MS)

    // Janela deslizante: a primeira consulta saiu da hora, o processo respira.
    expect(consumirConsulta("pessoa-nova", AGORA + JANELA_MS + 1).liberado).toBe(true)
  })

  it("quem é barrado pelo teto global não gasta a cota dele", () => {
    const pessoa = "pessoa-com-quase-toda-a-cota"
    // A enchente do processo entra primeiro (mais cedo), e a cota da pessoa
    // depois: assim a ordem dos horários é crescente e, uma hora adiante, só as
    // consultas da pessoa continuam dentro da janela.
    for (let indice = 0; indice < TETO_GLOBAL - (TETO_POR_PESSOA - 1); indice++) {
      expect(consumirConsulta(`enchente-${indice}`, AGORA).liberado).toBe(true)
    }
    for (let indice = 0; indice < TETO_POR_PESSOA - 1; indice++) {
      expect(consumirConsulta(pessoa, AGORA + 1_000 + indice).liberado).toBe(true)
    }

    expect(consumirConsulta(pessoa, AGORA + 2_000).liberado).toBe(false)

    // As entradas que encheram o processo já saíram da janela; as da pessoa não.
    expect(consumirConsulta(pessoa, AGORA + JANELA_MS + 1).liberado).toBe(true)
    // E o teto por pessoa continua valendo, inteiro: a recusa global não gastou nada.
    expect(consumirConsulta(pessoa, AGORA + JANELA_MS + 2).liberado).toBe(false)
  })
})
