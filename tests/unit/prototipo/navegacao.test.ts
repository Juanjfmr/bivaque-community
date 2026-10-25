import { describe, expect, it } from "vitest"
import {
  ABAS,
  abaAtiva,
  abaDaComunidade,
  hrefDaComunidade,
} from "../../../apps/prototipo/lib/navegacao"

// PROTO-001 — a aba ativa sai do endereço. Estes casos são a regra que o
// protótipo antigo resolvia por estado do histórico (`shell/navigation.js`,
// activeTab) e que aqui é decidida só pelo caminho.

describe("abaAtiva", () => {
  it("acende cada aba principal pela própria rota", () => {
    expect(abaAtiva("/inicio")).toBe("inicio")
    expect(abaAtiva("/comunidade")).toBe("comunidade")
    expect(abaAtiva("/conversas")).toBe("conversas")
    expect(abaAtiva("/voce")).toBe("voce")
  })

  it("acende Comunidade no detalhe da pergunta e nas minhas", () => {
    expect(abaAtiva("/comunidade/pergunta/a7")).toBe("comunidade")
    expect(abaAtiva("/minhas")).toBe("comunidade")
  })

  it("não acende nada pela raiz nem por um caminho desconhecido", () => {
    expect(abaAtiva("/")).toBe("inicio")
    expect(abaAtiva("/qualquer-coisa")).toBe("inicio")
    // "/comunidade-antiga" não é filho de "/comunidade"
    expect(abaAtiva("/comunidade-antiga")).toBe("inicio")
  })

  it("ignora barra final, consulta e fragmento", () => {
    expect(abaAtiva("/comunidade/")).toBe("comunidade")
    expect(abaAtiva("/comunidade?aba=grupos")).toBe("comunidade")
    expect(abaAtiva("/conversas#topo")).toBe("conversas")
  })

  it("a barra tem as quatro abas, na ordem do protótipo", () => {
    expect(ABAS.map((aba) => aba.id)).toEqual(["inicio", "comunidade", "conversas", "voce"])
    expect(ABAS.map((aba) => aba.href)).toEqual(["/inicio", "/comunidade", "/conversas", "/voce"])
  })
})

describe("aba da comunidade", () => {
  it("Indicações é o padrão; Grupos vem do endereço", () => {
    expect(abaDaComunidade(null)).toBe("indicacoes")
    expect(abaDaComunidade("")).toBe("indicacoes")
    expect(abaDaComunidade("outra")).toBe("indicacoes")
    expect(abaDaComunidade("grupos")).toBe("grupos")
  })

  it("o link de cada aba aponta para o endereço que a acende", () => {
    expect(hrefDaComunidade("indicacoes")).toBe("/comunidade")
    expect(hrefDaComunidade("grupos")).toBe("/comunidade?aba=grupos")
    expect(abaAtiva(hrefDaComunidade("grupos"))).toBe("comunidade")
  })
})
