import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import {
  DELETE as apagar,
  GET as configuracao,
  POST as inscrever,
} from "web/app/api/app/push/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)

const BASE = "http://localhost:3000/api/app/push"
const USER = "20000000-0000-4000-8000-000000000001"
const OUTRO = "20000000-0000-4000-8000-000000000002"
const DESTINO = "https://updates.push.services.mozilla.com/wpush/v2/abc123"
const CHAVE = "BOr3D2k9_1x2y3z4"

const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}

type Chamada = {
  table: string
  op: "select" | "insert" | "delete" | "update"
  coluna?: string
  valor?: unknown
  corpo?: unknown
}

type Options = {
  erroNaEscrita?: { code?: string; message: string }
  removidos?: { id: string }[]
}

function mockClient(options: Options = {}) {
  const chamadas: Chamada[] = []

  const from = vi.fn((table: string) => {
    let operacao: Chamada["op"] = "select"
    const resposta = () => {
      if (options.erroNaEscrita !== undefined && operacao !== "select") {
        return { data: null, count: null, error: options.erroNaEscrita }
      }
      if (operacao === "delete") {
        return { data: options.removidos ?? [], count: null, error: null }
      }
      return { data: null, count: null, error: null }
    }

    const query: Record<string, unknown> = {}
    query["select"] = () => query
    query["eq"] = (coluna: string, valor: unknown) => {
      chamadas.push({ table, op: operacao, coluna, valor })
      return query
    }
    query["insert"] = (corpo: unknown) => {
      operacao = "insert"
      chamadas.push({ table, op: "insert", corpo })
      return query
    }
    query["update"] = (corpo: unknown) => {
      operacao = "update"
      chamadas.push({ table, op: "update", corpo })
      return query
    }
    query["delete"] = () => {
      operacao = "delete"
      chamadas.push({ table, op: "delete" })
      return query
    }
    query["maybeSingle"] = async () => resposta()
    query["single"] = async () => resposta()
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder do PostgREST
    Object.defineProperty(query, "then", {
      value: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(resposta())),
    })
    return query
  })

  return { client: { from } as never, chamadas }
}

function req(method: string, url = BASE, body?: unknown, requestHeaders = headers) {
  return new NextRequest(url, {
    method,
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

function autenticar(mock: ReturnType<typeof mockClient>) {
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

function inscricao(extra: Record<string, unknown> = {}) {
  return {
    kind: "web",
    destination: DESTINO,
    keys: { p256dh: CHAVE, auth: CHAVE },
    label: "Navegador",
    ...extra,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("WEB_PUSH_PUBLIC_KEY", "chave-publica-de-teste")
  vi.stubEnv("WEB_PUSH_PRIVATE_KEY", "chave-privada-de-teste")
  resolver.mockResolvedValue({
    estado: "recusada",
    sessao: { estado: "recusada", motivo: "sem-credencial" },
  } as never)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("rota de push do app", () => {
  it.each([
    ["GET configuração", () => configuracao(req("GET"))],
    ["POST inscrição", () => inscrever(req("POST", BASE, inscricao()))],
    ["DELETE inscrição", () => apagar(req("DELETE", BASE, { destination: DESTINO }))],
  ])("%s recusa ausência de sessão", async (_rotulo, invocar) => {
    expect((await invocar()).status).toBe(401)
  })

  describe("configuração", () => {
    it("devolve só a chave pública; a privada nunca sai do servidor", async () => {
      const mock = mockClient()
      autenticar(mock)
      const corpo = await json(await configuracao(req("GET")))
      expect(corpo).toEqual({
        configurado: true,
        chavePublica: "chave-publica-de-teste",
      })
      expect(JSON.stringify(corpo)).not.toContain("chave-privada-de-teste")
    })

    it("sem as duas chaves, o push fica desligado e sem chave pública", async () => {
      vi.stubEnv("WEB_PUSH_PRIVATE_KEY", "")
      const mock = mockClient()
      autenticar(mock)
      expect(await json(await configuracao(req("GET")))).toEqual({
        configurado: false,
        chavePublica: null,
      })
    })
  })

  describe("inscrição", () => {
    it("grava com o dono da sessão, mesmo com user_id no corpo", async () => {
      const mock = mockClient()
      autenticar(mock)
      const resposta = await inscrever(
        req("POST", BASE, inscricao({ user_id: OUTRO, userId: OUTRO })),
      )
      expect(resposta.status).toBe(201)
      expect(await json(resposta)).toEqual({ inscrito: true })

      const gravado = mock.chamadas.find((chamada) => chamada.op === "insert")?.corpo as Record<
        string,
        unknown
      >
      expect(gravado).toMatchObject({
        user_id: USER,
        kind: "web",
        destination: DESTINO,
        key_p256dh: CHAVE,
        key_auth: CHAVE,
        label: "Navegador",
      })
      expect(gravado["user_id"]).not.toBe(OUTRO)
    })

    it.each([
      ["origem fora da lista", inscricao(), { ...headers, origin: "https://fora.example" }],
      ["sem o cabeçalho do app", inscricao(), { origin: "http://localhost:3000" }],
    ])("recusa %s antes do banco", async (_rotulo, corpo, cabecalhos) => {
      const mock = mockClient()
      autenticar(mock)
      const resposta = await inscrever(req("POST", BASE, corpo, cabecalhos))
      expect(resposta.status).toBe(403)
      expect(mock.chamadas.some((chamada) => chamada.op === "insert")).toBe(false)
    })

    it.each([
      ["kind nativo", inscricao({ kind: "android" })],
      ["destino não HTTPS", inscricao({ destination: "http://push.example.invalid/sub" })],
      ["destino inválido", inscricao({ destination: "não é url" })],
      [
        "destino fora dos serviços de push",
        inscricao({ destination: "https://alvo.example.invalid/sub/1" }),
      ],
      ["chave faltando", inscricao({ keys: { p256dh: CHAVE } })],
      ["chave com caractere estranho", inscricao({ keys: { p256dh: "a b", auth: CHAVE } })],
    ])("recusa corpo %s sem tocar no banco", async (_rotulo, corpo) => {
      const mock = mockClient()
      autenticar(mock)
      expect((await inscrever(req("POST", BASE, corpo))).status).toBe(400)
      expect(mock.chamadas.some((chamada) => chamada.op === "insert")).toBe(false)
    })

    it("destino repetido que colide devolve conflito, não 500", async () => {
      const mock = mockClient({ erroNaEscrita: { code: "23505", message: "duplicate" } })
      autenticar(mock)
      expect((await inscrever(req("POST", BASE, inscricao()))).status).toBe(409)
    })

    it("erro do banco é serviço indisponível, nunca inscrição silenciosa", async () => {
      const mock = mockClient({ erroNaEscrita: { code: "XX000", message: "boom" } })
      autenticar(mock)
      expect((await inscrever(req("POST", BASE, inscricao()))).status).toBe(503)
    })
  })

  describe("remoção", () => {
    it("apaga só o destino deste aparelho e do dono da sessão", async () => {
      const mock = mockClient({ removidos: [{ id: "a1" }] })
      autenticar(mock)
      const resposta = await apagar(req("DELETE", BASE, { destination: DESTINO }))
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ removidos: 1 })

      const filtros = mock.chamadas.filter((chamada) => chamada.op === "delete")
      expect(
        filtros.some((chamada) => chamada.coluna === "user_id" && chamada.valor === USER),
      ).toBe(true)
      expect(filtros).toContainEqual(
        expect.objectContaining({ coluna: "destination", valor: DESTINO }),
      )
    })

    it("corpo sem destino é inválido", async () => {
      const mock = mockClient()
      autenticar(mock)
      expect((await apagar(req("DELETE", BASE, { destination: "http://x" }))).status).toBe(400)
      expect((await apagar(req("DELETE", BASE, {}))).status).toBe(400)
    })

    it("exige o cabeçalho do app na escrita", async () => {
      const mock = mockClient()
      autenticar(mock)
      const semCabecalho = { origin: "http://localhost:3000" }
      expect(
        (await apagar(req("DELETE", BASE, { destination: DESTINO }, semCabecalho))).status,
      ).toBe(403)
      expect(mock.chamadas.some((chamada) => chamada.op === "delete")).toBe(false)
    })
  })
})
