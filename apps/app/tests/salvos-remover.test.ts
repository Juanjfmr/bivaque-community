import type { SetStateAction } from "react"
import { describe, expect, it } from "vitest"

import { criarAcaoOtimista } from "../lib/acao-otimista"
import { removerDosSalvos } from "../src/telas/Salvos"

/**
 * O toque repetido em "remover dos salvos" (H1 do lote NAV-001): o segundo
 * toque durante a gravação não pode cair no caminho de sucesso — sem confirmar a
 * remoção, sem tirar o item de novo e sem anunciar "Removido dos salvos.".
 */

type Item = { id: string }

function listaDe(itens: readonly Item[]) {
  let atual: readonly Item[] | null = itens
  return {
    lista: itens,
    definir: (mudanca: SetStateAction<readonly Item[] | null>) => {
      atual = typeof mudanca === "function" ? mudanca(atual) : mudanca
    },
    agora: () => atual,
  }
}

describe("remover dos salvos — toque repetido durante a gravação", () => {
  it("o segundo toque não confirma, não tira de novo e não anuncia remoção", async () => {
    const acao = criarAcaoOtimista()
    const avisos: string[] = []
    const segurou: string[] = []
    const confirmou: string[] = []
    const { lista, definir, agora } = listaDe([{ id: "a-1" }, { id: "a-2" }])

    let liberar: (falha?: unknown) => void = () => {}
    const gravar = () =>
      new Promise<unknown>((resolver, rejeitar) => {
        liberar = (falha) => (falha === undefined ? resolver("ok") : rejeitar(falha))
      })

    const dependencias = {
      acao,
      avisos: { mostrar: (texto: string) => avisos.push(texto) },
      id: "a-1",
      lista,
      definir,
      gravar,
      repor: async () => {},
      segurar: () => segurou.push("a-1"),
      largar: () => {},
      confirmar: () => confirmou.push("a-1"),
      aoRemovendo: () => {},
      aoRecusar: () => {},
    }

    const primeiro = removerDosSalvos(dependencias)
    // Antes da resposta: o item já saiu da tela, mas nada foi confirmado.
    expect(agora()?.map((item) => item.id)).toEqual(["a-2"])
    expect(avisos).toEqual([])
    expect(confirmou).toEqual([])

    await removerDosSalvos(dependencias)
    expect(segurou).toEqual(["a-1"])
    expect(avisos).toEqual([])
    expect(confirmou).toEqual([])
    expect(agora()?.map((item) => item.id)).toEqual(["a-2"])

    liberar()
    await primeiro
    expect(avisos).toEqual(["Removido dos salvos."])
    expect(confirmou).toEqual(["a-1"])
    expect(agora()?.map((item) => item.id)).toEqual(["a-2"])
  })
})
