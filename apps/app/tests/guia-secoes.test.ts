import { describe, expect, it } from "vitest"

import { SECOES, secaoNaLinha } from "@/src/guia/secoes"

/**
 * A estrutura editorial do Guia: as seções que o cabeçalho fixo anuncia e a
 * regra que escolhe qual delas está em leitura. A troca de seção é o que faz a
 * barra acompanhar a rolagem, então a regra é medida aqui, sem DOM, e o
 * comportamento real fica no e2e.
 */

describe("estrutura do Guia", () => {
  it("tem de 3 a 4 seções, com âncora própria e título", () => {
    expect(SECOES.length).toBeGreaterThanOrEqual(3)
    expect(SECOES.length).toBeLessThanOrEqual(4)

    const ids = SECOES.map((secao) => secao.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const secao of SECOES) {
      expect(secao.id).toMatch(/^[a-z][a-z-]*$/)
      expect(secao.titulo.trim()).not.toBe("")
      // A âncora curta é o que cabe numa linha no 375 com as quatro juntas.
      expect(secao.curto.trim()).not.toBe("")
      expect(secao.curto.length).toBeLessThanOrEqual(12)
    }
  })

  it("distribui todo passo do roteiro por uma seção, uma vez só", () => {
    const titulos = SECOES.flatMap((secao) => secao.passos.map((passo) => passo.titulo))
    expect(titulos).toHaveLength(5)
    expect(new Set(titulos).size).toBe(5)
    for (const titulo of titulos) expect(titulo).toMatch(/^\d\. /)
  })
})

describe("seção em leitura", () => {
  const topos = [
    { id: "chegada", topo: -600 },
    { id: "rotina", topo: -120 },
    { id: "referencias", topo: 240 },
    { id: "contribuir", topo: 900 },
  ]

  it("escolhe a última seção que passou da linha, e não a primeira visível", () => {
    expect(secaoNaLinha(topos, 300)).toBe("referencias")
    expect(secaoNaLinha(topos, 200)).toBe("rotina")
    expect(secaoNaLinha(topos, 1000)).toBe("contribuir")
  })

  it("no topo da tela anuncia a primeira seção", () => {
    const inicio = topos.map((medido, indice) => ({ ...medido, topo: 120 + indice * 400 }))
    expect(secaoNaLinha(inicio, 100)).toBe("chegada")
  })

  it("sem seção medida não anuncia nada", () => {
    expect(secaoNaLinha([], 200)).toBe("")
  })
})
