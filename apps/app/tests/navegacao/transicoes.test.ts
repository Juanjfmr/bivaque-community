import { describe, expect, it } from "vitest"

import { descritorDaAcao, entradaPadrao } from "../../lib/navegacao/entrada"
import {
  abrirSobreposicao,
  definirFiltro,
  entrarEmRota,
  limparFiltro,
  voltar,
} from "../../lib/navegacao/transicoes"

const BASE = entradaPadrao({ origem: "inicio", pai: null, chave: "e-base" })

describe("transições de navegação", () => {
  it("abre uma rota nova guardando o pai e a origem como aba da tela atual", () => {
    const decisao = entrarEmRota({ atual: BASE, rotaAtual: "comunidade" })
    expect(decisao.replace).toBe(false)
    expect(decisao.entrada).toMatchObject({
      versao: 1,
      origem: "comunidade",
      pai: "comunidade",
      rolagem: 0,
      foco: null,
      filtros: {},
      sobreposicao: null,
    })
    expect(decisao.entrada.chave).not.toBe(BASE.chave)
  })

  it("mantém a origem herdada quando a tela atual não tem aba própria", () => {
    const emConversas = entradaPadrao({ origem: "voce", pai: "voce", chave: "e-conversas" })
    const decisao = entrarEmRota({ atual: emConversas, rotaAtual: "conversa" })
    expect(decisao.entrada.origem).toBe("voce")
    expect(decisao.entrada.pai).toBe("conversa")
  })

  it("substitui a entrada em vez de empilhar quando a sobreposição está aberta", () => {
    const comSobreposicao = abrirSobreposicao(BASE, "dialogo")
    expect(comSobreposicao.sobreposicao).toBe("dialogo")

    const decisao = entrarEmRota({ atual: comSobreposicao, rotaAtual: "inicio" })
    expect(decisao.replace).toBe(true)
    expect(decisao.entrada.sobreposicao).toBeNull()
  })

  it("abre a sobreposição como entrada própria, com identidade nova", () => {
    const comFoco = { ...BASE, foco: descritorDaAcao("abrir-dialogo", "prova") }
    const aberta = abrirSobreposicao(comFoco, "folha")
    expect(aberta.sobreposicao).toBe("folha")
    expect(aberta.foco).toEqual(comFoco.foco)
    expect(aberta.chave).not.toBe(comFoco.chave)
    expect(aberta.rolagem).toBe(comFoco.rolagem)
  })

  it("troca filtro sem criar entrada e limpa o que foi escolhido", () => {
    const comFiltro = definirFiltro(BASE, "ordenacao", "preco-baixo")
    expect(comFiltro.filtros).toEqual({ ordenacao: "preco-baixo" })
    expect(comFiltro.chave).toBe(BASE.chave)
    expect(comFiltro.rolagem).toBe(BASE.rolagem)
    expect(limparFiltro(comFiltro, "ordenacao").filtros).toEqual({})
    expect(limparFiltro(comFiltro, "inexistente").filtros).toEqual({ ordenacao: "preco-baixo" })
  })

  it("fecha a sobreposição antes de trocar de rota quando a pessoa volta", () => {
    const comSobreposicao = abrirSobreposicao(BASE, "menu-criar")
    expect(voltar(comSobreposicao, "inicio")).toEqual({ popar: true, nome: null })
  })

  it("volta pelo histórico quando a entrada tem pai, e ao pai declarado sem pai", () => {
    const comPai = { ...BASE, pai: "comunidade" }
    expect(voltar(comPai, "inicio")).toEqual({ popar: true, nome: null })
    expect(voltar(BASE, "inicio")).toEqual({ popar: false, nome: "inicio" })
    expect(voltar(BASE, null)).toEqual({ popar: false, nome: null })
  })
})
