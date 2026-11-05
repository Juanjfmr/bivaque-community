import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET } from "web/app/api/app/inicio/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const url = "http://localhost:3000/api/app/inicio"

function cliente(falha = "", semCidade = false, quantidade = 1) {
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
            data: semCidade
              ? null
              : { locality_id: "cidade-atual", localities: { city_name: "Manaus" } },
            error: null,
          }
        : {
            data: Array.from({ length: quantidade }, (_, indice) => ({
              id: `${tabela}-${indice}`,
            })),
            error: tabela === falha ? { message: "segredo postgres" } : null,
          }
    query["maybeSingle"] = async () => resposta()
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder do PostgREST
    Object.defineProperty(query, "then", {
      value: (resolve: (valor: unknown) => void) => Promise.resolve(resolve(resposta())),
    })
    return query
  }
  const chamadas: Array<[string, Record<string, unknown>]> = []
  const rpc = (nome: string, args: Record<string, unknown>) => {
    chamadas.push([nome, args])
    return Promise.resolve({
      data: Array.from({ length: quantidade }, (_, indice) => ({ id: `${nome}-${indice}` })),
      error: nome === falha ? { message: "segredo postgres" } : null,
    })
  }
  return { client: { from, rpc }, filtros, chamadas }
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
      perguntas: [{ id: "list_indications-0" }],
      eventos: [{ id: "events-0" }],
      anuncios: [{ id: "listings-0" }],
    })
    expect(mock.filtros).toContainEqual(["locality_memberships", "kind", "current"])
    expect(mock.chamadas).toContainEqual([
      "list_indications",
      { p_locality_id: "cidade-atual", p_resolved: false, p_limit: 21, p_offset: 0 },
    ])
    expect(mock.filtros.some(([tabela]) => tabela === "recommendation_requests")).toBe(false)
    for (const tabela of ["events", "listings"])
      expect(mock.filtros).toContainEqual([tabela, "locality_id", "cidade-atual"])
  })

  it("recusa página inválida", async () => {
    autenticar(cliente())
    expect((await GET(new NextRequest(`${url}?pagina=-1`))).status).toBe(400)
  })

  it("recusa quem não tem cidade atual", async () => {
    autenticar(cliente("", true))
    expect((await GET(new NextRequest(url))).status).toBe(403)
  })

  it("limita as seções e informa quando há próxima página", async () => {
    autenticar(cliente("", false, 21))
    const corpo = await (await GET(new NextRequest(url))).json()
    expect(corpo.perguntas).toHaveLength(20)
    expect(corpo.proximo).toBe(2)
  })

  it("mostra indisponibilidade sem expor erro do banco", async () => {
    autenticar(cliente("events"))
    const resposta = await GET(new NextRequest(url))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo postgres")
  })
})
