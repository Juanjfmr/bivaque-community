import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as mudarResolucao } from "web/app/api/app/perguntas/[id]/resolucao/route"
import { POST as responder } from "web/app/api/app/perguntas/[id]/respostas/route"
import { GET as detalhe } from "web/app/api/app/perguntas/[id]/route"
import { DELETE as deixarDeSeguir, PUT as seguir } from "web/app/api/app/perguntas/[id]/salvo/route"
import { GET as listar } from "web/app/api/app/perguntas/route"
import { GET as listarSalvas } from "web/app/api/app/perguntas/salvas/route"
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
  group_id: null,
  localities: { city_name: "Manaus" },
  groups: null,
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
  salva?: boolean
  salvas?: string[]
  pedidos?: Array<{
    id: string
    title: string
    category: string
    created_at: string
    is_resolved: boolean
  }>
  saveError?: { code: string; message: string }
}

function mockClient(options: Options = {}) {
  const eqCalls: Array<{ table: string; column: string; value: unknown }> = []
  const inCalls: Array<{ table: string; column: string; values: unknown }> = []
  const inserts: Array<{ table: string; value: unknown }> = []
  const deletes: string[] = []
  const rpcCalls: Array<{ nome: string; args: Record<string, unknown> }> = []

  const rpc = vi.fn((nome: string, args: Record<string, unknown>) => {
    rpcCalls.push({ nome, args })
    const falha = options.rpcError?.[nome]
    if (falha) return Promise.resolve({ data: null, error: falha })
    if (nome === "list_indications") {
      return Promise.resolve({ data: options.perguntas ?? [], error: null })
    }
    if (nome === "count_indications") {
      return Promise.resolve({ data: options.resolvidas ?? 0, error: null })
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
        if (options.pedidos !== undefined)
          return { data: options.pedidos, count: null, error: null }
        return { data: options.autores ?? [{ id: ID, author_id: USER }], count: null, error: null }
      }
      if (table === "recommendation_saves") {
        if (operation === "insert" || operation === "delete") {
          return { data: null, count: null, error: options.saveError ?? null }
        }
        if (options.salvas !== undefined) {
          return {
            data: options.salvas.map((request_id) => ({ request_id })),
            count: null,
            error: null,
          }
        }
        return {
          data: single && options.salva === true ? { request_id: ID } : null,
          count: null,
          error: null,
        }
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
    query["delete"] = () => {
      operation = "delete"
      deletes.push(table)
      return query
    }
    // O builder do PostgREST é awaitable; o stub precisa reproduzir esse contrato.
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder fluente do PostgREST
    Object.defineProperty(query, "then", {
      value: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(answer(false))),
    })
    return query
  })

  return { client: { from, rpc } as never, from, rpc, eqCalls, inCalls, inserts, deletes, rpcCalls }
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

/** Os argumentos da lista; a contagem também é RPC, e a ordem não importa. */
function indications(mock: ReturnType<typeof mockClient>) {
  return mock.rpcCalls.find((chamada) => chamada.nome === "list_indications")?.args
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
    ["POST resolução", () => mudarResolucao(req("POST", `${BASE}/${ID}/resolucao`, "{}"), context)],
    ["PUT salvo", () => seguir(req("PUT"), context)],
    ["DELETE salvo", () => deixarDeSeguir(req("DELETE"), context)],
    ["GET salvas", () => listarSalvas(req("GET", `${BASE}/salvas`))],
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

    it("o seguimento também exige a porta do app", async () => {
      const mock = mockClient()
      authenticate(mock)
      expect(
        (
          await seguir(
            req("PUT", BASE, undefined, { ...headers, origin: "https://fora.example" }),
            context,
          )
        ).status,
      ).toBe(403)
      expect(
        (
          await deixarDeSeguir(
            req("DELETE", BASE, undefined, { ...headers, origin: "https://fora.example" }),
            context,
          )
        ).status,
      ).toBe(403)
      expect(mock.inserts).toHaveLength(0)
      expect(mock.deletes).toHaveLength(0)
    })
  })

  describe("lista", () => {
    it("valida os parâmetros antes de consultar o banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      for (const busca of [
        "?filtro=tudo",
        "?limite=51",
        "?limite=0",
        "?depois=-1",
        "?depois=x",
        "?topico=livre",
      ]) {
        expect((await listar(req("GET", `${BASE}${busca}`))).status).toBe(400)
      }
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("o tópico da lista fechada vira p_category da função, no servidor", async () => {
      const mock = mockClient({ perguntas: [] })
      authenticate(mock)
      await listar(req("GET", `${BASE}?topico=moradia`))
      expect(indications(mock)).toMatchObject({ p_category: "moradia" })

      const semTopico = mockClient({ perguntas: [] })
      authenticate(semTopico)
      await listar(req("GET", `${BASE}`))
      expect(indications(semTopico)).not.toHaveProperty("p_category")

      const vazio = mockClient({ perguntas: [] })
      authenticate(vazio)
      await listar(req("GET", `${BASE}?topico=`))
      expect(indications(vazio)).not.toHaveProperty("p_category")
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
          autorId: USER,
          grupo: null,
        },
      ])
      expect(corpo["cidade"]).toBe("Manaus")
      expect(corpo["resolvidas"]).toBe(4)
      expect(corpo["proximo"]).toBeNull()
    })

    it("a linha de origem dupla chega na cidade com o nome do grupo", async () => {
      // RUN-178: a mesma linha que o grupo lê aparece nas Indicações da cidade
      // com o nome do grupo — o campo aditivo `grupo` é o que a tela nomeia.
      const mock = mockClient({
        perguntas: [
          {
            ...linha,
            group_id: "40000000-0000-4000-8000-000000000001",
            group_name: "Grupo de Corrida",
          },
        ],
      })
      authenticate(mock)
      const corpo = await json(await listar(req("GET")))
      expect((corpo["perguntas"] as Record<string, unknown>[])[0]).toMatchObject({
        id: ID,
        grupo: { id: "40000000-0000-4000-8000-000000000001", nome: "Grupo de Corrida" },
      })
    })

    it("a contagem da cidade usa a régua da lista, não um atalho na tabela", async () => {
      // A pergunta de grupo e o que a pessoa ocultou entram e saem pela mesma
      // função que lista (RUN-178); a rota não conta linhas por conta própria.
      const mock = mockClient({ perguntas: [], resolvidas: 7 })
      authenticate(mock)
      const corpo = await json(await listar(req("GET")))
      expect(corpo["resolvidas"]).toBe(7)
      expect(mock.rpcCalls.find((chamada) => chamada.nome === "count_indications")?.args).toEqual({
        p_locality_id: CIDADE,
      })
      expect(
        mock.from.mock.calls.filter(([tabela]) => tabela === "recommendation_requests"),
      ).toHaveLength(0)
    })

    it("a contagem é pedida só na primeira página", async () => {
      const mock = mockClient({ perguntas: [], resolvidas: 7 })
      authenticate(mock)
      await listar(req("GET", `${BASE}?depois=20`))
      expect(mock.rpcCalls.some((chamada) => chamada.nome === "count_indications")).toBe(false)
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
      expect(indications(ajuda)).toMatchObject({ p_resolved: false, p_mine: false })

      const resolvidas = mockClient({ perguntas: [] })
      authenticate(resolvidas)
      await listar(req("GET", `${BASE}?filtro=resolvidas`))
      expect(indications(resolvidas)).toMatchObject({ p_resolved: true })
      expect(indications(resolvidas)).not.toHaveProperty("p_mine")

      const minhas = mockClient({ perguntas: [] })
      authenticate(minhas)
      await listar(req("GET", `${BASE}?filtro=minhas`))
      expect(indications(minhas)).toMatchObject({ p_mine: true })
      expect(indications(minhas)).not.toHaveProperty("p_resolved")
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
      expect(indications(mock)).toMatchObject({ p_locality_id: CIDADE })
      expect(indications(mock)).not.toMatchObject({ p_locality_id: OUTRA_CIDADE })
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
        autorId: USER,
        cidade: "Manaus",
        grupo: null,
      })
      expect(corpo["respostas"]).toEqual([
        {
          id: respostaDaConversa.id,
          corpo: respostaDaConversa.body,
          autor: "Helena Castro",
          autorId: OUTRA_PESSOA,
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
          autorId: "",
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

    it("diz se a pessoa está seguindo a pergunta, pela própria sessão", async () => {
      const mock = mockClient({ salva: true })
      authenticate(mock)
      const corpo = await json(await detalhe(req("GET"), context))
      expect((corpo["pergunta"] as Record<string, unknown>)["salva"]).toBe(true)
      expect(mock.eqCalls).toContainEqual({
        table: "recommendation_saves",
        column: "user_id",
        value: USER,
      })
      expect(mock.eqCalls).toContainEqual({
        table: "recommendation_saves",
        column: "request_id",
        value: ID,
      })
    })

    it("quem não segue lê o marcador desligado", async () => {
      const mock = mockClient()
      authenticate(mock)
      const corpo = await json(await detalhe(req("GET"), context))
      expect((corpo["pergunta"] as Record<string, unknown>)["salva"]).toBe(false)
    })

    it("a origem dupla nomeia o grupo na ficha", async () => {
      // RUN-178: a pergunta que nasceu num grupo Aberto abre na ficha normal e
      // diz de onde veio, para a pessoa chegar ao grupo.
      const mock = mockClient({
        pedido: {
          ...pedido,
          group_id: "40000000-0000-4000-8000-000000000001",
          groups: { name: "Grupo de Corrida" },
        },
      })
      authenticate(mock)
      const corpo = await json(await detalhe(req("GET"), context))
      expect((corpo["pergunta"] as Record<string, unknown>)["grupo"]).toEqual({
        id: "40000000-0000-4000-8000-000000000001",
        nome: "Grupo de Corrida",
      })
    })
  })

  describe("seguir respostas", () => {
    it("grava com o usuário da sessão e devolve o estado lido do banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      expect(await json(await seguir(req("PUT"), context))).toEqual({ salvo: true })
      expect(mock.inserts).toEqual([
        { table: "recommendation_saves", value: { user_id: USER, request_id: ID } },
      ])
      expect(await json(await deixarDeSeguir(req("DELETE"), context))).toEqual({ salvo: false })
      expect(mock.deletes).toContain("recommendation_saves")
    })

    it("seguir duas vezes é o mesmo estado", async () => {
      const mock = mockClient({ saveError: { code: "23505", message: "duplicate key" } })
      authenticate(mock)
      expect((await json(await seguir(req("PUT"), context))).salvo).toBe(true)
    })

    it("id fora do formato é 404, sem consultar o banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      const invalido = { params: Promise.resolve({ id: "nao-e-uuid" }) }
      expect((await seguir(req("PUT"), invalido)).status).toBe(404)
      expect((await deixarDeSeguir(req("DELETE"), invalido)).status).toBe(404)
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("pergunta que não é visível é 404 ao seguir, não 403 de policy", async () => {
      const mock = mockClient({ pedido: null })
      authenticate(mock)
      const resposta = await seguir(req("PUT"), context)
      expect(resposta.status).toBe(404)
      expect(mock.inserts).toHaveLength(0)
    })

    it("pergunta apagada não é salva", async () => {
      const mock = mockClient()
      authenticate(mock)
      expect((await seguir(req("PUT"), context)).status).toBe(200)
      expect(mock.eqCalls).toContainEqual({
        table: "recommendation_requests",
        column: "is_deleted",
        value: false,
      })
    })

    it("seguir a linha de origem dupla é aceito pela policy nova", async () => {
      // RUN-178: `recommendation_saves_insert_own` passou a aceitar o que é
      // visível — a linha dupla da cidade. Nada de 403 por origem de grupo.
      const mock = mockClient()
      authenticate(mock)
      const resposta = await seguir(req("PUT"), context)
      expect(resposta.status).toBe(200)
      expect(mock.inserts).toEqual([
        { table: "recommendation_saves", value: { user_id: USER, request_id: ID } },
      ])
    })

    it("a recusa que sobra é 403 sem eco da policy e sem a frase de grupo", async () => {
      // O 403 que resta é o de pergunta fora do alcance de quem pediu — a frase
      // antiga ("perguntas de grupo ainda não podem ser seguidas") saiu de
      // circulação com a policy nova.
      const mock = mockClient({
        saveError: { code: "42501", message: 'new row violates row-level security policy "x"' },
      })
      authenticate(mock)
      const resposta = await seguir(req("PUT"), context)
      expect(resposta.status).toBe(403)
      const corpo = await json(resposta)
      expect(String(corpo["mensagem"])).not.toContain("grupo")
      expect(JSON.stringify(corpo)).not.toMatch(/row-level security/)
    })

    it("falha inesperada do banco ao seguir é 503", async () => {
      const mock = mockClient({ saveError: { code: "XX000", message: "boom" } })
      authenticate(mock)
      expect((await seguir(req("PUT"), context)).status).toBe(503)
    })

    it("remover o próprio seguimento dispensa a pergunta existir", async () => {
      // A policy de delete só olha o dono; exigir a pergunta visível deixaria o
      // item preso em Salvos depois que a moderação apaga o pedido.
      const mock = mockClient({ pedido: null })
      authenticate(mock)
      const resposta = await deixarDeSeguir(req("DELETE"), context)
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ salvo: false })
      expect(mock.deletes).toContain("recommendation_saves")
      expect(
        mock.eqCalls.filter((chamada) => chamada.table === "recommendation_requests"),
      ).toHaveLength(0)
    })
  })

  describe("perguntas seguidas", () => {
    it("lista o que a sessão segue, na ordem do salvamento e só com pedido visível", async () => {
      const mock = mockClient({
        salvas: [ID],
        pedidos: [
          {
            id: ID,
            title: linha.title,
            category: "saude_bem_estar",
            created_at: DATA,
            is_resolved: false,
          },
        ],
      })
      authenticate(mock)
      const resposta = await listarSalvas(req("GET", `${BASE}/salvas`))
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({
        perguntas: [
          {
            id: ID,
            titulo: linha.title,
            categoria: "saude_bem_estar",
            criadaEm: DATA,
            resolvida: false,
          },
        ],
      })
      expect(mock.inCalls).toContainEqual({
        table: "recommendation_requests",
        column: "id",
        values: [ID],
      })
      expect(mock.eqCalls).toContainEqual({
        table: "recommendation_requests",
        column: "is_deleted",
        value: false,
      })
    })

    it("sem seguimentos responde lista vazia sem consultar as perguntas", async () => {
      const mock = mockClient({ salvas: [] })
      authenticate(mock)
      expect(await json(await listarSalvas(req("GET", `${BASE}/salvas`)))).toEqual({
        perguntas: [],
      })
      expect(mock.inCalls).toHaveLength(0)
    })

    it("falha de leitura vira 503, nunca lista vazia", async () => {
      const mock = mockClient({ errorTable: "recommendation_saves" })
      authenticate(mock)
      const resposta = await listarSalvas(req("GET", `${BASE}/salvas`))
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "leitura-indisponivel" })
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

  describe("resolução", () => {
    const RESPOSTA = "d0000000-0000-4000-8000-000000000010"
    const OUTRA_RESPOSTA = "d0000000-0000-4000-8000-0000000000ff"

    function pedirResolucao(corpo: unknown, requestHeaders = headers) {
      return mudarResolucao(
        req("POST", `${BASE}/${ID}/resolucao`, JSON.stringify(corpo), requestHeaders),
        context,
      )
    }

    it("o autor marca a resposta que resolveu e a RPC recebe pergunta e resposta da sessão", async () => {
      const mock = mockClient()
      authenticate(mock)
      // Autoria no corpo é ruído: quem resolve é a pessoa da sessão.
      const resposta = await pedirResolucao({
        acao: "marcar",
        respostaId: RESPOSTA,
        author_id: OUTRA_PESSOA,
      })
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ resolvida: true, resolvidaPorResposta: RESPOSTA })
      expect(mock.rpcCalls).toEqual([
        {
          nome: "mark_recommendation_reply_resolved",
          args: { p_request_id: ID, p_reply_id: RESPOSTA },
        },
      ])
    })

    it("o autor reabre a pergunta, e ela volta aberta", async () => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await pedirResolucao({ acao: "reabrir" })
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ resolvida: false, resolvidaPorResposta: null })
      expect(mock.rpcCalls).toEqual([{ nome: "reopen_recommendation", args: { p_request_id: ID } }])
    })

    it("resolver sem resposta fecha a pergunta sem apontar resposta", async () => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await pedirResolucao({ acao: "resolver" })
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ resolvida: true, resolvidaPorResposta: null })
      expect(mock.rpcCalls).toEqual([
        { nome: "mark_recommendation_resolved", args: { p_request_id: ID } },
      ])
    })

    it("quem não é o autor recebe 404, sem a mensagem do Postgres", async () => {
      const mock = mockClient({
        rpcError: {
          reopen_recommendation: {
            code: "P0002",
            message: "request not found or you are not the author",
          },
        },
      })
      authenticate(mock)
      const resposta = await pedirResolucao({ acao: "reabrir" })
      expect(resposta.status).toBe(404)
      const corpo = await json(resposta)
      expect(corpo).toEqual({ erro: "pergunta-nao-encontrada" })
      expect(JSON.stringify(corpo)).not.toContain("author")
    })

    it("a resposta de outra pergunta é recusada pelo banco e vira 404", async () => {
      const mock = mockClient({
        rpcError: {
          mark_recommendation_reply_resolved: {
            code: "P0002",
            message: "request not found, reply does not belong to it, or you are not the author",
          },
        },
      })
      authenticate(mock)
      const resposta = await pedirResolucao({ acao: "marcar", respostaId: OUTRA_RESPOSTA })
      expect(resposta.status).toBe(404)
      expect(mock.rpcCalls[0]?.args).toEqual({ p_request_id: ID, p_reply_id: OUTRA_RESPOSTA })
    })

    it("recusa da posse e passagem impossível têm frase própria", async () => {
      const dono = mockClient({
        rpcError: { mark_recommendation_resolved: { code: "42501", message: "permission denied" } },
      })
      authenticate(dono)
      const recusado = await pedirResolucao({ acao: "resolver" })
      expect(recusado.status).toBe(403)
      expect(await json(recusado)).toEqual({
        erro: "recusado",
        mensagem: "Só quem perguntou pode resolver ou reabrir esta pergunta.",
      })

      const estado = mockClient({
        rpcError: { reopen_recommendation: { code: "22023", message: "invalid argument" } },
      })
      authenticate(estado)
      const conflito = await pedirResolucao({ acao: "reabrir" })
      expect(conflito.status).toBe(409)
      expect(await json(conflito)).toEqual({
        erro: "estado-invalido",
        mensagem: "Esta mudança não é possível agora.",
      })
    })

    it.each([
      ["ação desconhecida", { acao: "apagar" }],
      ["marcar sem resposta", { acao: "marcar" }],
      ["resposta que não é id", { acao: "marcar", respostaId: "nao-e-uuid" }],
      ["resposta que não é texto", { acao: "marcar", respostaId: 7 }],
    ])("corpo inválido (%s) é 400, sem chamar o banco", async (_label, corpo) => {
      const mock = mockClient()
      authenticate(mock)
      expect((await pedirResolucao(corpo)).status).toBe(400)
      expect(mock.rpcCalls).toHaveLength(0)
    })

    it("id fora do formato é 404, sem chamar o banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      const invalido = { params: Promise.resolve({ id: "nao-e-uuid" }) }
      const resposta = await mudarResolucao(
        req("POST", `${BASE}/nao-e-uuid/resolucao`, JSON.stringify({ acao: "reabrir" })),
        invalido,
      )
      expect(resposta.status).toBe(404)
      expect(mock.rpcCalls).toHaveLength(0)
    })

    it("escrita por cookie exige a porta do app", async () => {
      const semCabecalho = mockClient()
      authenticate(semCabecalho)
      const semApp = { origin: "http://localhost:3000", "content-type": "application/json" }
      expect((await pedirResolucao({ acao: "reabrir" }, semApp)).status).toBe(403)
      expect(semCabecalho.rpcCalls).toHaveLength(0)

      const origemFora = mockClient()
      authenticate(origemFora)
      const deFora = { ...headers, origin: "https://fora.example" }
      expect((await pedirResolucao({ acao: "reabrir" }, deFora)).status).toBe(403)
      expect(origemFora.rpcCalls).toHaveLength(0)
    })

    it("falha do banco na escrita é 503", async () => {
      const mock = mockClient({ rpcError: { reopen_recommendation: { message: "boom" } } })
      authenticate(mock)
      const resposta = await pedirResolucao({ acao: "reabrir" })
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "escrita-indisponivel" })
    })
  })
})
