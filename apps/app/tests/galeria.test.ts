import { describe, expect, it } from "vitest"

import { ITENS_DA_GALERIA, idsDaGaleria, MOVIMENTOS } from "../lib/galeria"

// A lista dos 52 componentes da seção 7 do inventário, copiada para o teste de
// propósito: ela é a régua, não a saída do app. O teste não pergunta ao app
// quantos itens ele tem; ele exige um id por linha do inventário.
const IDS_DA_SECAO_7: readonly string[] = [
  // primitivos (shell/primitives.js)
  "imagem-do-asset",
  "capa",
  "botao",
  "botao-de-icone",
  "selecao",
  "campo",
  "etiqueta",
  "titulo-de-secao",
  "arte-vazia",
  "estado-vazio",
  "cartao-de-foto",
  "cartao-de-negocio",
  "linha-de-pergunta",
  "linha-de-encontro",
  // helpers puros (utilities/format.js)
  "sem-ponteiro-de-dom",
  "sem-escape-manual",
  "texto-normalizado",
  "icone",
  "marca",
  "moeda",
  "id-local",
  "data-iso",
  "rotulo-de-data",
  "dias-ate",
  "iniciais",
  // shell de estado
  "lista-paginada",
  "pe-de-lista",
  "fim-de-lista",
  "chips-de-filtro",
  "indicador-de-segmento",
  "sobreposicao",
  "fechar-sobreposicao",
  "guarda-de-edicao",
  "confirmacao",
  "historico-da-sobreposicao",
  "aviso",
  "selo-verificado",
  "explicacao-do-selo",
  "contagem-animada",
  // padrões de view
  "cabeca-de-pagina",
  "secao",
  "grade",
  "lista",
  "cartao-de-publicacao",
  "linha-de-ajuste",
  "faixa-de-visita",
  "fim-de-bloco",
  "chips",
  "avatar",
  "menu-de-linha",
  "acoes-do-detalhe",
  "esqueleto",
]

describe("galeria de prova: a régua da seção 7", () => {
  it("cobre as 52 linhas do inventário, uma por id", () => {
    expect(IDS_DA_SECAO_7.length).toBe(52)
    expect(new Set(IDS_DA_SECAO_7).size).toBe(52)
    expect([...idsDaGaleria()].sort()).toEqual([...IDS_DA_SECAO_7].sort())
  })

  it("cada item diz o que entrega e quem ainda vai consumi-lo", () => {
    for (const item of ITENS_DA_GALERIA) {
      expect(item.id, item.id).not.toBe("")
      expect(item.titulo, item.id).not.toBe("")
      expect(item.regra, item.id).not.toBe("")
      expect(item.consumidor, item.id).not.toBe("")
    }
  })

  it("marca os itens que ainda não têm consumidor de produto", () => {
    const futuros = ITENS_DA_GALERIA.filter((item) => item.consumidor.startsWith("onda "))
    expect(futuros.length).toBeGreaterThan(0)
    for (const item of futuros) {
      expect(item.regra, item.id).not.toBe("")
    }
  })
})

describe("galeria de prova: a régua da seção 6", () => {
  it("cobre os 40 movimentos, um por número", () => {
    expect(MOVIMENTOS.length).toBe(40)
    expect(new Set(MOVIMENTOS.map((movimento) => movimento.numero)).size).toBe(40)
    expect(MOVIMENTOS.map((movimento) => movimento.numero)).toEqual(
      Array.from({ length: 40 }, (_, indice) => indice + 1),
    )
  })

  it("cada movimento diz onde vive agora ou quem o consome depois", () => {
    for (const movimento of MOVIMENTOS) {
      expect(movimento.nome, `movimento ${movimento.numero}`).not.toBe("")
      expect(movimento.ondeVive, `movimento ${movimento.numero}`).not.toBe("")
      expect(movimento.consumidor, `movimento ${movimento.numero}`).not.toBe("")
    }
  })

  it("não declara entregue o que depende de onda futura", () => {
    const entregues = MOVIMENTOS.filter((movimento) => movimento.consumidor === "casca 1c")
    const futuros = MOVIMENTOS.filter((movimento) => movimento.consumidor.startsWith("onda "))
    expect(entregues.length + futuros.length).toBe(40)
  })
})
