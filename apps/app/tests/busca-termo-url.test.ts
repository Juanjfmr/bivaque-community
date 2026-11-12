import { describe, expect, it } from "vitest"

import { LIMITE_DO_TERMO, termoAceito, termoDaUrl } from "@/src/busca/termo-url"

/**
 * O termo que chega pela URL da busca (LAN-TROCA). O que importa: o link antigo
 * de `/explorar/busca?q=` abre a mesma consulta no app, e o que a rota do
 * servidor recusaria (vazio, um caractere, sem letra nem número, acima de 100)
 * não é pedido — a tela abre no estado vazio honesto.
 */

describe("termoAceito", () => {
  it("aceita o termo aparado com 2+ letras ou números", () => {
    expect(termoAceito("  ipiranga ")).toBe("ipiranga")
    expect(termoAceito("b9")).toBe("b9")
    expect(termoAceito("zona leste")).toBe("zona leste")
  })

  it("recusa o que a rota recusaria", () => {
    expect(termoAceito("")).toBeNull()
    expect(termoAceito("   ")).toBeNull()
    expect(termoAceito(" x ")).toBeNull()
    expect(termoAceito("?!")).toBeNull()
    expect(termoAceito("a".repeat(LIMITE_DO_TERMO + 1))).toBeNull()
    // Caractere de controle no meio: a rota responde 400 (termoValido).
    expect(termoAceito("a\tb2")).toBeNull()
    expect(termoAceito("ab\u007f")).toBeNull()
    expect(termoDaUrl({ q: "ipi\u0000ranga" })).toBe("")
  })

  it("aceita o termo no limite exato da rota", () => {
    const noLimite = "ab".repeat(LIMITE_DO_TERMO / 2)
    expect(noLimite).toHaveLength(LIMITE_DO_TERMO)
    expect(termoAceito(noLimite)).toBe(noLimite)
  })
})

describe("termoDaUrl", () => {
  it("sem o parâmetro é o estado vazio", () => {
    expect(termoDaUrl({})).toBe("")
  })

  it("lê o `q` com espaço em volta e letra maiúscula", () => {
    expect(termoDaUrl({ q: " Ipiranga " })).toBe("Ipiranga")
  })

  it("lê a grafia antiga `search` quando não há `q`", () => {
    expect(termoDaUrl({ search: "ipiranga" })).toBe("ipiranga")
  })

  it("`q` vence `search`, como no servidor", () => {
    expect(termoDaUrl({ q: "ipiranga", search: "outro" })).toBe("ipiranga")
  })

  it("valor torto não vira termo nem quebra a tela", () => {
    expect(termoDaUrl({ q: 42 })).toBe("")
    expect(termoDaUrl({ q: "" })).toBe("")
    expect(termoDaUrl({ q: "   " })).toBe("")
    expect(termoDaUrl({ q: "a" })).toBe("")
    expect(termoDaUrl({ q: "a".repeat(LIMITE_DO_TERMO + 1) })).toBe("")
    expect(termoDaUrl({ q: null })).toBe("")
    expect(termoDaUrl({ q: ["ipiranga", "outro"] })).toBe("")
  })
})
