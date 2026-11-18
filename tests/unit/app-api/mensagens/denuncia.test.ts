import { NextRequest } from "next/server"
import { beforeEach, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as denunciar } from "web/app/api/app/mensagens/[id]/denuncia/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

/**
 * Denúncia de mensagem de conversa (F09-A). `reports` com alvo `message`, o
 * índice de duplicata e a fila do operador já têm prova em pgTAP; aqui se prova
 * a camada da rota: porta, validação compartilhada do motivo, visibilidade pela
 * leitura da sessão, autoria do servidor e a tradução dos erros.
 */

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app/mensagens"
const MENSAGEM = "42000000-0000-4000-8000-000000000052"
const USER = "20000000-0000-4000-8000-000000000001"
const OUTRA_PESSOA = "20000000-0000-4000-8000-00000000000a"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const contexto = { params: Promise.resolve({ id: MENSAGEM }) }
const url = `${BASE}/${MENSAGEM}/denuncia`
const corpo = { motivo: "conteudo-inadequado", explicacao: "Ofensa" }

type Opcoes = {
  /** A mensagem que a RLS devolve; `null` = invisível para esta sessão. */
  mensagem?: { sender_id: string } | null
  /** Tabela cuja LEITURA falha. */
  erro?: string
  /** Tabela cuja ESCRITA falha (hoje só `reports`). */
  erroEscrita?: string
  codigo?: string
}

function mockClient(opcoes: Opcoes = {}) {
  const chamadas: { tabela: string; metodo: string; args: unknown[] }[] = []
  function builder(tabela: string) {
    let operacao = "select"
    const resposta = () => {
      if (tabela === opcoes.erro || (operacao !== "select" && tabela === opcoes.erroEscrita))
        return {
          data: null,
          error: { code: opcoes.codigo ?? "XX000", message: "segredo-do-banco" },
        }
      if (tabela === "dm_messages") {
        return {
          data: opcoes.mensagem === undefined ? { sender_id: OUTRA_PESSOA } : opcoes.mensagem,
        }
      }
      if (tabela === "reports") return { data: { id: "denuncia-1" } }
      return { data: null }
    }
    const q: Record<string, unknown> = {}
    for (const metodo of ["select", "eq", "insert"]) {
      q[metodo] = (...args: unknown[]) => {
        if (metodo === "insert") operacao = "insert"
        chamadas.push({ tabela, metodo, args })
        return q
      }
    }
    q["maybeSingle"] = () => q
    q["single"] = () => q
    // biome-ignore lint/suspicious/noThenProperty: o builder do PostgREST é aguardável
    Object.defineProperty(q, "then", {
      value: (resolve: (valor: unknown) => unknown) => Promise.resolve(resposta()).then(resolve),
    })
    return q
  }
  return { client: { from: vi.fn(builder) } as never, chamadas }
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

function req(body: unknown = corpo, requestHeaders: Record<string, string> = headers) {
  return new NextRequest(url, {
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
  expect((await denunciar(req(), contexto)).status).toBe(401)
})

it("origem e cabeçalho do app são conferidos antes do banco", async () => {
  const mock = mockClient()
  autenticar(mock)
  for (const cabecalhos of [
    { ...headers, origin: "https://fora.example.invalid" },
    { origin: headers.origin },
  ]) {
    expect((await denunciar(req(corpo, cabecalhos), contexto)).status).toBe(403)
  }
  expect(mock.chamadas).toHaveLength(0)
})

it.each(["spam", "conteudo-inadequado", "informacao-enganosa", "outro"])(
  "registra %s com alvo e autoria do servidor",
  async (motivo) => {
    const mock = mockClient()
    autenticar(mock)
    const resposta = await denunciar(
      req({
        motivo,
        explicacao: "  Explicação  ",
        reporter_user_id: "outro",
        target_type: "post",
        target_id: "outro-alvo",
      }),
      contexto,
    )
    expect(resposta.status).toBe(201)
    expect(await resposta.json()).toEqual({ denuncia: { id: "denuncia-1" } })
    expect(mock.chamadas).toContainEqual({
      tabela: "reports",
      metodo: "insert",
      args: [
        expect.objectContaining({
          reporter_user_id: USER,
          target_type: "message",
          target_id: MENSAGEM,
          reason: expect.stringMatching(/: Explicação$/),
        }),
      ],
    })
  },
)

it("mensagem própria é 403 antes da escrita", async () => {
  const mock = mockClient({ mensagem: { sender_id: USER } })
  autenticar(mock)
  const resposta = await denunciar(req(), contexto)
  expect(resposta.status).toBe(403)
  expect(await resposta.json()).toEqual({ erro: "proprio-conteudo" })
  expect(mock.chamadas.some((chamada) => chamada.metodo === "insert")).toBe(false)
})

it("mensagem que a sessão não lê é 404, sem escrever", async () => {
  const mock = mockClient({ mensagem: null })
  autenticar(mock)
  const resposta = await denunciar(req(), contexto)
  expect(resposta.status).toBe(404)
  expect(await resposta.json()).toEqual({ erro: "mensagem-nao-encontrada" })
  expect(mock.chamadas.some((chamada) => chamada.metodo === "insert")).toBe(false)
})

it("id fora do formato é 404, sem consultar o banco", async () => {
  const mock = mockClient()
  autenticar(mock)
  const invalido = { params: Promise.resolve({ id: "nao-e-uuid" }) }
  expect((await denunciar(req(), invalido)).status).toBe(404)
  expect(mock.chamadas).toHaveLength(0)
})

it.each([
  ["sem motivo", {}],
  ["motivo livre", { motivo: "qualquer" }],
  ["motivo que não é texto", { motivo: 5 }],
  ["explicação que não é texto", { motivo: "spam", explicacao: false }],
  ["explicação acima do teto", { motivo: "outro", explicacao: "a".repeat(301) }],
])("corpo inválido (%s) é 400, sem tocar no banco", async (_rotulo, dados) => {
  const mock = mockClient()
  autenticar(mock)
  expect((await denunciar(req(dados), contexto)).status).toBe(400)
  expect(mock.chamadas).toHaveLength(0)
})

it("não aceita content-type fora de JSON", async () => {
  const mock = mockClient()
  autenticar(mock)
  const semJson = { ...headers, "content-type": "text/plain" }
  expect((await denunciar(req(corpo, semJson), contexto)).status).toBe(400)
  expect(mock.chamadas).toHaveLength(0)
})

it("duplicata é 409 com a frase do alvo", async () => {
  const mock = mockClient({ erroEscrita: "reports", codigo: "23505" })
  autenticar(mock)
  const resposta = await denunciar(req(), contexto)
  expect(resposta.status).toBe(409)
  expect(await resposta.json()).toEqual({
    erro: "ja-denunciado",
    mensagem: "Você já denunciou esta mensagem.",
  })
})

it.each([
  ["42501", 403],
  ["23514", 400],
  ["XX000", 503],
])("erro %s vira %s sem eco", async (codigo, status) => {
  const mock = mockClient({ erroEscrita: "reports", codigo })
  autenticar(mock)
  const resposta = await denunciar(req(), contexto)
  expect(resposta.status).toBe(status)
  expect(JSON.stringify(await resposta.json())).not.toContain("segredo")
})

it("erro de leitura da mensagem é 503", async () => {
  const mock = mockClient({ erro: "dm_messages" })
  autenticar(mock)
  const resposta = await denunciar(req(), contexto)
  expect(resposta.status).toBe(503)
  expect(await resposta.json()).toEqual({ erro: "escrita-indisponivel" })
})
