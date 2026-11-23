import { createElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Desapego } from "@/src/criar/Desapego"
import { Perguntar } from "@/src/criar/Perguntar"

/**
 * BUGCID-001: a cidade da casca chega depois. Enquanto ela não chegou a chave do
 * rascunho é vazia; ler ali não acha nada e o efeito de guardar regravaria esse
 * vazio por cima do rascunho da cidade quando a chave mudasse — o texto salvo
 * sumia. Aqui se mede a montagem: sem cidade o formulário nem nasce; com a
 * cidade, o rascunho salvo é o que aparece.
 */

function armazenamento(inicial: Record<string, string> = {}) {
  const valores = new Map(Object.entries(inicial))
  const getItem = vi.fn((chave: string) => valores.get(chave) ?? null)
  const setItem = vi.fn((chave: string, valor: string) => {
    valores.set(chave, valor)
  })
  vi.stubGlobal("sessionStorage", {
    getItem,
    setItem,
    removeItem: vi.fn((chave: string) => {
      valores.delete(chave)
    }),
  })
  return { getItem, setItem }
}

function desenhar(elemento: ReactElement): string {
  return renderToStaticMarkup(elemento)
}

const nada = () => undefined

afterEach(() => vi.unstubAllGlobals())

describe("rascunho só com a cidade conhecida", () => {
  it("pergunta sem cidade: nada é lido nem gravado, e a espera ocupa o lugar", () => {
    const { getItem, setItem } = armazenamento()
    const html = desenhar(
      createElement(Perguntar, { cidade: "", aoCancelar: nada, aoSalvar: nada }),
    )
    expect(html).toContain('data-esqueleto="lista"')
    expect(html).not.toContain('id="nova-pergunta"')
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it("pergunta com a cidade: o rascunho salvo é o que o formulário mostra", () => {
    const guardado = JSON.stringify({ titulo: "Rascunho salvo", assunto: "", topico: "" })
    const { getItem } = armazenamento({ "bivaque:f03:pergunta:Manaus": guardado })
    const html = desenhar(
      createElement(Perguntar, { cidade: "Manaus", aoCancelar: nada, aoSalvar: nada }),
    )
    expect(getItem).toHaveBeenCalledWith("bivaque:f03:pergunta:Manaus")
    expect(html).toContain('id="nova-pergunta"')
    expect(html).toContain('value="Rascunho salvo"')
  })

  it("desapego sem cidade: o formulário não monta e o armazenamento fica intocado", () => {
    const { getItem, setItem } = armazenamento()
    const html = desenhar(createElement(Desapego, { cidade: "", aoCancelar: nada, aoSalvar: nada }))
    expect(html).toContain('data-esqueleto="lista"')
    expect(html).not.toContain('data-formulario-criacao="create-item"')
    expect(getItem).not.toHaveBeenCalled()
    expect(setItem).not.toHaveBeenCalled()
  })

  it("desapego com a cidade: o rascunho salvo é o que o formulário mostra", () => {
    const guardado = JSON.stringify({
      chave: "00000000-0000-4000-8000-000000000000",
      titulo: "Mesa seminova",
      bairro: "",
      cep: "",
      preco: "650,00",
      descricao: "",
      categoria: "outros",
      condicao: "used",
      foto: "",
    })
    const { getItem } = armazenamento({ "bivaque:f03:desapego:Manaus": guardado })
    const html = desenhar(
      createElement(Desapego, { cidade: "Manaus", aoCancelar: nada, aoSalvar: nada }),
    )
    expect(getItem).toHaveBeenCalledWith("bivaque:f03:desapego:Manaus")
    expect(html).toContain('value="Mesa seminova"')
  })
})
