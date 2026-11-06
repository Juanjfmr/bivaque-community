import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET } from "web/app/api/app/busca/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { padraoDoTermo, termoBuscavel } from "web/lib/search/params"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const url = "http://localhost:3000/api/app/busca"

function autenticar(falha = "", semCidade = false) {
  const filtros: Array<[string, string, unknown]> = []
  const padroes: Array<[string, string, string]> = []
  const selects: Array<[string, string]> = []
  function resposta(tabela: string) {
    if (tabela === "locality_memberships")
      return {
        data: semCidade
          ? null
          : { locality_id: "cidade-atual", localities: { city_name: "Manaus" } },
        error: null,
      }
    // Vínculos vêm só com group_id (colunas concedidas); dois membros aprovados em "groups".
    if (tabela === "group_memberships")
      return {
        data: [{ group_id: "groups" }, { group_id: "groups" }],
        error: tabela === falha ? { message: "segredo postgres" } : null,
      }
    return {
      data: [
        {
          id: tabela,
          title: "Casa",
          name: "Casa",
          display_name: "Casa",
          category: "casa_e_reformas",
          description: "d",
          kind: "item",
          price_cents: 1000,
          neighborhood: "Centro",
          reply_count: 1,
          is_resolved: false,
          group_name: null,
          matched_reply_body: "texto da resposta",
          reach_source: "paid",
          bio: "segredo da bio",
        },
      ],
      error: tabela === falha ? { message: "segredo postgres" } : null,
    }
  }
  function from(tabela: string) {
    const query: Record<string, unknown> = {}
    for (const metodo of ["order", "limit"]) query[metodo] = () => query
    query["select"] = (colunas: string) => {
      selects.push([tabela, colunas])
      return query
    }
    query["in"] = () => query
    query["ilike"] = (coluna: string, padrao: string) => {
      padroes.push([tabela, coluna, padrao])
      return query
    }
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
  return { filtros, padroes, selects }
}

const buscar = (consulta: string) =>
  GET(new NextRequest(`${url}?q=${encodeURIComponent(consulta)}`))

describe("busca do app", () => {
  beforeEach(() =>
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never),
  )
  it("exige sessão", async () => expect((await buscar("casa")).status).toBe(401))
  it("recusa termo vazio, curto, só de pontuação ou comprido", async () => {
    autenticar()
    expect((await GET(new NextRequest(url))).status).toBe(400)
    for (const termo of ["a", " a ", "!!", "--", "%%", "a".repeat(101)])
      expect((await buscar(termo)).status).toBe(400)
    expect((await buscar("ab")).status).toBe(200)
  })
  it("recusa quem não tem cidade atual", async () => {
    autenticar("", true)
    expect((await buscar("casa")).status).toBe(403)
  })
  it("devolve os cinco tipos na cidade da sessão, só com os campos que a tela usa", async () => {
    const { filtros, selects } = autenticar()
    const resposta = await buscar("casa")
    expect(resposta.status).toBe(200)
    const corpo = await resposta.json()
    for (const tipo of ["perguntas", "grupos", "anuncios", "negocios", "guia"])
      expect(corpo[tipo]).toHaveLength(1)
    expect(corpo.perguntas[0]).toEqual({
      id: "list_indications",
      title: "Casa",
      reply_count: 1,
      is_resolved: false,
      group_name: null,
    })
    expect(corpo.negocios[0]).toEqual({
      id: "search_providers",
      display_name: "Casa",
      category: "casa_e_reformas",
    })
    expect(corpo.grupos[0]).toEqual({ id: "groups", name: "Casa", members: 2 })
    expect(filtros).toContainEqual(["groups", "locality_id", "cidade-atual"])
    expect(filtros).toContainEqual(["arrival_guide_entries", "status", "approved"])
    // Sem embed `group_memberships(count)`: a contagem vem de linhas por group_id.
    expect(selects).toContainEqual(["groups", "id,name"])
    expect(selects).toContainEqual(["group_memberships", "group_id"])
    expect(selects.some(([, colunas]) => colunas.includes("count"))).toBe(false)
  })
  it("escapa o termo hostil no padrão do ilike", async () => {
    const { padroes } = autenticar()
    const resposta = await buscar(String.raw`a,b)(%*"'_\c`)
    expect(resposta.status).toBe(200)
    const esperado = String.raw`%a,b)(\%"'\_\\c%`
    expect(padroes).toContainEqual(["groups", "name", esperado])
    expect(padroes).toContainEqual(["listings", "title", esperado])
    expect(padroes).toContainEqual(["arrival_guide_entries", "name", esperado])
  })
  it("não esconde falha de leitura nem expõe o banco", async () => {
    autenticar("groups")
    const resposta = await buscar("casa")
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo postgres")
  })
  it("devolve 503 quando só a contagem de membros falha, sem lista vazia", async () => {
    autenticar("group_memberships")
    const resposta = await buscar("casa")
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo postgres")
  })
})

describe("termo da busca", () => {
  it("exige 2 caracteres e ao menos uma letra ou número", () => {
    expect(termoBuscavel("ab")).toBe(true)
    expect(termoBuscavel("é!")).toBe(true)
    expect(termoBuscavel("a")).toBe(false)
    expect(termoBuscavel("*%")).toBe(false)
  })
  it("escapa curingas e descarta o asterisco", () => {
    expect(padraoDoTermo(String.raw`50%_off\*`)).toBe(String.raw`%50\%\_off\\%`)
  })
})
