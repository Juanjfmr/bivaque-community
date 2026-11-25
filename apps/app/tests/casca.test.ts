import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  acoesDaBarraDoTopo,
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
    // A barra inferior só some em rotas internas abaixo do rail de 1024 px.
    expect(navegacaoVisivel("salvos", 768)).toBe(false)
    expect(navegacaoVisivel("salvos", 1023)).toBe(false)
    expect(navegacaoVisivel("salvos", 1024)).toBe(true)
    expect(navegacaoVisivel("salvos", 1440)).toBe(true)
  })

  // Rodada 3, L3: o Criar não tem regra própria de visibilidade — ele mora
  // dentro da barra e some só quando ela some inteira. A prova é a fonte: um
  // Criar condicional ou a grade de quatro colunas voltariam a abrir o vão.
  it("o Criar é incondicional dentro da barra e não há grade de quatro células", () => {
    const raiz = join(import.meta.dirname, "..", "src")
    const barra = readFileSync(join(raiz, "casca", "NavegacaoPrincipal.tsx"), "utf8")
    const estilos = readFileSync(join(raiz, "styles.css"), "utf8")
    expect(barra).toMatch(/^ {6}<button\s+type="button"\s+data-acao="criar"/m)
    expect(barra).not.toContain("data-criar-visivel")
    expect(estilos).not.toContain("data-criar-visivel")
  })

  it("nas telas das cinco posições da barra a barra e o Criar aparecem (REGUA-003)", () => {
    for (const largura of [375, 768]) {
      for (const aba of ["inicio", "comunidade", "conversas", "mercado", "voce"]) {
        expect(navegacaoVisivel(aba, largura), `${aba} em ${largura}`).toBe(true)
      }
    }
  })

  it("fora das raízes, no celular, a barra some inteira — sem célula vazia", () => {
    for (const rota of ["avisos", "salvos", "anuncio", "conversa"]) {
      expect(navegacaoVisivel(rota, 375), rota).toBe(false)
    }
  })

  it("a barra de baixo some nas telas internas até 1023 e volta como trilho em 1024", () => {
    expect(navegacaoVisivel("pergunta", 375)).toBe(false)
    expect(navegacaoVisivel("pergunta", 768)).toBe(false)
    expect(navegacaoVisivel("pergunta", 1024)).toBe(true)
  })
})

describe("faixa de visita (§5.2)", () => {
  it("só existe olhando outra cidade", () => {
    expect(mostraFaixaDeVisita(false, "Rio de Janeiro")).toBe(false)
    expect(mostraFaixaDeVisita(true, "Rio de Janeiro")).toBe(true)
    expect(mostraFaixaDeVisita(true, "")).toBe(false)
  })

  it("diz o que está vendo e qual é a cidade da pessoa", () => {
    const texto = textoDaFaixaDeVisita("Recife", "Manaus")
    expect(texto).toContain("Recife")
    expect(texto).toContain("Manaus")
  })
})
