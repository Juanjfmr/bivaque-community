import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"
import { CityReference } from "web/app/components/bivaque/city-reference"

// EVENTOS-LOCALITY-LINK — o app não lê `locality` na agenda nem no guia, então
// um link de outra cidade levaria à agenda/guia de quem clica, em silêncio. A
// prova é o HTML do servidor nos dois lados: a referência da própria cidade
// mantém os dois links iguais; a alternativa não os renderiza e nenhum href
// sai com `locality=`.

vi.mock("web/lib/supabase/client", () => ({
  createBrowserClient: () => ({}),
}))

vi.mock("web/lib/locality-context", () => ({
  useLocalityContext: () => ({
    current: { id: "11111111-1111-4111-8111-111111111111", cityName: "Rio", stateCode: "RJ" },
    outbound: null,
  }),
}))

const OWN = { id: "11111111-1111-4111-8111-111111111111", cityName: "Rio", stateCode: "RJ" }
const OTHER = { id: "22222222-2222-4222-8222-222222222222", cityName: "Manaus", stateCode: "AM" }

const render = (locality?: typeof OWN) =>
  renderToStaticMarkup(createElement(CityReference, locality === undefined ? {} : { locality }))

describe("CityReference — links de agenda e guia por cidade", () => {
  it("na cidade da pessoa mantém «Ver todos os eventos» para /events e «Abrir o guia de chegada» para /guide", () => {
    const html = render()

    expect(html).toContain("Ver todos os eventos")
    expect(html).toContain('href="/events"')
    expect(html).toContain("Abrir o guia de chegada")
    expect(html).toContain('href="/guide"')
    expect(html).not.toContain("locality=")
  })

  it("na cidade alternativa não renderiza os dois links e nenhum href carrega locality=", () => {
    const html = render(OTHER)

    expect(html).not.toContain("Ver todos os eventos")
    expect(html).not.toContain("Abrir o guia de chegada")
    expect(html).not.toContain("locality=")
  })

  it("na cidade alternativa o resto da referência continua: cabeçalho, eventos e guia", () => {
    const html = render(OTHER)

    expect(html).toContain("Manaus")
    expect(html).toContain("Referência de Manaus")
    expect(html).toContain("Próximos eventos da cidade")
    expect(html).toContain("Guia de chegada")
    expect(html).toContain("Vitrine de prestadores")
    expect(html).toContain("Entrar numa vila")
  })
})
