import { describe, expect, it } from "vitest"

import {
  cursorDaEntrada,
  ehCategoriaDoGuia,
  lerCursor,
  sugestaoDoCorpo,
  termoAceito,
  termoDeBusca,
} from "web/lib/guide/app-guia"

describe("busca do guia", () => {
  it("mantém o texto da pessoa e tira a sintaxe do filtro", () => {
    expect(termoDeBusca("  escola modelo  ")).toBe("escola modelo")
    expect(termoDeBusca("escola, (92) 100% *")).toBe("escola 92 100")
    expect(termoDeBusca('a"b\\c')).toBe("a b c")
    expect(termoDeBusca(null)).toBe("")
    expect(termoDeBusca("   ")).toBe("")
  })

  it("termo acima do teto é pedido inválido, não corte silencioso", () => {
    expect(termoAceito("a".repeat(80))).toBe(true)
    expect(termoAceito("a".repeat(81))).toBe(false)
    expect(termoAceito(null)).toBe(true)
  })
})

describe("cursor do diretório", () => {
  it("ida e volta sem perder o nome com barra", () => {
    const cursor = cursorDaEntrada("Escola | Centro", "a0000000-0000-4000-8000-000000000001")
    expect(lerCursor(cursor)).toEqual({
      nome: "Escola | Centro",
      id: "a0000000-0000-4000-8000-000000000001",
    })
  })

  it("recusa cursor sem id, id fora do formato ou nome vazio", () => {
    expect(lerCursor("sem-separador")).toBeNull()
    expect(lerCursor("|a0000000-0000-4000-8000-000000000001")).toBeNull()
    expect(lerCursor("Escola|x")).toBeNull()
  })
})

describe("categoria e sugestão", () => {
  it("só aceita as quatro categorias do enum", () => {
    expect(ehCategoriaDoGuia("school")).toBe(true)
    expect(ehCategoriaDoGuia("padaria")).toBe(false)
    expect(ehCategoriaDoGuia("")).toBe(false)
  })

  it("normaliza a sugestão e recusa corpo torto", () => {
    expect(sugestaoDoCorpo({ descricao: "  O telefone mudou.  " })).toEqual({
      descricao: "O telefone mudou.",
      referencia: null,
    })
    expect(sugestaoDoCorpo({ descricao: "Mudou.", referencia: "  balcão  " })).toEqual({
      descricao: "Mudou.",
      referencia: "balcão",
    })
    expect(sugestaoDoCorpo({ descricao: "" })).toBeNull()
    expect(sugestaoDoCorpo({ descricao: "a".repeat(2001) })).toBeNull()
    expect(sugestaoDoCorpo({ descricao: "Mudou.", referencia: 7 })).toBeNull()
    expect(sugestaoDoCorpo({ descricao: "Mudou.", referencia: "a".repeat(501) })).toBeNull()
  })
})
