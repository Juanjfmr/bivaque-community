import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/logger", () => ({
  log: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}))

import {
  DELETE as apagar,
  GET as configuracao,
  POST as inscrever,
} from "web/app/api/app/push/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { log } from "web/lib/logger"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const logError = vi.mocked(log.error)

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
  op: "select" | "delete" | "rpc"
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

  // A escrita da inscrição é só pela função de registro do banco: o cliente da
  // sessão nunca recebe INSERT direto na tabela.
  const rpc = vi.fn((nome: string, corpo: unknown) => {
    chamadas.push({ table: `rpc:${nome}`, op: "rpc", corpo })
    if (options.erroNaEscrita !== undefined) {
      return Promise.resolve({ error: options.erroNaEscrita })
    }
    return Promise.resolve({ error: null })
  })

  return { client: { from, rpc } as never, chamadas }
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
    ["DELETE inscrição", () => apagar(req("DELETE", BASE, { kind: "web", destination: DESTINO }))],
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
    it("grava pela função de registro, sem user_id do corpo", async () => {
      const mock = mockClient()
      autenticar(mock)
      const resposta = await inscrever(
        req("POST", BASE, inscricao({ user_id: OUTRO, userId: OUTRO })),
      )
      expect(resposta.status).toBe(201)
      expect(await json(resposta)).toEqual({ inscrito: true })

      const gravado = mock.chamadas.find((chamada) => chamada.op === "rpc")?.corpo as Record<
        string,
        unknown
      >
      expect(gravado).toEqual({
        p_kind: "web",
        p_destination: DESTINO,
        p_key_p256dh: CHAVE,
        p_key_auth: CHAVE,
      })
      // O dono vem da sessão, dentro da função de registro: o corpo do pedido
      // não carrega identidade nenhuma.
      expect("user_id" in gravado).toBe(false)
      expect("userId" in gravado).toBe(false)
    })

    it.each(["android", "ios"])("registra %s sem chaves nem rótulo", async (kind) => {
      const mock = mockClient()
      autenticar(mock)
      const destination = kind === "ios" ? "a".repeat(64) : "token-123"
      expect((await inscrever(req("POST", BASE, { kind, destination }))).status).toBe(201)
      expect(mock.chamadas.find((chamada) => chamada.op === "rpc")?.corpo).toEqual({
        p_kind: kind,
        p_destination: destination,
        p_key_p256dh: null,
        p_key_auth: null,
      })
    })

    it.each([
      ["origem fora da lista", inscricao(), { ...headers, origin: "https://fora.example" }],
      ["sem o cabeçalho do app", inscricao(), { origin: "http://localhost:3000" }],
    ])("recusa %s antes do banco", async (_rotulo, corpo, cabecalhos) => {
      const mock = mockClient()
      autenticar(mock)
      const resposta = await inscrever(req("POST", BASE, corpo, cabecalhos))
      expect(resposta.status).toBe(403)
      expect(mock.chamadas.some((chamada) => chamada.op === "rpc")).toBe(false)
    })

    it.each([
      ["ios nao hexadecimal", { kind: "ios", destination: "g".repeat(64) }],
      ["tipo ausente", { destination: DESTINO, keys: { p256dh: CHAVE, auth: CHAVE } }],
      ["tipo desconhecido", { kind: "outro", destination: "token" }],
      ["token longo", { kind: "android", destination: "a".repeat(4097) }],
      ["token com espaço", { kind: "ios", destination: "a b" }],
      ["token com controle", { kind: "ios", destination: "a\nb" }],
      ["nativo com chaves", { kind: "android", destination: "token", keys: { auth: CHAVE } }],
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
      expect(mock.chamadas.some((chamada) => chamada.op === "rpc")).toBe(false)
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

    it("erro do banco não leva o endpoint para o log, só o código", async () => {
      const mock = mockClient({ erroNaEscrita: { code: "XX000", message: `falha em ${DESTINO}` } })
      autenticar(mock)
      const resposta = await inscrever(req("POST", BASE, inscricao()))
      expect(resposta.status).toBe(503)
      expect(logError).toHaveBeenCalledTimes(1)
      const campos = logError.mock.calls[0]?.[1] ?? {}
      expect(campos["codigo"]).toBe("XX000")
      expect(JSON.stringify(logError.mock.calls)).not.toContain("abc123")
    })

    it("erro sem código ganha categoria fixa no log, também sem a mensagem", async () => {
      const mock = mockClient({ erroNaEscrita: { message: `falha em ${DESTINO}` } })
      autenticar(mock)
      expect((await inscrever(req("POST", BASE, inscricao()))).status).toBe(503)
      const campos = logError.mock.calls[0]?.[1] ?? {}
      expect(campos["codigo"]).toBe("desconhecido")
      expect(JSON.stringify(logError.mock.calls)).not.toContain("abc123")
    })

    it("code de cara livre não entra no log, só a categoria fixa", async () => {
      const mock = mockClient({ erroNaEscrita: { code: DESTINO, message: "boom" } })
      autenticar(mock)
      expect((await inscrever(req("POST", BASE, inscricao()))).status).toBe(503)
      const campos = logError.mock.calls[0]?.[1] ?? {}
      expect(campos["codigo"]).toBe("desconhecido")
      expect(JSON.stringify(logError.mock.calls)).not.toContain("abc123")
    })
  })

  describe("remoção", () => {
    it.each([
      [{ destination: DESTINO }, 200, "web"],
      [{ kind: "android", destination: "token" }, 200, "android"],
      [{ kind: "ios", destination: "a".repeat(64) }, 200, "ios"],
      [{ kind: "outro", destination: DESTINO }, 400, null],
    ])("DELETE %j", async (corpo, status, kind) => {
      const mock = mockClient()
      autenticar(mock)
      expect((await apagar(req("DELETE", BASE, corpo))).status).toBe(status)
      if (kind)
        expect(mock.chamadas).toContainEqual(
          expect.objectContaining({ coluna: "kind", valor: kind }),
        )
    })

    it("apaga só o destino deste aparelho e do dono da sessão", async () => {
      const mock = mockClient({ removidos: [{ id: "a1" }] })
      autenticar(mock)
      const resposta = await apagar(req("DELETE", BASE, { kind: "web", destination: DESTINO }))
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ removidos: 1 })

      const filtros = mock.chamadas.filter((chamada) => chamada.op === "delete")
      expect(
        filtros.some((chamada) => chamada.coluna === "user_id" && chamada.valor === USER),
      ).toBe(true)
      expect(filtros).toContainEqual(
        expect.objectContaining({ coluna: "destination", valor: DESTINO }),
      )
      expect(filtros).toContainEqual(expect.objectContaining({ coluna: "kind", valor: "web" }))
    })

    it("erro no DELETE também não leva o endpoint para o log, só o código", async () => {
      const mock = mockClient({ erroNaEscrita: { code: "XX000", message: `falha em ${DESTINO}` } })
      autenticar(mock)
      expect(
        (await apagar(req("DELETE", BASE, { kind: "web", destination: DESTINO }))).status,
      ).toBe(503)
      expect(logError).toHaveBeenCalledTimes(1)
      const campos = logError.mock.calls[0]?.[1] ?? {}
      expect(campos["codigo"]).toBe("XX000")
      expect(JSON.stringify(logError.mock.calls)).not.toContain("abc123")
    })

    it("corpo sem destino é inválido", async () => {
      const mock = mockClient()
      autenticar(mock)
      expect(
        (await apagar(req("DELETE", BASE, { kind: "web", destination: "http://x" }))).status,
      ).toBe(400)
      expect((await apagar(req("DELETE", BASE, {}))).status).toBe(400)
    })

    it("exige o cabeçalho do app na escrita", async () => {
      const mock = mockClient()
      autenticar(mock)
      const semCabecalho = { origin: "http://localhost:3000" }
      expect(
        (await apagar(req("DELETE", BASE, { kind: "web", destination: DESTINO }, semCabecalho)))
          .status,
      ).toBe(403)
      expect(mock.chamadas.some((chamada) => chamada.op === "delete")).toBe(false)
    })
  })
})
