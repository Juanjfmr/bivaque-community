import { NextRequest } from "next/server"
import { beforeEach, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as bloquear } from "web/app/api/app/voce/bloqueados/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

/**
 * O verbo que faltava: bloquear pelo app (F09-A). O banco (`dm_blocks`, policies
 * de próprio e o veto de escrita nos dois sentidos) já tem prova em pgTAP; aqui
 * se prova a camada da rota — porta, autoria do servidor, idempotência, recusa
 * do auto-bloqueio e a tradução dos erros sem eco.
 */

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app/voce/bloqueados"
const USER = "20000000-0000-4000-8000-000000000001"
const OUTRO = "30000000-0000-4000-8000-00000000001a"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}

type Opcoes = { codigo?: string }

/** Um cliente que só sabe inserir em `dm_blocks` — o resto é ruído do teste. */
function mockClient(opcoes: Opcoes = {}) {
  const insercoes: { tabela: string; valor: Record<string, unknown> }[] = []
  function builder(tabela: string) {
    const q: Record<string, unknown> = {}
    q["insert"] = (valor: Record<string, unknown>) => {
      insercoes.push({ tabela, valor })
      return q
    }
    // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é aguardável
    Object.defineProperty(q, "then", {
      value: (resolve: (valor: unknown) => unknown) =>
        Promise.resolve(
          resolve(
            opcoes.codigo === undefined
              ? { data: null, error: null }
              : { data: null, error: { code: opcoes.codigo, message: "segredo-do-banco" } },
          ),
        ),
    })
    return q
  }
  return { client: { from: vi.fn(builder) } as never, insercoes }
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

function semSessao() {
  resolver.mockResolvedValue({
    estado: "recusada",
    sessao: { estado: "recusada", motivo: "sem-credencial" },
  } as never)
}

function req(body: unknown = { id: OUTRO }, requestHeaders: Record<string, string> = headers) {
  return new NextRequest(BASE, {
    method: "POST",
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  semSessao()
})

it("exige sessão", async () => {
  expect((await bloquear(req())).status).toBe(401)
})

it("origem e cabeçalho do app são conferidos antes do banco", async () => {
  const mock = mockClient()
  autenticar(mock)
  for (const cabecalhos of [
    { ...headers, origin: "https://fora.example.invalid" },
    { origin: headers.origin },
  ]) {
    expect((await bloquear(req({ id: OUTRO }, cabecalhos))).status).toBe(403)
  }
  expect(mock.insercoes).toHaveLength(0)
})

it("grava o bloqueio com quem bloqueia vindo da sessão, nunca do corpo", async () => {
  const mock = mockClient()
  autenticar(mock)
  const resposta = await bloquear(
    req({ id: OUTRO, blocker_user_id: "outra-pessoa", blocked_user_id: "mais-outra" }),
  )
  expect(resposta.status).toBe(201)
  expect(await resposta.json()).toEqual({ bloqueado: { id: OUTRO } })
  expect(mock.insercoes).toEqual([
    { tabela: "dm_blocks", valor: { blocker_user_id: USER, blocked_user_id: OUTRO } },
  ])
})

it("duplicata é idempotente: mesmo estado, 200, sem confirmar a existência alheia", async () => {
  const mock = mockClient({ codigo: "23505" })
  autenticar(mock)
  const resposta = await bloquear(req())
  expect(resposta.status).toBe(200)
  expect(await resposta.json()).toEqual({ bloqueado: { id: OUTRO } })
})

it("auto-bloqueio é recusado antes da escrita", async () => {
  const mock = mockClient()
  autenticar(mock)
  const resposta = await bloquear(req({ id: USER }))
  expect(resposta.status).toBe(400)
  expect(await resposta.json()).toEqual({ erro: "dados-invalidos" })
  expect(mock.insercoes).toHaveLength(0)
})

it.each([
  ["id fora do formato", { id: "nao-e-uuid" }, 404],
  ["id que não é texto", { id: 7 }, 400],
  ["corpo sem id", {}, 400],
  ["id nulo", { id: null }, 400],
])("%s é recusado sem tocar no banco", async (_rotulo, corpo, status) => {
  const mock = mockClient()
  autenticar(mock)
  expect((await bloquear(req(corpo))).status).toBe(status)
  expect(mock.insercoes).toHaveLength(0)
})

it("pessoa inexistente é 404, sem eco do banco", async () => {
  const mock = mockClient({ codigo: "23503" })
  autenticar(mock)
  const resposta = await bloquear(req())
  expect(resposta.status).toBe(404)
  expect(JSON.stringify(await resposta.json())).not.toContain("segredo")
})

it.each([
  ["42501", 403],
  ["23514", 403],
  ["XX000", 503],
])("erro %s vira %s sem eco", async (codigo, status) => {
  const mock = mockClient({ codigo })
  autenticar(mock)
  const resposta = await bloquear(req())
  expect(resposta.status).toBe(status)
  expect(JSON.stringify(await resposta.json())).not.toContain("segredo")
})

it("corpo fora de JSON não chega ao banco", async () => {
  const mock = mockClient()
  autenticar(mock)
  const semJson = { ...headers, "content-type": "text/plain" }
  expect((await bloquear(req({ id: OUTRO }, semJson))).status).toBe(400)
  expect(mock.insercoes).toHaveLength(0)
})
