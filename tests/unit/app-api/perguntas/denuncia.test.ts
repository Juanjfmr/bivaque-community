import { NextRequest } from "next/server"
import { beforeEach, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as denunciar } from "web/app/api/app/perguntas/[id]/denuncia/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

// A denúncia de pergunta e de resposta é a MESMA rota: sem `respostaId` o alvo é
// o pedido, com ele é a resposta daquele pedido. O banco (`reports`, enum e
// auto-denúncia) já tem prova em pgTAP; o que se prova aqui é a camada da rota:
// porta, validação compartilhada, visibilidade pela sessão, autoria do servidor
// e a tradução dos erros.

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app/perguntas"
const ID = "90000000-0000-4000-8000-000000000001"
const OUTRA_PERGUNTA = "90000000-0000-4000-8000-000000000002"
const RESPOSTA = "d0000000-0000-4000-8000-000000000010"
const USER = "20000000-0000-4000-8000-000000000001"
const OUTRA_PESSOA = "20000000-0000-4000-8000-000000000002"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const context = { params: Promise.resolve({ id: ID }) }
const url = `${BASE}/${ID}/denuncia`
const corpo = { motivo: "spam", explicacao: "Repetida" }

type Opcoes = {
  pedido?: { author_id: string } | null
  resposta?: { author_id: string; request_id: string } | null
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
    let singular = false
    const resposta = () => {
      if (tabela === opcoes.erro || (operacao !== "select" && tabela === opcoes.erroEscrita))
        return {
          data: null,
          error: { code: opcoes.codigo ?? "XX000", message: "segredo-do-banco" },
        }
      if (tabela === "recommendation_requests") {
        const pedido = opcoes.pedido === undefined ? { author_id: OUTRA_PESSOA } : opcoes.pedido
        return { data: singular ? pedido : [], error: null }
      }
      if (tabela === "recommendation_replies") {
        const resposta =
          opcoes.resposta === undefined
            ? { author_id: OUTRA_PESSOA, request_id: ID }
            : opcoes.resposta
        return { data: singular ? resposta : [], error: null }
      }
      if (tabela === "reports") return { data: singular ? { id: "denuncia-1" } : [], error: null }
      return { data: null, error: null }
    }
    const q: Record<string, unknown> = {}
    for (const metodo of ["select", "eq", "in", "order", "limit", "insert"]) {
      q[metodo] = (...args: unknown[]) => {
        if (metodo === "insert") operacao = "insert"
        chamadas.push({ tabela, metodo, args })
        return q
      }
    }
    q["maybeSingle"] = () => {
      singular = true
      return q
    }
    q["single"] = () => {
      singular = true
      return q
    }
    // biome-ignore lint/suspicious/noThenProperty: builder PostgREST é awaitable
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

function req(
  body: unknown = corpo,
  requestHeaders: Record<string, string> = headers,
  method = "POST",
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: requestHeaders,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  semSessao()
})

it("exige sessão", async () => {
  expect((await denunciar(req(), context)).status).toBe(401)
})

it("origem e cabeçalho são conferidos antes do banco", async () => {
  const mock = mockClient()
  autenticar(mock)
  for (const h of [
    { ...headers, origin: "https://fora.example.invalid" },
    { origin: headers.origin },
  ]) {
    expect((await denunciar(req(corpo, h), context)).status).toBe(403)
  }
  expect(mock.chamadas).toHaveLength(0)
})

it.each(["spam", "conteudo-inadequado", "informacao-enganosa", "outro"])(
  "registra %s na pergunta sob RLS, com alvo e autoria do servidor",
  async (motivo) => {
    const mock = mockClient()
    autenticar(mock)
    const resposta = await denunciar(
      req({
        motivo,
        explicacao: "  Explicação  ",
        reporter_user_id: "outro",
        target_type: "message",
        target_id: OUTRA_PERGUNTA,
      }),
      context,
    )
    expect(resposta.status).toBe(201)
    expect(await resposta.json()).toEqual({ denuncia: { id: "denuncia-1" } })
    expect(mock.chamadas).toContainEqual({
      tabela: "reports",
      metodo: "insert",
      args: [
        expect.objectContaining({
          reporter_user_id: USER,
          target_type: "recommendation_request",
          target_id: ID,
          reason: expect.stringMatching(/: Explicação$/),
        }),
      ],
    })
  },
)

it("com respostaId o alvo é a resposta daquela pergunta", async () => {
  const mock = mockClient()
  autenticar(mock)
  const resposta = await denunciar(req({ ...corpo, respostaId: RESPOSTA }), context)
  expect(resposta.status).toBe(201)
  expect(mock.chamadas).toContainEqual({
    tabela: "reports",
    metodo: "insert",
    args: [expect.objectContaining({ target_type: "recommendation_reply", target_id: RESPOSTA })],
  })
})

it.each([
  ["pergunta própria", { pedido: { author_id: USER } }, {}],
  ["resposta própria", { resposta: { author_id: USER, request_id: ID } }, { respostaId: RESPOSTA }],
])("%s é recusada antes da escrita", async (_rotulo, opcoes, extra) => {
  const mock = mockClient(opcoes)
  autenticar(mock)
  const resposta = await denunciar(req({ ...corpo, ...extra }), context)
  expect(resposta.status).toBe(403)
  expect(await resposta.json()).toEqual({ erro: "proprio-conteudo" })
  expect(mock.chamadas.some((chamada) => chamada.metodo === "insert")).toBe(false)
})

it.each([
  ["fora do formato", "nao-e-uuid"],
  ["resposta fora do formato", `resposta-${RESPOSTA}`],
])("id %s é 404, sem consultar o banco", async (_rotulo, id) => {
  const mock = mockClient()
  autenticar(mock)
  const invalido = { params: Promise.resolve({ id }) }
  expect((await denunciar(req(), invalido)).status).toBe(404)
  expect(mock.chamadas).toHaveLength(0)
})

it.each([
  ["pergunta invisível", { pedido: null }],
  ["resposta inexistente", { resposta: null, respostaId: RESPOSTA }],
  [
    "resposta de outra pergunta",
    { resposta: { author_id: OUTRA_PESSOA, request_id: OUTRA_PERGUNTA }, respostaId: RESPOSTA },
  ],
])("%s é 404, sem escrever denúncia", async (_rotulo, opcoes) => {
  const { respostaId, ...resto } = opcoes as Opcoes & { respostaId?: string }
  const mock = mockClient(resto)
  autenticar(mock)
  const resposta = await denunciar(
    req({ ...corpo, ...(respostaId ? { respostaId } : {}) }),
    context,
  )
  expect(resposta.status).toBe(404)
  expect(mock.chamadas.some((chamada) => chamada.metodo === "insert")).toBe(false)
})

it.each([
  ["sem motivo", {}],
  ["motivo livre", { motivo: "qualquer" }],
  ["motivo que não é texto", { motivo: 5 }],
  ["explicação que não é texto", { motivo: "spam", explicacao: false }],
  ["explicação acima do teto", { motivo: "outro", explicacao: "a".repeat(301) }],
  ["resposta que não é id", { motivo: "spam", respostaId: "nao-e-uuid" }],
  ["resposta que não é texto", { motivo: "spam", respostaId: 7 }],
])("corpo inválido (%s) é 400, sem tocar no banco", async (_rotulo, dados) => {
  const mock = mockClient()
  autenticar(mock)
  expect((await denunciar(req(dados), context)).status).toBe(400)
  expect(mock.chamadas).toHaveLength(0)
})

it("não aceita content-type fora de JSON", async () => {
  const mock = mockClient()
  autenticar(mock)
  const semJson = { ...headers, "content-type": "text/plain" }
  expect((await denunciar(req(corpo, semJson), context)).status).toBe(400)
  expect(mock.chamadas).toHaveLength(0)
})

it("duplicata é 409 com a frase do alvo", async () => {
  const pergunta = mockClient({ erroEscrita: "reports", codigo: "23505" })
  autenticar(pergunta)
  const resposta = await denunciar(req(), context)
  expect(resposta.status).toBe(409)
  expect(await resposta.json()).toEqual({
    erro: "ja-denunciado",
    mensagem: "Você já denunciou esta pergunta.",
  })

  const daResposta = mockClient({ erroEscrita: "reports", codigo: "23505" })
  autenticar(daResposta)
  expect(await (await denunciar(req({ ...corpo, respostaId: RESPOSTA }), context)).json()).toEqual({
    erro: "ja-denunciado",
    mensagem: "Você já denunciou esta resposta.",
  })
})

it.each([
  ["42501", 403],
  ["23514", 400],
  ["XX000", 503],
])("erro %s vira %s sem eco", async (codigo, status) => {
  const mock = mockClient({ erroEscrita: "reports", codigo })
  autenticar(mock)
  const resposta = await denunciar(req(), context)
  expect(resposta.status).toBe(status)
  expect(JSON.stringify(await resposta.json())).not.toContain("segredo")
})

it.each(["recommendation_requests", "recommendation_replies"])(
  "erro de leitura de %s é 503",
  async (tabela) => {
    const mock = mockClient({ erro: tabela })
    autenticar(mock)
    const resposta = await denunciar(
      req({ ...corpo, ...(tabela === "recommendation_replies" ? { respostaId: RESPOSTA } : {}) }),
      context,
    )
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "escrita-indisponivel" })
  },
)
