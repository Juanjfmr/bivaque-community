import { describe, expect, it } from "vitest"

import {
  acoesDaBarraDoTopo,
  criaVisivel,
  mostraFaixaDeVisita,
  navegacaoVisivel,
  textoDaFaixaDeVisita,
} from "../lib/casca"

// Cada linha cita o item do inventário §5 que ela mede.
describe("barra do topo por rota (§5.2, §5.3)", () => {
  it("nas raízes mostra a marca; nas demais, a volta e o título", () => {
    for (const raiz of ["inicio", "comunidade", "conversas", "voce"]) {
      const acoes = acoesDaBarraDoTopo(raiz)
      expect(acoes.marca, raiz).toBe(true)
      expect(acoes.voltar, raiz).toBe(false)
      expect(acoes.raiz, raiz).toBe(true)
    }
    for (const interna of ["anuncio", "pergunta", "salvos", "grupo"]) {
      const acoes = acoesDaBarraDoTopo(interna)
      expect(acoes.marca, interna).toBe(false)
      expect(acoes.voltar, interna).toBe(true)
      expect(acoes.raiz, interna).toBe(false)
    }
  })

  it("os avisos com contador só existem na Início (§5.2)", () => {
    expect(acoesDaBarraDoTopo("inicio").avisos).toBe(true)
    for (const outra of ["comunidade", "conversas", "voce", "mercado", "salvos"]) {
      expect(acoesDaBarraDoTopo(outra).avisos, outra).toBe(false)
    }
  })

  it("as conversas ficam no topo e nunca na barra de baixo (§3.1 do ADR)", () => {
    for (const nome of ["inicio", "comunidade", "voce", "salvos", "anuncio"]) {
      expect(acoesDaBarraDoTopo(nome).conversas, nome).toBe(true)
    }
  })

  it("a busca em tela cheia toma a barra só na rota busca (§5.2)", () => {
    expect(acoesDaBarraDoTopo("busca").buscaEmTelaCheia).toBe(true)
    expect(acoesDaBarraDoTopo("busca").busca).toBe(false)
    expect(acoesDaBarraDoTopo("salvos").buscaEmTelaCheia).toBe(false)
    expect(acoesDaBarraDoTopo("salvos").busca).toBe(true)
  })

  it("a entrada e o painel do dono não têm barra do app (§5, tabela final)", () => {
    expect(acoesDaBarraDoTopo("entrar").barra).toBe(false)
    expect(acoesDaBarraDoTopo("dono").barra).toBe(false)
    expect(acoesDaBarraDoTopo("inicio").barra).toBe(true)
  })
})

describe("barra de baixo e Criar (§5.3)", () => {
  it("no celular a barra de baixo só existe nas rotas-raiz", () => {
    expect(navegacaoVisivel("inicio", 375)).toBe(true)
    expect(navegacaoVisivel("salvos", 375)).toBe(false)
    // Acima de 720 px a navegação nunca some: vira a coluna da esquerda.
    expect(navegacaoVisivel("salvos", 768)).toBe(true)
    expect(navegacaoVisivel("salvos", 1440)).toBe(true)
  })

  it("o Criar acompanha a barra de baixo", () => {
    expect(criaVisivel("inicio", 375)).toBe(true)
    expect(criaVisivel("pergunta", 375)).toBe(false)
    expect(criaVisivel("pergunta", 1024)).toBe(true)
  })
})

describe("faixa de visita (§5.2)", () => {
  it("só existe olhando outra cidade", () => {
    expect(mostraFaixaDeVisita(false)).toBe(false)
    expect(mostraFaixaDeVisita(true)).toBe(true)
  })

  it("diz o que está vendo e qual é a cidade da pessoa", () => {
    const texto = textoDaFaixaDeVisita("Recife", "Manaus")
    expect(texto).toContain("Recife")
    expect(texto).toContain("Manaus")
  })
})
