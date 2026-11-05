import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET as detalhe } from "web/app/api/app/guia/[id]/route"
import { DELETE as desmarcar, PUT as marcar } from "web/app/api/app/guia/[id]/salvo/route"
import { POST as sugerir } from "web/app/api/app/guia/[id]/sugestao/route"
import { GET as listar } from "web/app/api/app/guia/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app/guia"
const ID = "a0000000-0000-4000-8000-000000000001"
const USER = "10000000-0000-4000-8000-000000000010"
const CIDADE = "00000000-0000-4000-8000-0000000000aa"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const context = { params: Promise.resolve({ id: ID }) }
const entrada = {
  id: ID,
  category: "school",
  name: "Escola Modelo",
  description: "Turno integral.",
  website_url: "https://escola.example.invalid",
  phone: "(92) 3000-0001",
  locality_id: CIDADE,
}

type Opcoes = {
  cidade?: { id: string; nome: string } | null
  entrada?: typeof entrada | null
  entradas?: (typeof entrada)[]
  salvas?: string[]
  salvo?: boolean
  artigo?: { id: string } | null
  erroNaTabela?: string
  erroNaEscrita?: { code: string; message: string } | null
  erroNaSugestao?: { code: string; message: string } | null
}

function mockClient(opcoes: Opcoes = {}) {
  const eqCalls: Array<{ table: string; column: string; value: unknown }> = []
  const inserts: Array<{ table: string; value: unknown }> = []
  const deletes: string[] = []
  const orCalls: string[] = []
  const inCalls: Array<{ table: string; column: string; valores: readonly unknown[] }> = []

  const from = vi.fn((table: string) => {
    let operacao = "select"
    const answer = (single = false) => {
      if (opcoes.erroNaTabela === table) {
        return { data: null, error: { message: "boom", code: "XX000" } }
      }
      if (table === "locality_memberships") {
        const cidade = opcoes.cidade === undefined ? { id: CIDADE, nome: "Manaus" } : opcoes.cidade
        return {
          data:
            cidade === null
              ? null
              : { locality_id: cidade.id, localities: { city_name: cidade.nome } },
          error: null,
        }
      }
      if (table === "arrival_guide_entries") {
        if (single) {
          return { data: opcoes.entrada === undefined ? entrada : opcoes.entrada, error: null }
        }
        return { data: opcoes.entradas ?? [entrada], error: null }
      }
      if (table === "guide_entry_saves") {
        if (operacao === "insert") return { data: null, error: opcoes.erroNaEscrita ?? null }
        if (operacao === "delete") return { data: null, error: opcoes.erroNaEscrita ?? null }
        if (opcoes.salvas !== undefined) {
          return { data: opcoes.salvas.map((entry_id) => ({ entry_id })), error: null }
        }
        return {
          data: single ? (opcoes.salvo === true ? { entry_id: ID } : null) : null,
          error: null,
        }
      }
      if (table === "guide_articles") {
        return { data: opcoes.artigo === undefined ? null : opcoes.artigo, error: null }
      }
      if (table === "guide_correction_requests") {
        if (opcoes.erroNaSugestao) return { data: null, error: opcoes.erroNaSugestao }
        return { data: { id: "20000000-0000-4000-8000-0000000000ff" }, error: null }
      }
      return { data: null, error: null }
    }

    const query: Record<string, unknown> = {}
    query["select"] = () => query
    query["eq"] = (column: string, value: unknown) => {
      eqCalls.push({ table, column, value })
      return query
    }
    query["or"] = (filtro: string) => {
      orCalls.push(filtro)
      return query
    }
    query["in"] = (column: string, valores: readonly unknown[]) => {
      inCalls.push({ table, column, valores })
      return query
    }
    for (const metodo of ["order", "limit"]) query[metodo] = () => query
    query["maybeSingle"] = async () => answer(true)
    query["single"] = async () => answer(true)
    query["insert"] = (value: unknown) => {
      operacao = "insert"
      inserts.push({ table, value })
      return query
    }
    query["delete"] = () => {
      operacao = "delete"
      deletes.push(table)
      return query
    }
    // O builder PostgREST é awaitable; o stub reproduz esse contrato.
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder fluente do PostgREST
    Object.defineProperty(query, "then", {
      value: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(answer())),
    })
    return query
  })

  return { client: { from } as never, from, eqCalls, inserts, deletes, orCalls, inCalls }
}

function req(method: string, url = BASE, body?: string, requestHeaders = headers) {
  return new NextRequest(url, {
    method,
    headers: requestHeaders,
    ...(body === undefined ? {} : { body }),
  })
}

function authenticate(mock: ReturnType<typeof mockClient>) {
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "pessoa@example.invalid", appMetadata: {} },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

describe("rotas do guia do app", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it.each([
    ["GET guia", () => listar(req("GET"))],
    ["GET verbete", () => detalhe(req("GET"), context)],
    ["PUT salvo", () => marcar(req("PUT"), context)],
    ["DELETE salvo", () => desmarcar(req("DELETE"), context)],
    ["POST sugestão", () => sugerir(req("POST", `${BASE}/${ID}/sugestao`, "{}"), context)],
  ])("%s recusa ausência de sessão", async (_label, invoke) => {
    expect((await invoke()).status).toBe(401)
  })

  describe("porta do app (CSRF)", () => {
    it.each([
      [
        "PUT salvo",
        () =>
          marcar(
            req("PUT", BASE, undefined, { ...headers, origin: "https://fora.example" }),
            context,
          ),
      ],
      [
        "DELETE salvo",
        () =>
          desmarcar(
            req("DELETE", BASE, undefined, { ...headers, origin: "https://fora.example" }),
            context,
          ),
      ],
      [
        "POST sugestão",
        () =>
          sugerir(
            req("POST", `${BASE}/${ID}/sugestao`, "{}", {
              ...headers,
              origin: "https://fora.example",
            }),
            context,
          ),
      ],
    ])("%s recusa origem fora da lista", async (_label, invoke) => {
      const mock = mockClient({ artigo: { id: "artigo-1" } })
      authenticate(mock)
      expect((await invoke()).status).toBe(403)
    })

    it("escrita por cookie sem o cabeçalho do app é recusada", async () => {
      const mock = mockClient({ artigo: { id: "artigo-1" } })
      authenticate(mock)
      const semCabecalho = { origin: "http://localhost:3000", "content-type": "application/json" }
      expect((await marcar(req("PUT", BASE, undefined, semCabecalho), context)).status).toBe(403)
      expect((await desmarcar(req("DELETE", BASE, undefined, semCabecalho), context)).status).toBe(
        403,
      )
      expect(
        (await sugerir(req("POST", `${BASE}/${ID}/sugestao`, "{}", semCabecalho), context)).status,
      ).toBe(403)
    })
  })

  describe("diretório", () => {
    it("valida os parâmetros antes de consultar o banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      expect((await listar(req("GET", `${BASE}?limite=51`))).status).toBe(400)
      expect((await listar(req("GET", `${BASE}?limite=0`))).status).toBe(400)
      expect((await listar(req("GET", `${BASE}?depois=invalido`))).status).toBe(400)
      expect((await listar(req("GET", `${BASE}?categoria=padaria`))).status).toBe(400)
      expect((await listar(req("GET", `${BASE}?q=${"a".repeat(81)}`))).status).toBe(400)
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("mapeia as entradas, marca as salvas e só pagina quando a página veio cheia", async () => {
      const cheia = mockClient({ salvas: [ID] })
      authenticate(cheia)
      const corpo = await json(await listar(req("GET", `${BASE}?limite=1`)))
      expect(corpo["entradas"]).toEqual([
        {
          id: ID,
          categoria: "school",
          nome: "Escola Modelo",
          descricao: "Turno integral.",
          site: "https://escola.example.invalid",
          telefone: "(92) 3000-0001",
          salvo: true,
        },
      ])
      expect(corpo["proximo"]).toBe(`Escola Modelo|${ID}`)
      expect(corpo["cidade"]).toBe("Manaus")

      const curta = mockClient({ entradas: [entrada] })
      authenticate(curta)
      expect((await json(await listar(req("GET", `${BASE}?limite=2`))))["proximo"]).toBeNull()
    })

    it("busca e categoria entram no filtro, não no corpo", async () => {
      const mock = mockClient({ entradas: [] })
      authenticate(mock)
      await listar(req("GET", `${BASE}?q=${encodeURIComponent("escola, (92)")}&categoria=school`))
      expect(mock.orCalls[0]).toBe('name.ilike."%escola 92%",description.ilike."%escola 92%"')
      expect(mock.eqCalls).toContainEqual({
        table: "arrival_guide_entries",
        column: "category",
        value: "school",
      })
    })

    it("a cidade é a da sessão: locality_id na query não muda a lista", async () => {
      const mock = mockClient({ entradas: [] })
      authenticate(mock)
      await listar(req("GET", `${BASE}?locality_id=00000000-0000-4000-8000-0000000000bb`))
      expect(mock.eqCalls).toContainEqual({
        table: "locality_memberships",
        column: "kind",
        value: "current",
      })
      expect(mock.eqCalls).toContainEqual({
        table: "arrival_guide_entries",
        column: "locality_id",
        value: CIDADE,
      })
      expect(mock.eqCalls).not.toContainEqual({
        table: "arrival_guide_entries",
        column: "locality_id",
        value: "00000000-0000-4000-8000-0000000000bb",
      })
    })

    it("sem vínculo de cidade o diretório é vazio, não erro", async () => {
      const mock = mockClient({ cidade: null })
      authenticate(mock)
      const resposta = await listar(req("GET"))
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ entradas: [], proximo: null })
    })

    it("falha de leitura vira 503, nunca lista vazia", async () => {
      const mock = mockClient({ erroNaTabela: "arrival_guide_entries" })
      authenticate(mock)
      const resposta = await listar(req("GET"))
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "leitura-indisponivel" })
    })
  })

  describe("verbete", () => {
    it("devolve a entrada, o marcador e se há artigo para sugerir", async () => {
      const mock = mockClient({ salvo: true, artigo: { id: "artigo-1" } })
      authenticate(mock)
      const corpo = await json(await detalhe(req("GET"), context))
      expect(corpo["entrada"]).toMatchObject({ id: ID, nome: "Escola Modelo", salvo: true })
      expect(corpo["podeSalvar"]).toBe(true)
      expect(corpo["podeSugerir"]).toBe(true)
    })

    it("id fora do formato é 404 sem consultar o banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await detalhe(req("GET"), { params: Promise.resolve({ id: "x" }) })
      expect(resposta.status).toBe(404)
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("entrada inexistente — inclusive pendente na curadoria — é 404", async () => {
      const mock = mockClient({ entrada: null })
      authenticate(mock)
      expect((await detalhe(req("GET"), context)).status).toBe(404)
    })

    it("verbete de outra cidade abre, mas salvar e sugerir são falsos", async () => {
      // A leitura é nacional (migration 20260925161111): o 200 não promete
      // escrita. Sem artigo publicado a sugestão já seria falsa; o que este
      // teste fixa é a cidade — com artigo, ainda assim é falso.
      const outraCidade = mockClient({
        entrada: { ...entrada, locality_id: "00000000-0000-4000-8000-0000000000bb" },
        artigo: { id: "artigo-1" },
      })
      authenticate(outraCidade)
      const resposta = await detalhe(req("GET"), context)
      expect(resposta.status).toBe(200)
      const corpo = await json(resposta)
      expect(corpo["podeSalvar"]).toBe(false)
      expect(corpo["podeSugerir"]).toBe(false)
    })

    it("falha de leitura vira 503", async () => {
      const mock = mockClient({ erroNaTabela: "arrival_guide_entries" })
      authenticate(mock)
      expect((await detalhe(req("GET"), context)).status).toBe(503)
    })
  })

  describe("marcador", () => {
    it("grava com o usuário da sessão e devolve o estado lido do banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      const corpo = await json(await marcar(req("PUT"), context))
      expect(corpo).toEqual({ salvo: true })
      expect(mock.inserts).toEqual([
        { table: "guide_entry_saves", value: { user_id: USER, entry_id: ID } },
      ])
      expect(await json(await desmarcar(req("DELETE"), context))).toEqual({ salvo: false })
      expect(mock.deletes).toContain("guide_entry_saves")
    })

    it("salvar duas vezes é o mesmo estado", async () => {
      const mock = mockClient({ erroNaEscrita: { code: "23505", message: "duplicate key" } })
      authenticate(mock)
      expect((await json(await marcar(req("PUT"), context))).salvo).toBe(true)
    })

    it("entrada inexistente é 404 ao salvar, não 403 de policy", async () => {
      const mock = mockClient({ entrada: null })
      authenticate(mock)
      expect((await marcar(req("PUT"), context)).status).toBe(404)
    })

    it("remove o próprio salvamento mesmo com a entrada fora do ar", async () => {
      // A policy de delete só olha o dono; exigir a entrada visível deixaria o
      // item preso na lista depois que a curadoria tira a referência do ar.
      const mock = mockClient({ entrada: null })
      authenticate(mock)
      const resposta = await desmarcar(req("DELETE"), context)
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ salvo: false })
      expect(mock.deletes).toContain("guide_entry_saves")
      expect(mock.eqCalls.filter((chamada) => chamada.table === "arrival_guide_entries")).toHaveLength(
        0,
      )
    })

    it("recusa da RLS é 403 sem eco da mensagem do Postgres", async () => {
      const mock = mockClient({
        erroNaEscrita: { code: "42501", message: 'new row violates row-level security policy "x"' },
      })
      authenticate(mock)
      const resposta = await marcar(req("PUT"), context)
      expect(resposta.status).toBe(403)
      expect(JSON.stringify(await json(resposta))).not.toMatch(/row-level security/)
    })

    it("falha inesperada do banco é 503", async () => {
      const mock = mockClient({ erroNaEscrita: { code: "XX000", message: "boom" } })
      authenticate(mock)
      expect((await marcar(req("PUT"), context)).status).toBe(503)
    })
  })

  describe("sugestão", () => {
    it("exige JSON e um texto com conteúdo", async () => {
      const mock = mockClient({ artigo: { id: "artigo-1" } })
      authenticate(mock)
      const semJson = { origin: "http://localhost:3000", "x-bivaque-app": "bivaque-spa" }
      expect(
        (await sugerir(req("POST", `${BASE}/${ID}/sugestao`, "{}", semJson), context)).status,
      ).toBe(400)
      expect((await sugerir(req("POST", `${BASE}/${ID}/sugestao`, "{}`"), context)).status).toBe(
        400,
      )
      expect(
        (
          await sugerir(
            req("POST", `${BASE}/${ID}/sugestao`, JSON.stringify({ descricao: "  " })),
            context,
          )
        ).status,
      ).toBe(400)
      expect(
        (
          await sugerir(
            req(
              "POST",
              `${BASE}/${ID}/sugestao`,
              JSON.stringify({ descricao: "ok", referencia: 7 }),
            ),
            context,
          )
        ).status,
      ).toBe(400)
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("grava com o solicitante da sessão e o artigo do banco", async () => {
      const mock = mockClient({ artigo: { id: "00000000-0000-4000-8000-0000000000cc" } })
      authenticate(mock)
      const corpo = JSON.stringify({ descricao: "O telefone mudou.", referencia: "balcão" })
      const resposta = await sugerir(req("POST", `${BASE}/${ID}/sugestao`, corpo), context)
      expect(resposta.status).toBe(201)
      expect(await json(resposta)).toEqual({
        sugestao: { id: "20000000-0000-4000-8000-0000000000ff" },
      })
      expect(mock.inserts[0]).toEqual({
        table: "guide_correction_requests",
        value: {
          article_id: "00000000-0000-4000-8000-0000000000cc",
          requester_id: USER,
          description: "O telefone mudou.",
          reference_text: "balcão",
        },
      })
    })

    it("sem artigo publicado responde sem-artigo, sem gravar", async () => {
      const mock = mockClient({ artigo: null })
      authenticate(mock)
      const resposta = await sugerir(
        req("POST", `${BASE}/${ID}/sugestao`, JSON.stringify({ descricao: "Mudou." })),
        context,
      )
      expect(resposta.status).toBe(400)
      expect((await json(resposta))["erro"]).toBe("sem-artigo")
      expect(mock.inserts).toHaveLength(0)
    })

    it("entrada inexistente é 404 e recusa da RLS é 403 sem eco", async () => {
      const semEntrada = mockClient({ entrada: null })
      authenticate(semEntrada)
      expect(
        (
          await sugerir(
            req("POST", `${BASE}/${ID}/sugestao`, JSON.stringify({ descricao: "Mudou." })),
            context,
          )
        ).status,
      ).toBe(404)

      const recusado = mockClient({
        artigo: { id: "artigo-1" },
        erroNaSugestao: { code: "42501", message: "row-level security" },
      })
      authenticate(recusado)
      const resposta = await sugerir(
        req("POST", `${BASE}/${ID}/sugestao`, JSON.stringify({ descricao: "Mudou." })),
        context,
      )
      expect(resposta.status).toBe(403)
      expect(JSON.stringify(await json(resposta))).not.toMatch(/row-level security/)
    })

    it("falha inesperada do banco é 503", async () => {
      const mock = mockClient({
        artigo: { id: "artigo-1" },
        erroNaSugestao: { code: "XX000", message: "boom" },
      })
      authenticate(mock)
      expect(
        (
          await sugerir(
            req("POST", `${BASE}/${ID}/sugestao`, JSON.stringify({ descricao: "Mudou." })),
            context,
          )
        ).status,
      ).toBe(503)
    })
  })
})
