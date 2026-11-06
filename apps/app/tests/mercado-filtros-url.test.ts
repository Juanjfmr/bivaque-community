import { describe, expect, it } from "vitest"

import {
  FILTROS_DA_URL_PADRAO,
  filtrosParaUrl,
  lerFiltrosDaUrl,
  mesclarFiltrosNaUrl,
  semAcento,
} from "@/src/mercado/filtros-url"

/**
 * A leitura/escrita de filtros na URL do Mercado (LAN-F06). O que importa:
 * link antigo com filtro é lido de verdade, valor torto não inventa filtro, e
 * filtro virando padrão some do endereço em vez de deixar `?=null` para trás.
 */

describe("lerFiltrosDaUrl", () => {
  it("sem busca são os padrões", () => {
    expect(lerFiltrosDaUrl({})).toEqual(FILTROS_DA_URL_PADRAO)
  })

  it("lê o link antigo de imóveis (q, tipo em inglês, quartos, valor_max em reais, página)", () => {
    const filtros = lerFiltrosDaUrl({
      q: "  vista pro rio ",
      tipo: "apartment",
      quartos: "2",
      valor_max: "4000",
      pagina: "3",
    })
    expect(filtros).toEqual({
      q: "vista pro rio",
      tipoImovel: "apartamento",
      quartos: 2,
      valorMaxReais: 4000,
      precoMinCents: null,
      precoMaxCents: null,
      pagina: 3,
    })
  })

  it("lê a faixa de preço do desapego em centavos, como a web antiga gravava", () => {
    const filtros = lerFiltrosDaUrl({ preco_min: "10000", preco_max: "99900" })
    expect(filtros.precoMinCents).toBe(10000)
    expect(filtros.precoMaxCents).toBe(99900)
  })

  it("casa na grafia da tela, e tipo desconhecido vira todos sem quebrar o resto", () => {
    expect(lerFiltrosDaUrl({ tipo: "casa", q: "x" }).tipoImovel).toBe("casa")
    expect(lerFiltrosDaUrl({ tipo: "studio", q: "x" })).toMatchObject({
      tipoImovel: "todos",
      q: "x",
    })
  })

  it.each([
    ["quartos torto", { quartos: "muitos" }, { quartos: 0 }],
    ["quartos negativo", { quartos: "-2" }, { quartos: 0 }],
    ["pagina zero", { pagina: "0" }, { pagina: 1 }],
    ["pagina textual", { pagina: "abc" }, { pagina: 1 }],
    [
      "valores já numéricos do parser do roteador",
      { quartos: 3, pagina: 2 },
      { quartos: 3, pagina: 2 },
    ],
    ["lista repetida (chave duplicada)", { q: ["mesa", "outra"] }, { q: "" }],
  ])("%s não inventa filtro", (_motivo, busca, esperado) => {
    expect(lerFiltrosDaUrl(busca)).toMatchObject(esperado)
  })
})

describe("escrever filtros na URL", () => {
  it("valores padrão viram remoção, não `null` literal", () => {
    expect(
      filtrosParaUrl({ q: "", tipoImovel: "todos", quartos: 0, valorMaxReais: null, pagina: 1 }),
    ).toEqual({ q: null, tipo: null, quartos: null, valor_max: null, pagina: null })
  })

  it("valores ativos viram as chaves dos links antigos", () => {
    expect(
      filtrosParaUrl({ q: "mesa", tipoImovel: "casa", quartos: 2, valorMaxReais: 4000, pagina: 2 }),
    ).toEqual({ q: "mesa", tipo: "casa", quartos: 2, valor_max: 4000, pagina: 2 })
  })

  it("merge grava o novo e apaga o que voltou ao padrão, preservando o resto", () => {
    const atual = { q: "mesa", tipo: "apartamento", preco_min: "10000" }
    expect(mesclarFiltrosNaUrl(atual, filtrosParaUrl({ tipoImovel: "todos", quartos: 3 }))).toEqual(
      {
        q: "mesa",
        preco_min: "10000",
        quartos: 3,
      },
    )
  })

  it("roda de volta o que escreveu", () => {
    const busca = mesclarFiltrosNaUrl({}, filtrosParaUrl({ q: "sofá", tipoImovel: "apartamento" }))
    expect(lerFiltrosDaUrl(busca)).toMatchObject({ q: "sofá", tipoImovel: "apartamento" })
  })
})

describe("semAcento", () => {
  it("casa busca sem depender de acento ou caixa", () => {
    expect(semAcento("Notebook 14 Polgadas")).toContain("polgadas")
    expect(semAcento("CASA")).toBe("casa")
  })
})
