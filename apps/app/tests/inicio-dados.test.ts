import { afterEach, describe, expect, it, vi } from "vitest"
import { FalhaDaApi } from "@/lib/api/cliente"
import { buscarNaCidade, lerInicio } from "@/lib/dados/inicio"

afterEach(() => vi.unstubAllGlobals())

describe("dados do início e busca", () => {
  it("lê as seções da cidade e transmite o cancelamento", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            cidade: "Manaus",
            perguntas: [{ id: "p", title: "Escola" }],
            eventos: [],
            anuncios: [],
            proximo: null,
          }),
        ),
    )
    vi.stubGlobal("fetch", fetch)
    const controle = new AbortController()
    const dados = await lerInicio({ signal: controle.signal })
    expect(dados.perguntas[0]?.title).toBe("Escola")
    expect(fetch).toHaveBeenCalledWith(
      "/api/app/inicio",
      expect.objectContaining({ signal: controle.signal }),
    )
  })
  it("codifica a consulta e mantém os cinco tipos", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            cidade: "Manaus",
            perguntas: [],
            eventos: [],
            anuncios: [],
            grupos: [],
            negocios: [],
            guia: [],
          }),
        ),
    )
    vi.stubGlobal("fetch", fetch)
    const dados = await buscarNaCidade("escola & casa")
    expect(dados.guia).toEqual([])
    expect(fetch).toHaveBeenCalledWith("/api/app/busca?q=escola%20%26%20casa", expect.anything())
  })
  it("recusa resposta incompleta em vez de inventar vazio", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ cidade: "Manaus" }))),
    )
    await expect(lerInicio()).rejects.toBeInstanceOf(FalhaDaApi)
  })
})
