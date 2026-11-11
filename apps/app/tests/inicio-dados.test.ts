import { afterEach, describe, expect, it, vi } from "vitest"
import { FalhaDaApi } from "@/lib/api/cliente"
import { buscarNaCidade, lerInicio } from "@/lib/dados/inicio"
import { EXPLORAR, negocioDoGrupo, rotuloDaCategoria } from "@/src/inicio/categorias"

afterEach(() => vi.unstubAllGlobals())

const corpoDoInicio = {
  cidade: "Manaus",
  perguntas: [{ id: "p", title: "Escola", reply_count: 2, is_resolved: false, group_name: "Mães" }],
  eventos: [{ id: "e", title: "Piquenique", venue: "Parque", starts_at: "2026-11-08T14:00:00Z" }],
  anuncios: [
    { id: "a", title: "Berço", kind: "item", price_cents: 25000, neighborhood: "Centro" },
    { id: "b", title: "Casa", kind: "property", price_cents: null, neighborhood: null },
  ],
  negocios: [{ id: "n", display_name: "Eletricista", category: "casa_e_reformas" }],
  grupos: [{ id: "g", name: "Vizinhos", members: 3 }],
  proximo: null,
}

describe("dados do início e busca", () => {
  it("lê as seções da cidade com preço, contagens e transmite o cancelamento", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify(corpoDoInicio)))
    vi.stubGlobal("fetch", fetch)
    const controle = new AbortController()
    const dados = await lerInicio({ signal: controle.signal })
    expect(dados.perguntas[0]).toMatchObject({ title: "Escola", respostas: 2, grupo: "Mães" })
    expect(dados.anuncios.map((a) => a.precoCentavos)).toEqual([25000, null])
    expect(dados.negocios[0]).toEqual({
      id: "n",
      nome: "Eletricista",
      categoria: "casa_e_reformas",
      foto: null,
    })
    expect(dados.grupos[0]).toEqual({ id: "g", nome: "Vizinhos", membros: 3 })
    expect(dados.eventos[0]?.local).toBe("Parque")
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/inicio",
      expect.objectContaining({ signal: controle.signal }),
    )
  })
  it("lê a foto assinada e o prazo de retirada, e recusa caminho cru do bucket", async () => {
    const corpo = {
      ...corpoDoInicio,
      anuncios: [
        {
          id: "a",
          title: "Berço",
          kind: "item",
          price_cents: 25000,
          neighborhood: "Centro",
          available_until: "2026-12-01",
          foto: "https://storage.example.invalid/assinada.jpg?token=x",
        },
        { id: "b", title: "Casa", kind: "property", price_cents: null, foto: "anuncio/capa.jpg" },
      ],
      negocios: [
        { id: "n", display_name: "Eletricista", category: "casa_e_reformas", foto: "javascript:x" },
      ],
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(corpo))),
    )
    const dados = await lerInicio()
    expect(dados.anuncios[0]).toMatchObject({
      disponivelAte: "2026-12-01",
      foto: "https://storage.example.invalid/assinada.jpg?token=x",
    })
    expect(dados.anuncios[1]?.foto).toBeNull()
    expect(dados.negocios[0]?.foto).toBeNull()
  })
  it("codifica a consulta e mantém os cinco tipos", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            cidade: "Manaus",
            perguntas: [],
            anuncios: [],
            grupos: [{ id: "g", name: "Vizinhos", members: 1 }],
            negocios: [],
            guia: [{ id: "x", name: "Mercado", description: "Perto" }],
          }),
        ),
    )
    vi.stubGlobal("fetch", fetch)
    const dados = await buscarNaCidade("escola & casa")
    expect(dados.guia[0]).toEqual({ id: "x", title: "Mercado", detalhe: "Perto" })
    expect(dados.grupos[0]?.membros).toBe(1)
    expect(fetch).toHaveBeenCalledWith("/api/app/busca?q=escola%20%26%20casa", expect.anything())
  })
  it("recusa resposta incompleta em vez de inventar vazio", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ cidade: "Manaus" }))),
    )
    await expect(lerInicio()).rejects.toBeInstanceOf(FalhaDaApi)
  })
  it("recusa item sem título", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ ...corpoDoInicio, anuncios: [{ id: "a", kind: "item" }] })),
      ),
    )
    await expect(lerInicio()).rejects.toBeInstanceOf(FalhaDaApi)
  })
})

describe("categorias de negócio", () => {
  it("dá rótulo ao código e mantém o desconhecido como veio", () => {
    expect(rotuloDaCategoria("saude_e_bem_estar")).toBe("Saúde e bem-estar")
    expect(rotuloDaCategoria("outra")).toBe("outra")
  })
  it("agrupa os códigos da grade Explorar", () => {
    expect(EXPLORAR.map((g) => g.id)).toContain("reparos")
    expect(negocioDoGrupo("reparos", "assistencia_tecnica")).toBe(true)
    expect(negocioDoGrupo("reparos", "pets")).toBe(false)
    expect(negocioDoGrupo(null, "pets")).toBe(false)
  })
})
