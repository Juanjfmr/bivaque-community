import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET } from "web/app/api/app/inicio/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const url = "http://localhost:3000/api/app/inicio"

function cliente(falha = "") {
  const filtros: Array<[string, string, unknown]> = []
  const from = (tabela: string) => {
    const query: Record<string, unknown> = {}
    for (const metodo of ["select", "order", "limit", "range", "gte", "neq"]) {
      query[metodo] = () => query
    }
    query["eq"] = (coluna: string, valor: unknown) => {
      filtros.push([tabela, coluna, valor])
      return query
    }
    const resposta = () =>
      tabela === "locality_memberships"
        ? {
            data: { locality_id: "cidade-atual", localities: { city_name: "Manaus" } },
            error: null,
          }
        : {
            data: [{ id: tabela }],
            error: tabela === falha ? { message: "segredo postgres" } : null,
          }
    query["maybeSingle"] = async () => resposta()
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder do PostgREST
    Object.defineProperty(query, "then", {
      value: (resolve: (valor: unknown) => void) => Promise.resolve(resolve(resposta())),
    })
    return query
  }
  return { client: { from }, filtros }
}

function autenticar(mock: ReturnType<typeof cliente>) {
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: "pessoa" },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}

describe("início do app", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it("recusa leitura sem sessão", async () => {
    expect((await GET(new NextRequest(url))).status).toBe(401)
  })

  it("usa a cidade atual da sessão e devolve as três seções", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await GET(new NextRequest(url))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toMatchObject({
      cidade: "Manaus",
      perguntas: [{ id: "recommendation_requests" }],
      eventos: [{ id: "events" }],
      anuncios: [{ id: "listings" }],
    })
    expect(mock.filtros).toContainEqual(["locality_memberships", "kind", "current"])
    for (const tabela of ["recommendation_requests", "events", "listings"])
      expect(mock.filtros).toContainEqual([tabela, "locality_id", "cidade-atual"])
  })

  it("recusa página inválida", async () => {
    autenticar(cliente())
    expect((await GET(new NextRequest(`${url}?pagina=-1`))).status).toBe(400)
  })

  it("mostra indisponibilidade sem expor erro do banco", async () => {
    autenticar(cliente("events"))
    const resposta = await GET(new NextRequest(url))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo postgres")
  })
})
