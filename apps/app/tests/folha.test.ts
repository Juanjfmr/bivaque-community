import { describe, expect, it } from "vitest"

import {
  animacaoDaFolha,
  comecaArrasto,
  deslocamentoVisivel,
  duracaoDaAbertura,
  duracaoDoRetorno,
  fechaAoSoltar,
  GESTO_DA_FOLHA,
  transicaoDoRetorno,
} from "../src/pecas/gesto-da-folha"

describe("Folha — arrasto", () => {
  it("o arrasto cancelado volta ao lugar, sem fechar", () => {
    expect(fechaAoSoltar(40, 0.1)).toBe(false)
    expect(GESTO_DA_FOLHA.limiteParaFechar).toBe(96)
    // A volta assenta em `slow` (240 ms) e não fica sem transição.
    expect(duracaoDoRetorno(false)).toBe(240)
    expect(transicaoDoRetorno(false)).toContain("240ms")
    expect(transicaoDoRetorno(false)).toContain(GESTO_DA_FOLHA.curva)
  })

  it("o arrasto longo fecha", () => {
    expect(fechaAoSoltar(97, 0)).toBe(true)
    expect(fechaAoSoltar(200, 0)).toBe(true)
  })

  it("um gesto curto e rápido também fecha; um curto e lento, não", () => {
    expect(fechaAoSoltar(40, 0.6)).toBe(true)
    expect(fechaAoSoltar(40, 0.2)).toBe(false)
    expect(fechaAoSoltar(20, 2)).toBe(false)
  })

  it("só arrasta quando o conteúdo está no início", () => {
    expect(comecaArrasto(0)).toBe(true)
    expect(comecaArrasto(10)).toBe(false)
  })

  it("arrastar para cima não levanta a folha", () => {
    expect(deslocamentoVisivel(-30)).toBe(0)
    expect(deslocamentoVisivel(30)).toBe(30)
  })
})

describe("Folha — movimento reduzido", () => {
  it("abre e fecha só com opacidade de até 120 ms, sem deslocamento", () => {
    expect(animacaoDaFolha(true)).toBe("esmaece")
    expect(duracaoDaAbertura(true)).toBe(120)
    expect(duracaoDaAbertura(true)).toBeLessThanOrEqual(120)
    // Sem animação de volta: o lugar é recuperado na hora.
    expect(duracaoDoRetorno(true)).toBe(0)
    expect(transicaoDoRetorno(true)).toBe("none")
  })

  it("sem o pedido, a Folha desliza com a entrada de sempre", () => {
    expect(animacaoDaFolha(false)).toBe("desliza")
    expect(duracaoDaAbertura(false)).toBe(GESTO_DA_FOLHA.duracaoDaEntrada)
  })
})
