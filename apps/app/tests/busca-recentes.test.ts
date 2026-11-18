import { describe, expect, it } from "vitest"

import { LIMITE_DE_RECENTES, lerRecentes, registrarRecente } from "@/src/busca/recentes"

/**
 * As buscas recentes do estado de primeira entrada (parecer cego de 12/11).
 *
 * O que se prova: só existe registro real (vazio quando ninguém buscou), o termo
 * novo vai para o topo, repetir não duplica, a lista respeita o limite e um
 * aparelho sem armazenamento ou com lixo guardado não quebra a tela.
 */

function armazenamento(inicial: Record<string, string> = {}): Storage {
  const dados = new Map(Object.entries(inicial))
  return {
    get length() {
      return dados.size
    },
    clear: () => dados.clear(),
    getItem: (chave: string) => dados.get(chave) ?? null,
    key: (indice: number) => [...dados.keys()][indice] ?? null,
    removeItem: (chave: string) => dados.delete(chave),
    setItem: (chave: string, valor: string) => dados.set(chave, valor),
  }
}

describe("buscas recentes", () => {
  it("sem registro nenhum, a lista é vazia", () => {
    expect(lerRecentes(armazenamento())).toEqual([])
  })

  it("grava o termo aparado no topo e lê de volta", () => {
    const local = armazenamento()
    expect(registrarRecente("  berço ", local)).toEqual(["berço"])
    expect(lerRecentes(local)).toEqual(["berço"])
  })

  it("repetir o mesmo termo não duplica e muda a caixa", () => {
    const local = armazenamento()
    registrarRecente("Berço", local)
    registrarRecente("mudança", local)
    expect(registrarRecente("berço", local)).toEqual(["berço", "mudança"])
  })

  it("respeita o limite, descartando o mais antigo", () => {
    const local = armazenamento()
    for (const termo of ["um", "dois", "três", "quatro", "cinco", "seis"]) {
      registrarRecente(termo, local)
    }
    const lidos = lerRecentes(local)
    expect(lidos).toHaveLength(LIMITE_DE_RECENTES)
    expect(lidos[0]).toBe("seis")
    expect(lidos).not.toContain("um")
  })

  it("lixo guardado vira lista vazia em vez de quebrar a tela", () => {
    expect(lerRecentes(armazenamento({ "bivaque:buscas-recentes": "{" }))).toEqual([])
    expect(lerRecentes(armazenamento({ "bivaque:buscas-recentes": '[1,null,"ok"]' }))).toEqual([
      "ok",
    ])
  })

  it("aparelho sem armazenamento não perde a busca", () => {
    expect(lerRecentes(null)).toEqual([])
    expect(registrarRecente("berço", null)).toEqual([])
    expect(registrarRecente("   ", armazenamento())).toEqual([])
  })
})
