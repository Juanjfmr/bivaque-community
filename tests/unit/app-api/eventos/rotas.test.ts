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
const CIDADE = "00000000-0000-4000-8000-0000000000aa"
const OUTRA_CIDADE = "00000000-0000-4000-8000-0000000000bb"
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
  status: "upcoming",
  organizer_id: USER,
  locality_id: CIDADE,
  localities: { city_name: "Manaus" },
}

type Options = {
  /** Cidade atual da sessão (vínculo `kind = current`). `null` = sem vínculo. */
  cidade?: { id: string; nome: string } | null
  event?: typeof event | null
  events?: (typeof event)[]
  mine?: string | null
  count?: number | null
  errorTable?: string
  rpcError?: string
  updateError?: { code: string; message: string } | null
}

function mockClient(options: Options = {}) {
  const eqCalls: Array<{ table: string; column: string; value: unknown }> = []
  const inserts: Array<{ table: string; value: unknown }> = []
  const upserts: unknown[] = []
  const updates: unknown[] = []
  const deletes: string[] = []
  const orCalls: string[] = []
  const donosDoRpc: unknown[] = []
  const rpc = function (this: unknown) {
    donosDoRpc.push(this)
    return Promise.resolve({
      data: options.rpcError === undefined ? "conversation-1" : null,
      error: options.rpcError === undefined ? null : { message: options.rpcError },
    })
  }

  const from = vi.fn((table: string) => {
    let operation = "select"
    let isCount = false
    const answer = (single = false) => {
      if (options.errorTable === table) {
        return { data: null, error: { message: "boom", code: "XX000" } }
      }
      if (table === "locality_memberships") {
        const cidade =
          options.cidade === undefined ? { id: CIDADE, nome: "Manaus" } : options.cidade
        return {
          data:
            cidade === null
              ? null
              : { locality_id: cidade.id, localities: { city_name: cidade.nome } },
          error: null,
        }
      }
      if (table === "events") {
        if (operation === "insert") return { data: { id: ID }, error: null }
        if (operation === "update") {
          if (options.updateError) return { data: null, error: options.updateError }
          return { data: { id: ID }, error: null }
        }
        if (single)
          return { data: options.event === undefined ? event : options.event, error: null }
        return { data: options.events ?? [event], error: null }
      }
      if (table === "event_rsvps") {
        if (operation === "upsert" || operation === "delete") return { data: null, error: null }
        if (isCount) {
          return {
            data: null,
            count: options.count === undefined ? 4 : options.count,
            error: null,
          }
        }
        return { data: { status: options.mine ?? "going" }, error: null }
      }
      if (table === "dm_messages") return { data: { id: "message-1" }, error: null }
      return { data: null, error: null }
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
    query["or"] = (filtro: string) => {
      orCalls.push(filtro)
      return query
    }
    for (const method of ["neq", "gte", "gt", "order"]) query[method] = () => query
    query["limit"] = () => query
    query["maybeSingle"] = async () => answer(true)
    query["single"] = async () => answer(true)
    query["insert"] = (value: unknown) => {
      operation = "insert"
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
    return query
  })

  return {
    client: { from, rpc } as never,
    from,
    rpc,
    eqCalls,
    inserts,
    upserts,
    updates,
    deletes,
    orCalls,
    donosDoRpc,
  }
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
  ])("%s recusa ausência de sessão", async (_label, invoke) => {
    expect((await invoke()).status).toBe(401)
  })

  describe("porta do app (CSRF)", () => {
    it.each([
      [
        "POST evento",
        () => criar(req("POST", BASE, "{}", { ...headers, origin: "https://fora.example" })),
      ],
      [
        "PATCH evento",
        () =>
          editar(
            req("PATCH", `${BASE}/${ID}`, "{}", { ...headers, origin: "https://fora.example" }),
            context,
          ),
      ],
      [
        "PUT presença",
        () =>
          presenca(
            req("PUT", `${BASE}/${ID}/presenca`, "{}", {
              ...headers,
              origin: "https://fora.example",
            }),
            context,
          ),
      ],
      [
        "DELETE presença",
        () =>
          cancelar(
            req("DELETE", `${BASE}/${ID}/presenca`, undefined, {
              ...headers,
              origin: "https://fora.example",
            }),
            context,
          ),
      ],
      [
        "POST pergunta",
        () =>
          perguntar(
            req("POST", `${BASE}/${ID}/perguntas`, "{}", {
              ...headers,
              origin: "https://fora.example",
            }),
            context,
          ),
      ],
    ])("%s recusa origem fora da lista", async (_label, invoke) => {
      const mock = mockClient()
      authenticate(mock)
      expect((await invoke()).status).toBe(403)
    })

    it("escrita por cookie sem o cabeçalho do app é recusada", async () => {
      const mock = mockClient()
      authenticate(mock)
      const semCabecalho = { origin: "http://localhost:3000", "content-type": "application/json" }
      expect((await criar(req("POST", BASE, "{}", semCabecalho))).status).toBe(403)
      expect(
        (await editar(req("PATCH", `${BASE}/${ID}`, "{}", semCabecalho), context)).status,
      ).toBe(403)
      expect(
        (await presenca(req("PUT", `${BASE}/${ID}/presenca`, "{}", semCabecalho), context)).status,
      ).toBe(403)
    })
  })

  describe("agenda", () => {
    it("valida os parâmetros antes de consultar o banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      expect((await listar(req("GET", `${BASE}?limite=51`))).status).toBe(400)
      expect((await listar(req("GET", `${BASE}?limite=0`))).status).toBe(400)
      expect((await listar(req("GET", `${BASE}?depois=invalido`))).status).toBe(400)
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("mapeia os resultados e só pagina quando a página veio cheia", async () => {
      const cheia = mockClient({ events: [event] })
      authenticate(cheia)
      const corpo = await json(await listar(req("GET", `${BASE}?limite=1`)))
      expect(corpo["eventos"]).toEqual([
        { id: ID, titulo: "Encontro", local: "Manaus", comecaEm: DATE, situacao: "upcoming" },
      ])
      // Cursor composto: o id desempata dois encontros no mesmo horário.
      expect(corpo["proximo"]).toBe(`${DATE}|${ID}`)

      const curta = mockClient({ events: [event] })
      authenticate(curta)
      const outra = await json(await listar(req("GET", `${BASE}?limite=2`)))
      expect(outra["proximo"]).toBeNull()
    })

    it("usa o cursor composto na consulta seguinte", async () => {
      const mock = mockClient({ events: [] })
      authenticate(mock)
      await listar(req("GET", `${BASE}?depois=${encodeURIComponent(`${DATE}|${ID}`)}`))
      expect(mock.orCalls[0]).toBe(`starts_at.gt."${DATE}",and(starts_at.eq."${DATE}",id.gt.${ID})`)
    })

    it("a cidade é a da sessão, pelo vínculo current", async () => {
      const mock = mockClient({ events: [] })
      authenticate(mock)
      await listar(req("GET", `${BASE}?locality_id=${OUTRA_CIDADE}`))
      expect(mock.eqCalls).toContainEqual({
        table: "locality_memberships",
        column: "user_id",
        value: USER,
      })
      expect(mock.eqCalls).toContainEqual({
        table: "locality_memberships",
        column: "kind",
        value: "current",
      })
      expect(mock.eqCalls).toContainEqual({ table: "events", column: "locality_id", value: CIDADE })
      expect(mock.eqCalls).not.toContainEqual({
        table: "events",
        column: "locality_id",
        value: OUTRA_CIDADE,
      })
    })

    it("sem vínculo de cidade a agenda é vazia, não erro", async () => {
      const mock = mockClient({ cidade: null })
      authenticate(mock)
      const resposta = await listar(req("GET"))
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ eventos: [], proximo: null })
    })

    it("falha de leitura vira 503, nunca lista vazia", async () => {
      const mock = mockClient({ errorTable: "events" })
      authenticate(mock)
      const resposta = await listar(req("GET"))
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "leitura-indisponivel" })
    })
  })

  describe("detalhe", () => {
    it("devolve cidade do evento, presença e autoria", async () => {
      const mock = mockClient({ count: 3, mine: "going" })
      authenticate(mock)
      const corpo = await json(await detalhe(req("GET"), context))
      expect(corpo["evento"]).toMatchObject({
        id: ID,
        titulo: "Encontro",
        cidade: "Manaus",
        situacao: "upcoming",
      })
      expect(corpo["presenca"]).toEqual({ confirmados: 3, minha: "going" })
      expect(corpo["souOrganizador"]).toBe(true)
      expect(corpo["visitante"]).toBe(false)
      // Mídia não sai como caminho do bucket: esta tela não desenha capa.
      expect(JSON.stringify(corpo)).not.toContain("cover_path")
    })

    it("encontro de outra cidade abre como visitante e sem presença", async () => {
      const mock = mockClient({ event: { ...event, locality_id: OUTRA_CIDADE } })
      authenticate(mock)
      const resposta = await detalhe(req("GET"), context)
      expect(resposta.status).toBe(200)
      const corpo = await json(resposta)
      expect(corpo["visitante"]).toBe(true)
      expect(corpo["presenca"]).toBeNull()
      // Não consulta presença para quem é de fora: a RLS negaria e um zero
      // viraria a mentira "ninguém confirmou".
      expect(mock.eqCalls).not.toContainEqual({
        table: "event_rsvps",
        column: "event_id",
        value: ID,
      })
    })

    it("evento inexistente é 404", async () => {
      const mock = mockClient({ event: null })
      authenticate(mock)
      expect((await detalhe(req("GET"), context)).status).toBe(404)
    })

    it("id fora do formato é 404, sem consultar o banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      const invalido = { params: Promise.resolve({ id: "nao-e-uuid" }) }
      expect((await detalhe(req("GET"), invalido)).status).toBe(404)
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("falha de leitura é 503", async () => {
      const mock = mockClient({ errorTable: "events" })
      authenticate(mock)
      expect((await detalhe(req("GET"), context)).status).toBe(503)
    })
  })

  describe("presença", () => {
    it("grava a ocorrência do encontro e devolve o que ficou", async () => {
      const mock = mockClient({ count: 4, mine: "going" })
      authenticate(mock)
      const resposta = await presenca(
        req("PUT", `${BASE}/${ID}/presenca`, '{"situacao":"going"}'),
        context,
      )
      expect(mock.upserts).toEqual([
        { event_id: ID, user_id: USER, status: "going", occurrence_date: DATE.slice(0, 10) },
      ])
      expect(await json(resposta)).toEqual({ presenca: { confirmados: 4, minha: "going" } })
    })

    it("cancela pela ocorrência e devolve minha null", async () => {
      const mock = mockClient({ count: 4 })
      authenticate(mock)
      const resposta = await cancelar(req("DELETE", `${BASE}/${ID}/presenca`), context)
      expect(mock.deletes).toContain("event_rsvps")
      expect(mock.eqCalls).toContainEqual({
        table: "event_rsvps",
        column: "occurrence_date",
        value: DATE.slice(0, 10),
      })
      expect(await json(resposta)).toEqual({ presenca: { confirmados: 4, minha: null } })
    })

    it("de outra cidade a presença é recusada antes do banco", async () => {
      const fora = mockClient({ event: { ...event, locality_id: OUTRA_CIDADE } })
      authenticate(fora)
      const resposta = await presenca(
        req("PUT", `${BASE}/${ID}/presenca`, '{"situacao":"going"}'),
        context,
      )
      expect(resposta.status).toBe(403)
      expect(await json(resposta)).toEqual({ erro: "de-outra-cidade" })
      expect(fora.upserts).toHaveLength(0)

      const cancelamento = await cancelar(req("DELETE", `${BASE}/${ID}/presenca`), context)
      expect(cancelamento.status).toBe(403)
      expect(fora.deletes).toHaveLength(0)
    })

    it("situação fora do enum é 400", async () => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await presenca(
        req("PUT", `${BASE}/${ID}/presenca`, '{"situacao":"talvez"}'),
        context,
      )
      expect(resposta.status).toBe(400)
      expect(mock.upserts).toHaveLength(0)
    })

    it("sem content-type JSON é 400", async () => {
      const mock = mockClient()
      authenticate(mock)
      const semTipo = { origin: "http://localhost:3000", "x-bivaque-app": "bivaque-spa" }
      const resposta = await presenca(
        req("PUT", `${BASE}/${ID}/presenca`, '{"situacao":"going"}', semTipo),
        context,
      )
      expect(resposta.status).toBe(400)
    })

    it("encontro inexistente é 404", async () => {
      const mock = mockClient({ event: null })
      authenticate(mock)
      expect(
        (await presenca(req("PUT", `${BASE}/${ID}/presenca`, '{"situacao":"going"}'), context))
          .status,
      ).toBe(404)
      expect((await cancelar(req("DELETE", `${BASE}/${ID}/presenca`), context)).status).toBe(404)
    })

    it("falha do banco na escrita é 503", async () => {
      const mock = mockClient({ errorTable: "event_rsvps" })
      authenticate(mock)
      const resposta = await presenca(
        req("PUT", `${BASE}/${ID}/presenca`, '{"situacao":"going"}'),
        context,
      )
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "escrita-indisponivel" })
    })
  })

  describe("criar e editar", () => {
    it("cria com a cidade e o organizador da sessão, ignorando o corpo", async () => {
      const mock = mockClient()
      authenticate(mock)
      const corpo = JSON.stringify({
        titulo: "Encontro",
        comecaEm: DATE,
        locality_id: OUTRA_CIDADE,
        organizer_id: "outro",
      })
      const resposta = await criar(req("POST", BASE, corpo))
      expect(resposta.status).toBe(201)
      expect(await json(resposta)).toEqual({ evento: { id: ID } })
      expect(mock.inserts[0]?.value).toMatchObject({
        organizer_id: USER,
        locality_id: CIDADE,
      })
    })

    it("sem vínculo de cidade não cria", async () => {
      const mock = mockClient({ cidade: null })
      authenticate(mock)
      const resposta = await criar(
        req("POST", BASE, JSON.stringify({ titulo: "Encontro", comecaEm: DATE })),
      )
      expect(resposta.status).toBe(403)
      expect(await json(resposta)).toEqual({ erro: "sem-cidade" })
      expect(mock.inserts).toHaveLength(0)
    })

    it.each([
      ["título de 1 caractere", { titulo: "a", comecaEm: DATE }],
      ["sem data", { titulo: "Encontro" }],
      ["local numérico", { titulo: "Encontro", comecaEm: DATE, local: 7 }],
    ])("corpo inválido (%s) é 400", async (_label, corpo) => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await criar(req("POST", BASE, JSON.stringify(corpo)))
      expect(resposta.status).toBe(400)
      expect(mock.inserts).toHaveLength(0)
    })

    it("PATCH de quem não organiza recusa e não chama update", async () => {
      const mock = mockClient({ event: { ...event, organizer_id: "outro" } })
      authenticate(mock)
      const resposta = await editar(
        req("PATCH", `${BASE}/${ID}`, JSON.stringify({ titulo: "Encontro", comecaEm: DATE })),
        context,
      )
      expect(resposta.status).toBe(403)
      expect(await json(resposta)).toEqual({ erro: "nao-organiza" })
      expect(mock.updates).toHaveLength(0)
    })

    it("PATCH sem capa preserva a capa gravada", async () => {
      const mock = mockClient()
      authenticate(mock)
      await editar(
        req("PATCH", `${BASE}/${ID}`, JSON.stringify({ titulo: "Novo título", comecaEm: DATE })),
        context,
      )
      expect(mock.updates[0]).not.toHaveProperty("cover_path")
    })

    it("PATCH com capa troca a capa", async () => {
      const mock = mockClient()
      authenticate(mock)
      await editar(
        req(
          "PATCH",
          `${BASE}/${ID}`,
          JSON.stringify({ titulo: "Novo título", comecaEm: DATE, capa: "" }),
        ),
        context,
      )
      expect(mock.updates[0]).toHaveProperty("cover_path", null)
    })

    it("PATCH recusado pela RLS depois da checagem de autoria é 403", async () => {
      const mock = mockClient({ updateError: { code: "42501", message: "denied" } })
      authenticate(mock)
      const resposta = await editar(
        req("PATCH", `${BASE}/${ID}`, JSON.stringify({ titulo: "Encontro", comecaEm: DATE })),
        context,
      )
      expect(resposta.status).toBe(403)
      expect(await json(resposta)).toEqual({ erro: "recusado" })
    })

    it("falha de banco no PATCH é 503", async () => {
      const mock = mockClient({ errorTable: "events" })
      authenticate(mock)
      const resposta = await editar(
        req("PATCH", `${BASE}/${ID}`, JSON.stringify({ titulo: "Encontro", comecaEm: DATE })),
        context,
      )
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "escrita-indisponivel" })
    })

    it("falha de banco no POST é 503", async () => {
      const mock = mockClient({ errorTable: "events" })
      authenticate(mock)
      const resposta = await criar(
        req("POST", BASE, JSON.stringify({ titulo: "Encontro", comecaEm: DATE })),
      )
      expect(resposta.status).toBe(503)
    })
  })

  describe("pergunta ao organizador", () => {
    const foraDoProprio = { ...event, organizer_id: "outro-organizador" }

    it("abre a conversa NO cliente, grava o texto aparado e devolve os ids", async () => {
      const mock = mockClient({ event: foraDoProprio })
      authenticate(mock)
      const resposta = await perguntar(
        req("POST", `${BASE}/${ID}/perguntas`, JSON.stringify({ texto: "  Olá  " })),
        context,
      )
      expect(resposta.status).toBe(201)
      expect(await json(resposta)).toEqual({
        conversaId: "conversation-1",
        mensagemId: "message-1",
      })
      // Regressão de 05/11: chamar a função solta perdia o `this` e virava 503.
      expect(mock.donosDoRpc[0]).toBe(mock.client)
      expect(mock.inserts).toContainEqual({
        table: "dm_messages",
        value: { conversation_id: "conversation-1", sender_id: USER, content: "Olá" },
      })
    })

    it("o próprio organizador não pergunta", async () => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await perguntar(
        req("POST", `${BASE}/${ID}/perguntas`, JSON.stringify({ texto: "Oi" })),
        context,
      )
      expect(resposta.status).toBe(403)
      expect(JSON.stringify(mock.inserts)).not.toContain("dm_messages")
    })

    it("de outra cidade a pergunta é recusada antes do banco", async () => {
      const mock = mockClient({ event: { ...foraDoProprio, locality_id: OUTRA_CIDADE } })
      authenticate(mock)
      const resposta = await perguntar(
        req("POST", `${BASE}/${ID}/perguntas`, JSON.stringify({ texto: "Oi" })),
        context,
      )
      expect(resposta.status).toBe(403)
      expect(await json(resposta)).toEqual({ erro: "de-outra-cidade" })
      expect(mock.donosDoRpc).toHaveLength(0)
    })

    it.each([
      ["texto vazio", { texto: "   " }],
      ["texto acima do teto", { texto: "a".repeat(2001) }],
      ["texto que não é string", { texto: 3 }],
    ])("corpo inválido (%s) é 400", async (_label, corpo) => {
      const mock = mockClient({ event: foraDoProprio })
      authenticate(mock)
      const resposta = await perguntar(
        req("POST", `${BASE}/${ID}/perguntas`, JSON.stringify(corpo)),
        context,
      )
      expect(resposta.status).toBe(400)
    })

    it("recusa da função do banco é 403 com a frase traduzida", async () => {
      const mock = mockClient({ event: foraDoProprio, rpcError: "blocked" })
      authenticate(mock)
      const resposta = await perguntar(
        req("POST", `${BASE}/${ID}/perguntas`, JSON.stringify({ texto: "Oi" })),
        context,
      )
      expect(resposta.status).toBe(403)
      expect(await json(resposta)).toEqual({
        erro: "recusado",
        mensagem: "Não é possível enviar a esta pessoa.",
      })
    })

    it("encontro inexistente é 404", async () => {
      const mock = mockClient({ event: null })
      authenticate(mock)
      expect(
        (
          await perguntar(
            req("POST", `${BASE}/${ID}/perguntas`, JSON.stringify({ texto: "Oi" })),
            context,
          )
        ).status,
      ).toBe(404)
    })

    it("falha de banco na mensagem é 503", async () => {
      const mock = mockClient({ event: foraDoProprio, errorTable: "dm_messages" })
      authenticate(mock)
      const resposta = await perguntar(
        req("POST", `${BASE}/${ID}/perguntas`, JSON.stringify({ texto: "Oi" })),
        context,
      )
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "escrita-indisponivel" })
    })
  })
})
