import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as responder } from "web/app/api/app/perguntas/[id]/respostas/route"
import { GET as detalhe } from "web/app/api/app/perguntas/[id]/route"
import { GET as listar } from "web/app/api/app/perguntas/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app/perguntas"
const ID = "90000000-0000-4000-8000-000000000001"
const USER = "20000000-0000-4000-8000-000000000001"
const OUTRA_PESSOA = "20000000-0000-4000-8000-000000000002"
const CIDADE = "00000000-0000-4000-8000-000000000001"
const OUTRA_CIDADE = "00000000-0000-4000-8000-0000000000bb"
const DATA = "2026-11-01T12:00:00.000Z"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const context = { params: Promise.resolve({ id: ID }) }

const linha = {
  id: ID,
  title: "Alguém indica pediatra que atenda pelo FuSEx?",
  body: "Minha filha tem 3 anos.",
  category: "saude_bem_estar",
  created_at: DATA,
  is_resolved: false,
  group_id: null,
  group_name: null,
  reply_count: 2,
  resolved_reply_body: null,
  matched_reply_body: null,
}

const pedido = {
  id: ID,
  author_id: USER,
  title: linha.title,
  body: linha.body,
  category: "saude_bem_estar",
  created_at: DATA,
  is_resolved: false,
  resolved_reply_id: null,
  localities: { city_name: "Manaus" },
}

const respostaDaConversa = {
  id: "d0000000-0000-4000-8000-000000000010",
  author_id: OUTRA_PESSOA,
  body: "A Dra. Helena atende FuSEx.",
  created_at: DATA,
  edited_at: null,
  is_removed: false,
}

type Options = {
  cidade?: { id: string; nome: string } | null
  perguntas?: (typeof linha)[]
  respostas?: (typeof respostaDaConversa)[]
  pedido?: typeof pedido | null
  autores?: { id: string; author_id: string }[]
  nomes?: { user_id: string; display_name: string }[]
  resolvidas?: number
  gravada?: { id: string; body: string; created_at: string }
  errorTable?: string
  rpcError?: Record<string, { code?: string; message: string }>
  insertError?: { code: string; message: string }
}

function mockClient(options: Options = {}) {
  const eqCalls: Array<{ table: string; column: string; value: unknown }> = []
  const inCalls: Array<{ table: string; column: string; values: unknown }> = []
  const inserts: Array<{ table: string; value: unknown }> = []
  const rpcCalls: Array<{ nome: string; args: Record<string, unknown> }> = []

  const rpc = vi.fn((nome: string, args: Record<string, unknown>) => {
    rpcCalls.push({ nome, args })
    const falha = options.rpcError?.[nome]
    if (falha) return Promise.resolve({ data: null, error: falha })
    if (nome === "list_indications") {
      return Promise.resolve({ data: options.perguntas ?? [], error: null })
    }
    return Promise.resolve({ data: options.respostas ?? [], error: null })
  })

  const from = vi.fn((table: string) => {
    let operation = "select"
    let isCount = false
    const answer = (single: boolean) => {
      if (options.errorTable === table) {
        return { data: null, count: null, error: { code: "XX000", message: "boom" } }
      }
      if (table === "locality_memberships") {
        const cidade =
          options.cidade === undefined ? { id: CIDADE, nome: "Manaus" } : options.cidade
        return {
          data:
            cidade === null
              ? null
              : { locality_id: cidade.id, localities: { city_name: cidade.nome } },
          count: null,
          error: null,
        }
      }
      if (table === "recommendation_requests") {
        if (isCount) return { data: null, count: options.resolvidas ?? 0, error: null }
        if (single) {
          return {
            data: options.pedido === undefined ? pedido : options.pedido,
            count: null,
            error: null,
          }
        }
        return { data: options.autores ?? [{ id: ID, author_id: USER }], count: null, error: null }
      }
      if (table === "profiles") {
        return {
          data: options.nomes ?? [{ user_id: USER, display_name: "Ana Verificada" }],
          count: null,
          error: null,
        }
      }
      if (table === "recommendation_replies" && operation === "insert") {
        if (options.insertError) return { data: null, count: null, error: options.insertError }
        return {
          data: options.gravada ?? { id: "novo-1", body: "Texto", created_at: DATA },
          count: null,
          error: null,
        }
      }
      return { data: null, count: null, error: null }
    }
    const query: Record<string, unknown> = {}
    query["select"] = (_fields: string, args?: { count?: string; head?: boolean }) => {
      isCount = args?.count === "exact" && args.head === true
      return query
    }
    query["eq"] = (column: string, value: unknown) => {
      eqCalls.push({ table, column, value })
      return query
    }
    query["in"] = (column: string, values: unknown) => {
      inCalls.push({ table, column, values })
      return query
    }
    for (const metodo of ["gte", "gt", "order", "limit"]) query[metodo] = () => query
    query["maybeSingle"] = async () => answer(true)
    query["single"] = async () => answer(true)
    query["insert"] = (value: unknown) => {
      operation = "insert"
      inserts.push({ table, value })
      return query
    }
    // O builder do PostgREST é awaitable; o stub precisa reproduzir esse contrato.
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder fluente do PostgREST
    Object.defineProperty(query, "then", {
      value: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(answer(false))),
    })
    return query
  })

  return { client: { from, rpc } as never, from, rpc, eqCalls, inCalls, inserts, rpcCalls }
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

describe("rotas de perguntas do app", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it.each([
    ["GET lista", () => listar(req("GET"))],
    ["GET detalhe", () => detalhe(req("GET"), context)],
    ["POST resposta", () => responder(req("POST", `${BASE}/${ID}/respostas`, "{}"), context)],
  ])("%s recusa ausência de sessão", async (_label, invoke) => {
    expect((await invoke()).status).toBe(401)
  })

  describe("porta do app (CSRF)", () => {
    it("recusa origem fora da lista", async () => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await responder(
        req("POST", `${BASE}/${ID}/respostas`, '{"texto":"Uma resposta"}', {
          ...headers,
          origin: "https://fora.example",
        }),
        context,
      )
      expect(resposta.status).toBe(403)
      expect(mock.inserts).toHaveLength(0)
    })

    it("escrita por cookie sem o cabeçalho do app é recusada", async () => {
      const mock = mockClient()
      authenticate(mock)
      const semCabecalho = { origin: "http://localhost:3000", "content-type": "application/json" }
      const resposta = await responder(
        req("POST", `${BASE}/${ID}/respostas`, '{"texto":"Uma resposta"}', semCabecalho),
        context,
      )
      expect(resposta.status).toBe(403)
      expect(mock.inserts).toHaveLength(0)
    })
  })

  describe("lista", () => {
    it("valida os parâmetros antes de consultar o banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      for (const busca of ["?filtro=tudo", "?limite=51", "?limite=0", "?depois=-1", "?depois=x"]) {
        expect((await listar(req("GET", `${BASE}${busca}`))).status).toBe(400)
      }
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("mapeia as linhas, a autoria e o nome de quem perguntou", async () => {
      const mock = mockClient({
        perguntas: [linha],
        autores: [{ id: ID, author_id: USER }],
        nomes: [{ user_id: USER, display_name: "Ana Verificada" }],
        resolvidas: 4,
      })
      authenticate(mock)
      const corpo = await json(await listar(req("GET")))
      expect(corpo["perguntas"]).toEqual([
        {
          id: ID,
          titulo: linha.title,
          categoria: "saude_bem_estar",
          criadaEm: DATA,
          resolvida: false,
          respostas: 2,
          propria: true,
          autor: "Ana Verificada",
        },
      ])
      expect(corpo["cidade"]).toBe("Manaus")
      expect(corpo["resolvidas"]).toBe(4)
      expect(corpo["proximo"]).toBeNull()
    })

    it("só pagina quando a página veio cheia", async () => {
      const cheia = mockClient({ perguntas: Array.from({ length: 20 }, () => linha) })
      authenticate(cheia)
      expect((await json(await listar(req("GET"))))["proximo"]).toBe("20")

      const curta = mockClient({ perguntas: [linha] })
      authenticate(curta)
      expect((await json(await listar(req("GET"))))["proximo"]).toBeNull()
    })

    it("o filtro da tela vira argumento da função, no servidor", async () => {
      const ajuda = mockClient({ perguntas: [] })
      authenticate(ajuda)
      await listar(req("GET", `${BASE}?filtro=ajuda`))
      expect(ajuda.rpcCalls[0]?.args).toMatchObject({ p_resolved: false, p_mine: false })

      const resolvidas = mockClient({ perguntas: [] })
      authenticate(resolvidas)
      await listar(req("GET", `${BASE}?filtro=resolvidas`))
      expect(resolvidas.rpcCalls[0]?.args).toMatchObject({ p_resolved: true })
      expect(resolvidas.rpcCalls[0]?.args).not.toHaveProperty("p_mine")

      const minhas = mockClient({ perguntas: [] })
      authenticate(minhas)
      await listar(req("GET", `${BASE}?filtro=minhas`))
      expect(minhas.rpcCalls[0]?.args).toMatchObject({ p_mine: true })
      expect(minhas.rpcCalls[0]?.args).not.toHaveProperty("p_resolved")
    })

    it("a cidade é a da sessão, pelo vínculo current, ignorando cidade e autoria da query", async () => {
      const mock = mockClient({ perguntas: [] })
      authenticate(mock)
      await listar(req("GET", `${BASE}?locality_id=${OUTRA_CIDADE}&mine=true&p_mine=true`))
      expect(mock.eqCalls).toContainEqual({
        table: "locality_memberships",
        column: "kind",
        value: "current",
      })
      expect(mock.rpcCalls[0]?.args).toMatchObject({ p_locality_id: CIDADE })
      expect(mock.rpcCalls[0]?.args).not.toMatchObject({ p_locality_id: OUTRA_CIDADE })
    })

    it("sem vínculo de cidade a lista é vazia, não erro", async () => {
      const mock = mockClient({ cidade: null })
      authenticate(mock)
      const resposta = await listar(req("GET"))
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({
        perguntas: [],
        proximo: null,
        cidade: "",
        resolvidas: 0,
      })
      expect(mock.rpcCalls).toHaveLength(0)
    })

    it("falha de leitura vira 503, nunca lista vazia", async () => {
      const mock = mockClient({ rpcError: { list_indications: { message: "boom" } } })
      authenticate(mock)
      const resposta = await listar(req("GET"))
      expect(resposta.status).toBe(503)
      const corpo = await json(resposta)
      expect(corpo).toEqual({ erro: "leitura-indisponivel" })
      expect(JSON.stringify(corpo)).not.toContain("boom")
    })
  })

  describe("detalhe", () => {
    it("devolve a pergunta, quem perguntou e as respostas", async () => {
      const mock = mockClient({
        respostas: [respostaDaConversa],
        nomes: [
          { user_id: USER, display_name: "Ana Verificada" },
          { user_id: OUTRA_PESSOA, display_name: "Helena Castro" },
        ],
      })
      authenticate(mock)
      const resposta = await detalhe(req("GET"), context)
      expect(resposta.status).toBe(200)
      const corpo = await json(resposta)
      expect(corpo["pergunta"]).toMatchObject({
        id: ID,
        titulo: linha.title,
        categoria: "saude_bem_estar",
        propria: true,
        autor: "Ana Verificada",
        cidade: "Manaus",
      })
      expect(corpo["respostas"]).toEqual([
        {
          id: respostaDaConversa.id,
          corpo: respostaDaConversa.body,
          autor: "Helena Castro",
          propria: false,
          criadaEm: DATA,
          removida: false,
        },
      ])
    })

    it("a resposta removida volta sem texto e sem autor", async () => {
      const mock = mockClient({
        respostas: [{ ...respostaDaConversa, author_id: null, body: null, is_removed: true }],
      })
      authenticate(mock)
      const corpo = await json(await detalhe(req("GET"), context))
      expect(corpo["respostas"]).toEqual([
        {
          id: respostaDaConversa.id,
          corpo: "",
          autor: "",
          propria: false,
          criadaEm: DATA,
          removida: true,
        },
      ])
    })

    it("id fora do formato é 404, sem consultar o banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      const invalido = { params: Promise.resolve({ id: "nao-e-uuid" }) }
      expect((await detalhe(req("GET"), invalido)).status).toBe(404)
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("pergunta inexistente ou fora do alcance é 404", async () => {
      const mock = mockClient({ pedido: null })
      authenticate(mock)
      expect((await detalhe(req("GET"), context)).status).toBe(404)
    })

    it("o portão da função de respostas também é 404", async () => {
      const mock = mockClient({
        rpcError: { list_question_replies: { code: "P0002", message: "request not found" } },
      })
      authenticate(mock)
      const resposta = await detalhe(req("GET"), context)
      expect(resposta.status).toBe(404)
      expect(JSON.stringify(await json(resposta))).not.toContain("not found")
    })

    it("falha de leitura é 503", async () => {
      const mock = mockClient({ rpcError: { list_question_replies: { message: "boom" } } })
      authenticate(mock)
      expect((await detalhe(req("GET"), context)).status).toBe(503)
    })
  })

  describe("responder", () => {
    it("grava com a autoria e a pergunta da sessão, ignorando o corpo", async () => {
      const mock = mockClient({
        gravada: { id: "r1", body: "A mesma equipe atendeu aqui.", created_at: DATA },
      })
      authenticate(mock)
      const resposta = await responder(
        req(
          "POST",
          `${BASE}/${ID}/respostas`,
          JSON.stringify({
            texto: "  A mesma equipe atendeu aqui.  ",
            author_id: OUTRA_PESSOA,
            request_id: OUTRA_CIDADE,
          }),
        ),
        context,
      )
      expect(resposta.status).toBe(201)
      expect(await json(resposta)).toEqual({
        resposta: { id: "r1", corpo: "A mesma equipe atendeu aqui.", criadaEm: DATA },
      })
      expect(mock.inserts).toEqual([
        {
          table: "recommendation_replies",
          value: { request_id: ID, author_id: USER, body: "A mesma equipe atendeu aqui." },
        },
      ])
    })

    it.each([
      ["texto vazio", { texto: "   " }],
      ["texto curto", { texto: "ok" }],
      ["texto acima do teto", { texto: "a".repeat(2001) }],
      ["texto que não é string", { texto: 7 }],
    ])("corpo inválido (%s) é 400", async (_label, corpo) => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await responder(
        req("POST", `${BASE}/${ID}/respostas`, JSON.stringify(corpo)),
        context,
      )
      expect(resposta.status).toBe(400)
      expect(mock.inserts).toHaveLength(0)
    })

    it("sem content-type JSON é 400", async () => {
      const mock = mockClient()
      authenticate(mock)
      const semTipo = { origin: "http://localhost:3000", "x-bivaque-app": "bivaque-spa" }
      const resposta = await responder(
        req("POST", `${BASE}/${ID}/respostas`, '{"texto":"Uma resposta"}', semTipo),
        context,
      )
      expect(resposta.status).toBe(400)
      expect(mock.inserts).toHaveLength(0)
    })

    it("pergunta que não é visível é 404, sem tentar gravar", async () => {
      const mock = mockClient({ pedido: null })
      authenticate(mock)
      const resposta = await responder(
        req("POST", `${BASE}/${ID}/respostas`, '{"texto":"Uma resposta"}'),
        context,
      )
      expect(resposta.status).toBe(404)
      expect(mock.inserts).toHaveLength(0)
    })

    it("recusa da RLS é 403 com a frase traduzida, sem a mensagem do Postgres", async () => {
      const mock = mockClient({
        insertError: { code: "42501", message: "new row violates row-level security policy" },
      })
      authenticate(mock)
      const resposta = await responder(
        req("POST", `${BASE}/${ID}/respostas`, '{"texto":"Uma resposta"}'),
        context,
      )
      expect(resposta.status).toBe(403)
      const corpo = await json(resposta)
      expect(corpo).toEqual({
        erro: "recusado",
        mensagem: "Sua conta não pode responder esta pergunta.",
      })
      expect(JSON.stringify(corpo)).not.toContain("row-level")
    })

    it("falha do banco na escrita é 503", async () => {
      const mock = mockClient({ errorTable: "recommendation_replies" })
      authenticate(mock)
      const resposta = await responder(
        req("POST", `${BASE}/${ID}/respostas`, '{"texto":"Uma resposta"}'),
        context,
      )
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "escrita-indisponivel" })
    })
  })
})
