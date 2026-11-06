import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET } from "web/app/api/app/inicio/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const url = "http://localhost:3000/api/app/inicio"

function cliente(falha = "", semCidade = false, quantidade = 1) {
  const filtros: Array<[string, string, unknown]> = []
  const selects: Array<[string, string]> = []
  const from = (tabela: string) => {
    const query: Record<string, unknown> = {}
    for (const metodo of ["order", "limit", "range", "gte", "neq", "in"]) {
      query[metodo] = () => query
    }
    query["select"] = (colunas: string) => {
      selects.push([tabela, colunas])
      return query
    }
    query["eq"] = (coluna: string, valor: unknown) => {
      filtros.push([tabela, coluna, valor])
      return query
    }
    // Vínculos vêm só com as colunas concedidas: a contagem é por group_id.
    const linhasDeVinculo = Array.from({ length: 3 }, () => ({ group_id: "groups-0" }))
    const linhasDeGrupo = Array.from({ length: quantidade }, (_, indice) => ({
      id: `groups-${indice}`,
      name: "Vizinhos",
    }))
    const resposta = () => {
      if (tabela === "locality_memberships")
        return {
          data: semCidade
            ? null
            : { locality_id: "cidade-atual", localities: { city_name: "Manaus" } },
          error: null,
        }
      const dados =
        tabela === "group_memberships"
          ? linhasDeVinculo
          : tabela === "groups"
            ? linhasDeGrupo
            : Array.from({ length: quantidade }, (_, indice) => ({
                id: `${tabela}-${indice}`,
                group_id: "grupo-1",
                name: "Vizinhos",
              }))
      return { data: dados, error: tabela === falha ? { message: "segredo postgres" } : null }
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
      data: Array.from({ length: quantidade }, (_, indice) => ({
        id: `${nome}-${indice}`,
        title: "Escola",
        reply_count: 2,
        is_resolved: false,
        group_name: null,
        display_name: "Eletricista",
        category: "casa_e_reformas",
        bio: "segredo da bio",
      })),
      error: nome === falha ? { message: "segredo postgres" } : null,
    })
  }
  return { client: { from, rpc }, filtros, chamadas, selects }
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

  it("traz negócios e grupos da pessoa só na primeira página, sem campos além dos usados", async () => {
    const mock = cliente()
    autenticar(mock)
    const corpo = await (await GET(new NextRequest(url))).json()
    expect(corpo.negocios).toEqual([
      { id: "search_providers-0", display_name: "Eletricista", category: "casa_e_reformas" },
    ])
    expect(corpo.grupos).toEqual([{ id: "groups-0", name: "Vizinhos", members: 3 }])
    expect(corpo.perguntas[0]).toEqual({
      id: "list_indications-0",
      title: "Escola",
      reply_count: 2,
      is_resolved: false,
      group_name: null,
    })
    expect(mock.filtros).toContainEqual(["group_memberships", "user_id", "pessoa"])
    expect(mock.filtros).toContainEqual(["group_memberships", "status", "approved"])
    expect(mock.filtros).toContainEqual(["groups", "locality_id", "cidade-atual"])
    // Sem embed `group_memberships(count)`: o grant por coluna dá 403 nele.
    expect(mock.selects).toContainEqual(["group_memberships", "group_id"])
    expect(mock.selects.some(([, colunas]) => colunas.includes("count"))).toBe(false)

    const segunda = cliente()
    autenticar(segunda)
    const outra = await (await GET(new NextRequest(`${url}?pagina=2`))).json()
    expect(outra.negocios).toEqual([])
    expect(outra.grupos).toEqual([])
    expect(segunda.chamadas.some(([nome]) => nome === "search_providers")).toBe(false)
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

  it.each(["list_indications", "search_providers", "group_memberships", "groups"])(
    "devolve 503 e não lista vazia quando %s falha",
    async (falha) => {
      autenticar(cliente(falha))
      const resposta = await GET(new NextRequest(url))
      expect(resposta.status).toBe(503)
      expect(await resposta.text()).not.toContain("segredo postgres")
    },
  )
})
