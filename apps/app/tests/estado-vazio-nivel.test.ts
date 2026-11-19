import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { EstadoVazio } from "@/components/bivaque/estado-vazio"

function marcacao(nivel?: "h2" | "h3"): string {
  const base = { titulo: "Nada por aqui", texto: "Volte depois." }
  return renderToStaticMarkup(
    createElement(EstadoVazio, nivel === undefined ? base : { ...base, nivel }),
  )
}

describe("o título do estado vazio segue a hierarquia da tela", () => {
  it("usa h2 quando a tela não diz o nível", () => {
    expect(marcacao()).toMatch(/<h2[^>]*>Nada por aqui<\/h2>/)
  })

  it("usa o nível pedido dentro de uma seção", () => {
    const html = marcacao("h3")
    expect(html).toMatch(/<h3[^>]*>Nada por aqui<\/h3>/)
    expect(html).not.toContain("<h2")
  })

  it("mantém a mesma aparência nos dois níveis", () => {
    const classe = (html: string) => html.match(/<h[23] class="([^"]*)"/)?.[1]
    expect(classe(marcacao("h3"))).toBe(classe(marcacao()))
  })
})
