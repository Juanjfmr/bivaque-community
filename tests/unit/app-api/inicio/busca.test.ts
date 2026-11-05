import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET } from "web/app/api/app/busca/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const url = "http://localhost:3000/api/app/busca"

function autenticar(falha = "") {
  const filtros: Array<[string, string, unknown]> = []
  function resposta(tabela: string) {
    if (tabela === "locality_memberships")
      return {
        data: { locality_id: "cidade-atual", localities: { city_name: "Manaus" } },
        error: null,
      }
    return {
      data: [{ id: tabela, title: "Casa", name: "Casa", display_name: "Casa" }],
      error: tabela === falha ? { message: "segredo postgres" } : null,
    }
  }
  function from(tabela: string) {
    const query: Record<string, unknown> = {}
    for (const metodo of ["select", "order", "limit", "ilike"]) query[metodo] = () => query
    query["eq"] = (coluna: string, valor: unknown) => {
      filtros.push([tabela, coluna, valor])
      return query
    }
    query["maybeSingle"] = async () => resposta(tabela)
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder do PostgREST
    Object.defineProperty(query, "then", {
      value: (resolve: (valor: unknown) => void) => Promise.resolve(resolve(resposta(tabela))),
    })
    return query
  }
  const client = { from, rpc: (nome: string) => Promise.resolve(resposta(nome)) }
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: "pessoa" },
    cliente: client,
    cabecalhos: {},
  } as never)
  return filtros
}

describe("busca do app", () => {
  beforeEach(() =>
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never),
  )
  it("exige sessão", async () =>
    expect((await GET(new NextRequest(`${url}?q=casa`))).status).toBe(401))
  it("recusa termo vazio ou comprido", async () => {
    autenticar()
    expect((await GET(new NextRequest(url))).status).toBe(400)
    expect((await GET(new NextRequest(`${url}?q=${"a".repeat(101)}`))).status).toBe(400)
  })
  it("devolve resultados dos cinco tipos na cidade da sessão", async () => {
    const filtros = autenticar()
    const resposta = await GET(new NextRequest(`${url}?q=casa`))
    expect(resposta.status).toBe(200)
    const corpo = await resposta.json()
    for (const tipo of ["perguntas", "grupos", "anuncios", "negocios", "guia"])
      expect(corpo[tipo]).toHaveLength(1)
    expect(filtros).toContainEqual(["groups", "locality_id", "cidade-atual"])
    expect(filtros).toContainEqual(["arrival_guide_entries", "status", "approved"])
  })
  it("não esconde falha de leitura nem expõe o banco", async () => {
    autenticar("groups")
    const resposta = await GET(new NextRequest(`${url}?q=casa`))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo postgres")
  })
})
