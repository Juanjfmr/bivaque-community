import { describe, expect, it } from "vitest"

import { CATEGORIAS_DO_GUIA } from "@/lib/dados/guia"
import { filtrosDaUrl, LIMITE_DO_TERMO } from "@/src/guia/filtros-da-url"

/**
 * O recorte do Guia que chega pela URL (LAN-TROCA). O que importa: o link
 * `/guide?q=&categoria=` abre a mesma consulta no app, e o que a rota do
 * servidor recusaria (termo acima de 80) ou a tela não conhece (categoria fora
 * da lista) abre o Guia sem filtro, nunca num pedido inválido.
 */

describe("filtrosDaUrl", () => {
  it("lê o termo aparado e a categoria válida", () => {
    expect(filtrosDaUrl({ q: " hospital ", categoria: "hospital" })).toEqual({
      termo: "hospital",
      categoria: "hospital",
    })
  })

  it("sem parâmetro é o Guia sem filtro", () => {
    expect(filtrosDaUrl({})).toEqual({ termo: "", categoria: null })
  })

  it("todas as categorias do Guia passam", () => {
    for (const categoria of CATEGORIAS_DO_GUIA) {
      expect(filtrosDaUrl({ categoria }).categoria).toBe(categoria)
    }
  })

  it("um caractere já filtra, como a digitação no Guia", () => {
    expect(filtrosDaUrl({ q: "h" })).toEqual({ termo: "h", categoria: null })
  })

  it("aceita o termo no limite exato e recusa acima dele", () => {
    const noLimite = "a".repeat(LIMITE_DO_TERMO)
    expect(noLimite).toHaveLength(80)
    expect(filtrosDaUrl({ q: noLimite }).termo).toBe(noLimite)
    expect(filtrosDaUrl({ q: "a".repeat(LIMITE_DO_TERMO + 1) }).termo).toBe("")
  })

  it("categoria desconhecida abre o Guia sem filtro de categoria", () => {
    expect(filtrosDaUrl({ categoria: "banco" }).categoria).toBeNull()
    expect(filtrosDaUrl({ categoria: "" }).categoria).toBeNull()
    expect(filtrosDaUrl({ categoria: null }).categoria).toBeNull()
    expect(filtrosDaUrl({ categoria: ["school", "hospital"] }).categoria).toBeNull()
  })

  it("valor torto não vira termo nem quebra a tela", () => {
    expect(filtrosDaUrl({ q: 42 }).termo).toBe("")
    expect(filtrosDaUrl({ q: "" }).termo).toBe("")
    expect(filtrosDaUrl({ q: "   " }).termo).toBe("")
    expect(filtrosDaUrl({ q: null }).termo).toBe("")
  })

  it("o `locality` do guia antigo não é lido: a lista é a da cidade da sessão", () => {
    expect(filtrosDaUrl({ locality: "Manaus" })).toEqual({ termo: "", categoria: null })
  })
})
