import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET } from "web/app/api/app/cidade/[id]/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

// CIDADE-169 — a consulta de outra cidade no app. A regra de leitura é do dono
// (ADR-20260925-consulta-outra-cidade) e está provada no banco
// (supabase/tests/consulta-outra-cidade.sql); aqui se prova a PORTA: sessão,
// resolução do alvo (`atual` vem do vínculo da sessão, nunca do pedido), 404 de
// catálogo e formato, o agregado sem comunidades/perguntas, e 503 sem eco.

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app/cidade"
const USER = "10000000-0000-4000-8000-000000000010"
const MINHA = "00000000-0000-4000-8000-000000000001"
const OUTRA = "00000000-0000-4000-8000-000000000002"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
}

const GUIA = {
  id: "a1000000-0000-4000-8000-000000000001",
  name: "Escola Modelo",
  category: "school",
}
const ENCONTRO = {
  id: "e1000000-0000-4000-8000-000000000001",
  title: "Café da manhã",
  venue: "Praça",
  starts_at: "2026-11-20T12:00:00.000Z",
}
const DESAPEGO = {
  id: "l1000000-0000-4000-8000-000000000001",
  title: "Cadeira",
  price_cents: 5000,
  neighborhood: "Centro",
}
const IMOVEL = {
  id: "l1000000-0000-4000-8000-000000000002",
  title: "Apartamento",
  neighborhood: "Centro",
}

type Opcoes = {
  cidadeAtual?: string | null
  cidades?: Record<string, { id: string; city_name: string; state_code: string }>
  erroEm?: string
}

function mockClient(opcoes: Opcoes = {}) {
  const usadas: Array<{ tabela: string; colunas: Array<[string, unknown]> }> = []
  const de = vi.fn((tabela: string) => {
    const filtros: Array<[string, unknown]> = []
    usadas.push({ tabela, colunas: filtros })
    const responderTabela = (linhaUnica: boolean) => {
      if (opcoes.erroEm === tabela) {
        return { data: null, error: { message: "detalhe interno do banco", code: "XX000" } }
      }
      if (tabela === "locality_memberships") {
        const atual = opcoes.cidadeAtual === undefined ? MINHA : opcoes.cidadeAtual
        return {
          data: atual === null ? null : { locality_id: atual, localities: { city_name: "Manaus" } },
          error: null,
        }
      }
      if (tabela === "localities") {
        const id = filtros.find(([coluna]) => coluna === "id")?.[1] as string | undefined
        const catalogo = opcoes.cidades ?? {
          [MINHA]: { id: MINHA, city_name: "Manaus", state_code: "AM" },
          [OUTRA]: { id: OUTRA, city_name: "Rio de Janeiro", state_code: "RJ" },
        }
        return { data: (id === undefined ? undefined : catalogo[id]) ?? null, error: null }
      }
      if (tabela === "arrival_guide_entries") return { data: [GUIA], error: null }
      if (tabela === "events") return { data: [ENCONTRO], error: null }
      if (tabela === "listings") {
        const tipo = filtros.find(([coluna]) => coluna === "kind")?.[1]
        return { data: tipo === "property" ? [IMOVEL] : [DESAPEGO], error: null }
      }
      return { data: linhaUnica ? null : [], error: null }
    }
    const query: Record<string, unknown> = {}
    query["select"] = () => query
    query["eq"] = (coluna: string, valor: unknown) => {
      filtros.push([coluna, valor])
      return query
    }
    for (const metodo of ["order", "limit", "gte", "lt"]) query[metodo] = () => query
    query["maybeSingle"] = async () => responderTabela(true)
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder fluente do PostgREST
    Object.defineProperty(query, "then", {
      value: (resolver: (valor: unknown) => unknown) =>
        Promise.resolve(resolver(responderTabela(false))),
    })
    return query
  })
  return { client: { from: de } as never, de, usadas }
}

function pedido(id: string) {
  return new NextRequest(`${BASE}/${id}`, { headers })
}

const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

function autenticar(mock: ReturnType<typeof mockClient>) {
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "pessoa@example.invalid", appMetadata: {} },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}

async function corpo(resposta: Response) {
  return (await resposta.json()) as Record<string, unknown>
}

describe("GET /api/app/cidade/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it("GET /api/app/cidade/[id] recusa ausência de sessão", async () => {
    expect((await GET(pedido(OUTRA), contexto(OUTRA))).status).toBe(401)
  })

  it("`atual` resolve a cidade do vínculo current da sessão, não do pedido", async () => {
    const mock = mockClient({ cidadeAtual: OUTRA })
    autenticar(mock)
    const resposta = await GET(pedido("atual"), contexto("atual"))
    expect(resposta.status).toBe(200)
    const lido = await corpo(resposta)
    expect(lido["cidade"]).toEqual({ id: OUTRA, nome: "Rio de Janeiro", uf: "RJ" })
    expect(lido["minha"]).toBe(true)
    const consultaCidade = mock.usadas.find((uso) => uso.tabela === "localities")
    expect(consultaCidade?.colunas).toContainEqual(["id", OUTRA])
  })

  it("id do catálogo abre a consulta da outra cidade, com o agregado do web", async () => {
    const mock = mockClient()
    autenticar(mock)
    const resposta = await GET(pedido(OUTRA), contexto(OUTRA))
    expect(resposta.status).toBe(200)
    const lido = await corpo(resposta)
    expect(lido["minha"]).toBe(false)
    expect(lido["atual"]).toEqual({ id: MINHA, nome: "Manaus" })
    expect(lido["guia"]).toEqual([{ id: GUIA.id, nome: "Escola Modelo", categoria: "school" }])
    expect(lido["encontros"]).toEqual([
      { id: ENCONTRO.id, titulo: "Café da manhã", comecaEm: ENCONTRO.starts_at, local: "Praça" },
    ])
    expect(lido["desapegos"]).toEqual([
      { id: DESAPEGO.id, titulo: "Cadeira", precoCents: 5000, bairro: "Centro" },
    ])
    expect(lido["imoveis"]).toEqual([{ id: IMOVEL.id, titulo: "Apartamento", bairro: "Centro" }])
    // A consulta é só leitura: comunidades, perguntas e vitrine não existem nela.
    expect(lido).not.toHaveProperty("comunidades")
    expect(lido).not.toHaveProperty("perguntas")
    expect(lido).not.toHaveProperty("negocios")
    // Todas as leituras do bundle são da cidade consultada.
    for (const uso of mock.usadas.filter(
      (item) => item.tabela !== "locality_memberships" && item.tabela !== "localities",
    )) {
      expect(uso.colunas).toContainEqual(["locality_id", OUTRA])
    }
  })

  it("id fora do catálogo é 404, e formato inválido nem consulta o banco", async () => {
    const catalogo = mockClient()
    autenticar(catalogo)
    const fora = "00000000-0000-4000-8000-0000000000ff"
    expect((await GET(pedido(fora), contexto(fora))).status).toBe(404)

    const invalido = mockClient()
    autenticar(invalido)
    for (const id of ["manaus", "00000000-0000-4000-8000", "../../etc"]) {
      expect((await GET(pedido(id), contexto(id))).status).toBe(404)
    }
    expect(invalido.de).not.toHaveBeenCalled()
  })

  it("`atual` sem vínculo current é 404, nunca a cidade de outra pessoa", async () => {
    const mock = mockClient({ cidadeAtual: null })
    autenticar(mock)
    expect((await GET(pedido("atual"), contexto("atual"))).status).toBe(404)
    expect(mock.de).toHaveBeenCalledTimes(1)
  })

  it("falha de leitura é 503 sem eco da mensagem do banco", async () => {
    const mock = mockClient({ erroEm: "arrival_guide_entries" })
    autenticar(mock)
    const resposta = await GET(pedido(OUTRA), contexto(OUTRA))
    expect(resposta.status).toBe(503)
    expect(JSON.stringify(await corpo(resposta))).not.toContain("detalhe interno")
  })
})
