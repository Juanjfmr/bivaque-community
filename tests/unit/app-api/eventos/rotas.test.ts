import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as perguntar } from "web/app/api/app/eventos/[id]/perguntas/route"
import { DELETE as cancelar, PUT as presenca } from "web/app/api/app/eventos/[id]/presenca/route"
import { GET as detalhe, PATCH as editar } from "web/app/api/app/eventos/[id]/route"
import { POST as criar, GET as listar } from "web/app/api/app/eventos/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app/eventos"
const ID = "10000000-0000-4000-8000-000000000001"
const USER = "10000000-0000-4000-8000-000000000010"
const DATE = "2026-12-01T12:00:00.000Z"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const context = { params: Promise.resolve({ id: ID }) }
const event = {
  id: ID,
  title: "Encontro",
  description: "Descrição",
  venue: "Manaus",
  starts_at: DATE,
  ends_at: null,
  status: "scheduled",
  cover_path: null,
  organizer_id: USER,
}

type Options = {
  locality?: string | null
  event?: typeof event | null
  events?: (typeof event)[]
  mine?: string | null
  count?: number
  errorTable?: string
  rpcError?: string
}

function mockClient(options: Options = {}) {
  const eqCalls: Array<{ table: string; column: string; value: unknown }> = []
  const inserts: Array<{ table: string; value: unknown }> = []
  const upserts: unknown[] = []
  const updates: unknown[] = []
  const deletes: string[] = []
  const rpc = vi.fn(async () => ({
    data: "conversation-1",
    error: options.rpcError ? { message: options.rpcError } : null,
  }))
  const from = vi.fn((table: string) => {
    let operation = "select"
    let selection = ""
    let isCount = false
    let inserted: unknown
    const answer = (single = false) => {
      if (options.errorTable === table)
        return { data: null, error: { message: "boom", code: "XX000" } }
      if (table === "locality_memberships")
        return {
          data:
            options.locality === null
              ? null
              : { locality_id: options.locality ?? "cidade-da-sessao" },
          error: null,
        }
      if (table === "events") {
        if (operation === "insert") return { data: { id: ID }, error: null }
        if (operation === "update") return { data: { id: ID }, error: null }
        if (single)
          return { data: options.event === undefined ? event : options.event, error: null }
        return { data: options.events ?? [event], error: null }
      }
      if (table === "event_rsvps") {
        if (operation === "upsert" || operation === "delete") return { data: null, error: null }
        if (isCount) return { data: null, count: options.count ?? 4, error: null }
        return { data: { status: options.mine ?? "going" }, error: null }
      }
      if (table === "dm_messages") return { data: { id: "message-1" }, error: null }
      return { data: null, error: null }
    }
    const query: Record<string, unknown> = {}
    query["select"] = (fields: string, args?: { count?: string; head?: boolean }) => {
      selection = fields
      isCount = args?.count === "exact" && args.head === true
      return query
    }
    query["eq"] = (column: string, value: unknown) => {
      eqCalls.push({ table, column, value })
      return query
    }
    for (const method of ["neq", "gte", "gt", "order"]) query[method] = () => query
    query["limit"] = () =>
      table === "events" && operation === "select" ? Promise.resolve(answer()) : query
    query["maybeSingle"] = async () => answer(true)
    query["single"] = async () => answer(true)
    query["insert"] = (value: unknown) => {
      operation = "insert"
      inserted = value
      inserts.push({ table, value })
      return query
    }
    query["upsert"] = (value: unknown) => {
      operation = "upsert"
      upserts.push(value)
      return query
    }
    query["update"] = (value: unknown) => {
      operation = "update"
      updates.push(value)
      return query
    }
    query["delete"] = () => {
      operation = "delete"
      deletes.push(table)
      return query
    }
    // O builder PostgREST é awaitable; o stub precisa reproduzir esse contrato.
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder fluente do PostgREST
    Object.defineProperty(query, "then", {
      value: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(answer())),
    })
    void selection
    void inserted
    return query
  })
  return { client: { from, rpc } as never, from, rpc, eqCalls, inserts, upserts, updates, deletes }
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

describe("rotas de eventos do app", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it.each([
    ["GET agenda", () => listar(req("GET"))],
    ["POST evento", () => criar(req("POST", BASE, "{}"))],
    ["GET detalhe", () => detalhe(req("GET"), context)],
    ["PATCH evento", () => editar(req("PATCH", `${BASE}/${ID}`, "{}"), context)],
    ["PUT presença", () => presenca(req("PUT", `${BASE}/${ID}/presenca`, "{}"), context)],
    ["DELETE presença", () => cancelar(req("DELETE", `${BASE}/${ID}/presenca`), context)],
    ["POST pergunta", () => perguntar(req("POST", `${BASE}/${ID}/perguntas`, "{}"), context)],
  ])("%s exige sessão", async (_name, invoke) => expect((await invoke()).status).toBe(401))

  it("recusa origem externa e cookie sem o cabeçalho da SPA", async () => {
    const mock = mockClient()
    authenticate(mock)
    expect(
      (await criar(req("POST", BASE, "{}", { ...headers, origin: "https://fora.example" }))).status,
    ).toBe(403)
    expect(
      (
        await criar(
          req("POST", BASE, "{}", { origin: headers.origin, "content-type": "application/json" }),
        )
      ).status,
    ).toBe(403)
  })

  it.each(["0", "51"])("limite=%s é inválido", async (limite) => {
    authenticate(mockClient())
    expect((await listar(req("GET", `${BASE}?limite=${limite}`))).status).toBe(400)
  })

  it("depois inválido é 400", async () => {
    authenticate(mockClient())
    expect((await listar(req("GET", `${BASE}?depois=abc`))).status).toBe(400)
  })

  it.each([
    ["título curto", { titulo: "x", comecaEm: DATE }],
    ["sem começo", { titulo: "Evento" }],
    ["local numérico", { titulo: "Evento", comecaEm: DATE, local: 3 }],
  ])("POST evento rejeita %s", async (_label, body) => {
    authenticate(mockClient())
    const response = await criar(req("POST", BASE, JSON.stringify(body)))
    expect(response.status).toBe(400)
    expect((await json(response))["erro"]).toBe("dados-invalidos")
  })

  it("POST evento exige content-type JSON", async () => {
    authenticate(mockClient())
    const response = await criar(
      req("POST", BASE, JSON.stringify({ titulo: "Encontro", comecaEm: DATE }), {
        origin: headers.origin,
        "x-bivaque-app": "bivaque-spa",
      }),
    )
    expect(response.status).toBe(400)
  })

  it("PUT presença e POST pergunta validam seus corpos", async () => {
    authenticate(mockClient())
    expect(
      (await presenca(req("PUT", `${BASE}/${ID}/presenca`, '{"situacao":"talvez"}'), context))
        .status,
    ).toBe(400)
    expect(
      (await perguntar(req("POST", `${BASE}/${ID}/perguntas`, '{"texto":""}'), context)).status,
    ).toBe(400)
    expect(
      (
        await perguntar(
          req("POST", `${BASE}/${ID}/perguntas`, JSON.stringify({ texto: "x".repeat(2001) })),
          context,
        )
      ).status,
    ).toBe(400)
  })

  it.each([
    ["GET detalhe", () => detalhe(req("GET"), context)],
    [
      "PATCH",
      () =>
        editar(
          req("PATCH", `${BASE}/${ID}`, JSON.stringify({ titulo: "Evento", comecaEm: DATE })),
          context,
        ),
    ],
    [
      "PUT presença",
      () => presenca(req("PUT", `${BASE}/${ID}/presenca`, '{"situacao":"going"}'), context),
    ],
    ["DELETE presença", () => cancelar(req("DELETE", `${BASE}/${ID}/presenca`), context)],
  ])("%s invisível é 404", async (_label, invoke) => {
    const mock = mockClient({ event: null })
    authenticate(mock)
    const response = await invoke(mock)
    expect(response.status).toBe(404)
    expect(await json(response)).toEqual({ erro: "evento-nao-encontrado" })
  })

  it("PATCH de outro organizador recusa e não chama update", async () => {
    const mock = mockClient({ event: { ...event, organizer_id: "outro" } })
    authenticate(mock)
    const response = await editar(
      req("PATCH", `${BASE}/${ID}`, JSON.stringify({ titulo: "Evento", comecaEm: DATE })),
      context,
    )
    expect(response.status).toBe(403)
    expect(await json(response)).toEqual({ erro: "nao-organiza" })
    expect(mock.updates).toHaveLength(0)
  })

  it("falhas de leitura retornam 503, nunca lista vazia", async () => {
    const list = mockClient({ errorTable: "events" })
    authenticate(list)
    const listResponse = await listar(req("GET"))
    expect(listResponse.status).toBe(503)
    expect(await json(listResponse)).toEqual({ erro: "leitura-indisponivel" })
    const single = mockClient({ errorTable: "events" })
    authenticate(single)
    expect((await detalhe(req("GET"), context)).status).toBe(503)
  })

  it("GET lista mapeia resultados e pagina somente quando cheia", async () => {
    const item = { ...event }
    const short = mockClient({ events: [item] })
    authenticate(short)
    expect(await json(await listar(req("GET", `${BASE}?limite=2`)))).toEqual({
      eventos: [
        { id: ID, titulo: "Encontro", local: "Manaus", comecaEm: DATE, situacao: "scheduled" },
      ],
      proximo: null,
    })
    const full = mockClient({ events: [item] })
    authenticate(full)
    expect((await json(await listar(req("GET", `${BASE}?limite=1`))))["proximo"]).toBe(DATE)
  })

  it("agenda usa a localidade da sessão, não query string, e aceita cidade ausente", async () => {
    const mock = mockClient()
    authenticate(mock)
    await listar(req("GET", `${BASE}?locality_id=falsa`))
    expect(mock.eqCalls).toContainEqual({
      table: "events",
      column: "locality_id",
      value: "cidade-da-sessao",
    })
    expect(mock.eqCalls).toContainEqual({
      table: "locality_memberships",
      column: "user_id",
      value: USER,
    })
    const empty = mockClient({ locality: null })
    authenticate(empty)
    expect(await json(await listar(req("GET")))).toEqual({ eventos: [], proximo: null })
    const noCity = mockClient({ locality: null })
    authenticate(noCity)
    const created = await criar(
      req("POST", BASE, JSON.stringify({ titulo: "Evento", comecaEm: DATE })),
    )
    expect(created.status).toBe(403)
    expect(await json(created)).toEqual({ erro: "sem-cidade" })
  })

  it("GET detalhe mapeia presença e organizador nos dois estados", async () => {
    const owner = mockClient({ count: 7, mine: "interested" })
    authenticate(owner)
    expect(await json(await detalhe(req("GET"), context))).toMatchObject({
      evento: {
        id: ID,
        titulo: "Encontro",
        descricao: "Descrição",
        local: "Manaus",
        comecaEm: DATE,
      },
      presenca: { confirmados: 7, minha: "interested" },
      souOrganizador: true,
    })
    const other = mockClient({ event: { ...event, organizer_id: "other" }, count: 2 })
    authenticate(other)
    expect((await json(await detalhe(req("GET"), context)))["souOrganizador"]).toBe(false)
  })

  it("PUT presença persiste os identificadores e a ocorrência corretos e devolve valores recalculados", async () => {
    const mock = mockClient({ count: 4, mine: "going" })
    authenticate(mock)
    const response = await presenca(
      req("PUT", `${BASE}/${ID}/presenca`, '{"situacao":"going"}'),
      context,
    )
    expect(mock.upserts).toEqual([
      { event_id: ID, user_id: USER, status: "going", occurrence_date: DATE.slice(0, 10) },
    ])
    expect(await json(response)).toEqual({ presenca: { confirmados: 4, minha: "going" } })
  })

  it("DELETE presença remove por evento, usuário e data e devolve minha null", async () => {
    const mock = mockClient({ count: 4 })
    authenticate(mock)
    const response = await cancelar(req("DELETE", `${BASE}/${ID}/presenca`), context)
    expect(mock.deletes).toEqual(["event_rsvps"])
    expect(mock.eqCalls).toContainEqual({ table: "event_rsvps", column: "user_id", value: USER })
    expect(mock.eqCalls).toContainEqual({
      table: "event_rsvps",
      column: "occurrence_date",
      value: DATE.slice(0, 10),
    })
    expect(await json(response)).toEqual({ presenca: { confirmados: 4, minha: null } })
  })

  it("POST cria com localidade e organizador da sessão, ignorando valores do corpo", async () => {
    const mock = mockClient()
    authenticate(mock)
    const response = await criar(
      req(
        "POST",
        BASE,
        JSON.stringify({
          titulo: "Encontro",
          comecaEm: DATE,
          locality_id: "falsa",
          organizer_id: "falso",
        }),
      ),
    )
    expect(response.status).toBe(201)
    expect(await json(response)).toEqual({ evento: { id: ID } })
    expect(mock.inserts[0]).toEqual({
      table: "events",
      value: expect.objectContaining({ locality_id: "cidade-da-sessao", organizer_id: USER }),
    })
  })

  it("PATCH atualiza sem alterar escopo", async () => {
    const mock = mockClient()
    authenticate(mock)
    const response = await editar(
      req("PATCH", `${BASE}/${ID}`, JSON.stringify({ titulo: "Evento", comecaEm: DATE })),
      context,
    )
    expect(response.status).toBe(200)
    expect(await json(response)).toEqual({ evento: { id: ID } })
    expect(mock.updates[0]).not.toHaveProperty("locality_id")
    expect(mock.updates[0]).not.toHaveProperty("community_id")
    expect(mock.updates[0]).not.toHaveProperty("group_id")
  })

  it("POST pergunta traduz bloqueio, recusa organizador e grava mensagem normalizada", async () => {
    const blocked = mockClient({ event: { ...event, organizer_id: "other" }, rpcError: "blocked" })
    authenticate(blocked)
    const blockedResponse = await perguntar(
      req("POST", `${BASE}/${ID}/perguntas`, '{"texto":"Oi"}'),
      context,
    )
    expect(blockedResponse.status).toBe(403)
    expect((await json(blockedResponse))["mensagem"]).toBe("Não é possível enviar a esta pessoa.")

    const owner = mockClient()
    authenticate(owner)
    expect(
      (await perguntar(req("POST", `${BASE}/${ID}/perguntas`, '{"texto":"Oi"}'), context)).status,
    ).toBe(403)

    const member = mockClient({ event: { ...event, organizer_id: "other" } })
    authenticate(member)
    const response = await perguntar(
      req("POST", `${BASE}/${ID}/perguntas`, JSON.stringify({ texto: "  Olá  " })),
      context,
    )
    expect(response.status).toBe(201)
    expect(await json(response)).toEqual({ conversaId: "conversation-1", mensagemId: "message-1" })
    expect(member.inserts).toContainEqual({
      table: "dm_messages",
      value: { conversation_id: "conversation-1", sender_id: USER, content: "Olá" },
    })
  })

  it("erro de escrita retorna 503", async () => {
    const mock = mockClient({ errorTable: "events" })
    authenticate(mock)
    const response = await criar(
      req("POST", BASE, JSON.stringify({ titulo: "Evento", comecaEm: DATE })),
    )
    expect(response.status).toBe(503)
    expect(await json(response)).toEqual({ erro: "escrita-indisponivel" })
  })

  // Regressão de 05/11: a rota fazia `const rpc = client.rpc` e chamava a
  // função solta, perdendo o `this` — em runtime virava 503 "cannot read
  // properties of undefined (reading 'rest')". O caso só pega isso se olhar
  // QUEM é o `this` da chamada.
  it("pergunta abre a conversa NO cliente, sem perder o this", async () => {
    const mock = mockClient({ event: { ...event, organizer_id: "outro-organizador" } })
    const donos: unknown[] = []
    ;(mock.client as unknown as { rpc: unknown }).rpc = function (this: unknown) {
      donos.push(this)
      return Promise.resolve({ data: "conversation-1", error: null })
    }
    authenticate(mock)
    const resposta = await perguntar(
      req("POST", `${BASE}/${ID}/perguntas`, '{"texto":"Vai ter estacionamento?"}'),
      context,
    )
    expect(resposta.status).toBe(201)
    expect(donos[0]).toBe(mock.client)
  })
})
