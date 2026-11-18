import { afterEach, describe, expect, it, vi } from "vitest"

import { FalhaDaApi } from "@/lib/api/cliente"
import { CIDADE_ATUAL, lerCidadeConsulta, lerCidadesDaUf, lerEstados } from "@/lib/dados/cidade"

/**
 * A porta da consulta de cidade (CIDADE-169), no molde de `guia-dados.test.ts`:
 * caminho, tradução e a regra da casa — resposta fora do contrato falha alto em
 * vez de virar tela vazia.
 */

function responder(corpo: unknown, status = 200) {
  const buscar = vi.fn(async () => new Response(JSON.stringify(corpo), { status }))
  vi.stubGlobal("fetch", buscar)
  return buscar
}

function chamada(buscar: ReturnType<typeof responder>) {
  const [caminho, init] = buscar.mock.calls[0] as unknown as [string, RequestInit]
  return { caminho, init }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

const CORPO = {
  cidade: { id: "cidade-2", nome: "Rio de Janeiro", uf: "RJ" },
  atual: { id: "cidade-1", nome: "Manaus" },
  minha: false,
  guia: [{ id: "guia-1", nome: "Escola Modelo", categoria: "school" }],
  encontros: [
    { id: "evento-1", titulo: "Café", comecaEm: "2026-11-20T12:00:00.000Z", local: null },
  ],
  desapegos: [{ id: "item-1", titulo: "Cadeira", precoCents: 5000, bairro: "Centro" }],
  imoveis: [{ id: "imovel-1", titulo: "Apartamento", bairro: null }],
}

describe("consulta de cidade", () => {
  it("lê a cidade pedida pelo id, no caminho da rota", async () => {
    const buscar = responder(CORPO)
    const consulta = await lerCidadeConsulta("cidade-2")
    expect(chamada(buscar).caminho).toBe("/api/app/cidade/cidade-2")
    expect(consulta.cidade).toEqual({ id: "cidade-2", nome: "Rio de Janeiro", uf: "RJ" })
    expect(consulta.minha).toBe(false)
    expect(consulta.atual).toEqual({ id: "cidade-1", nome: "Manaus" })
    expect(consulta.guia[0]).toEqual({ id: "guia-1", nome: "Escola Modelo", categoria: "school" })
    expect(consulta.encontros[0]).toEqual({
      id: "evento-1",
      titulo: "Café",
      comecaEm: "2026-11-20T12:00:00.000Z",
      local: null,
    })
    expect(consulta.desapegos[0]).toEqual({
      id: "item-1",
      titulo: "Cadeira",
      precoCents: 5000,
      bairro: "Centro",
    })
    expect(consulta.imoveis[0]).toEqual({ id: "imovel-1", titulo: "Apartamento", bairro: null })
  })

  it("`atual` é o caminho da própria cidade, sem nome no endereço", async () => {
    const buscar = responder({ ...CORPO, minha: true })
    const consulta = await lerCidadeConsulta(CIDADE_ATUAL)
    expect(CIDADE_ATUAL).toBe("atual")
    expect(chamada(buscar).caminho).toBe("/api/app/cidade/atual")
    expect(consulta.minha).toBe(true)
  })

  it("resposta fora do contrato sobe como falha, nunca como cidade vazia", async () => {
    responder({ cidade: CORPO.cidade, guia: "nada" })
    await expect(lerCidadeConsulta("cidade-2")).rejects.toBeInstanceOf(FalhaDaApi)

    responder({})
    await expect(lerCidadeConsulta("cidade-2")).rejects.toBeInstanceOf(FalhaDaApi)
  })

  it("o catálogo do painel traz UF e o id de cada município", async () => {
    const uf = responder({ ufs: ["AM", "RJ"] })
    expect(await lerEstados()).toEqual(["AM", "RJ"])
    expect(chamada(uf).caminho).toBe("/api/localities")

    const cidades = responder({
      municipalities: [
        { id: "cidade-1", cityName: "Manaus", ibgeCode: "1302603" },
        { id: "cidade-2", cityName: "Rio de Janeiro", ibgeCode: "3304557" },
      ],
    })
    expect(await lerCidadesDaUf("AM")).toEqual([
      { id: "cidade-1", nome: "Manaus" },
      { id: "cidade-2", nome: "Rio de Janeiro" },
    ])
    expect(chamada(cidades).caminho).toBe("/api/localities/AM")
  })
})
