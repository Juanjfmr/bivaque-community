import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET as detalhe } from "web/app/api/app/denuncias/[id]/route"
import { GET as alvos } from "web/app/api/app/denuncias/alvos/route"
import { POST as denunciar, GET as lista } from "web/app/api/app/denuncias/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app"
const USER = "10000000-0000-4000-8000-000000000010"
const OUTRO = "10000000-0000-4000-8000-000000000011"
const DENUNCIA = "10000000-0000-4000-8000-0000000000f1"
const POST = "10000000-0000-4000-8000-0000000000a1"
const POST_MEU = "10000000-0000-4000-8000-0000000000a2"
const GRUPO = "10000000-0000-4000-8000-0000000000a3"
const CIDADE = "10000000-0000-4000-8000-0000000000d1"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const contexto = (id: string) => ({ params: Promise.resolve({ id }) })

type Opcoes = {
  semDenuncias?: boolean
  alvoInvisivel?: boolean
  erroDoInsert?: { code: string; message: string }
  erroDeTabela?: string
}

const linhaDaDenuncia = {
  id: DENUNCIA,
  target_type: "post",
  target_id: POST,
  reason: "Spam: oferta repetida",
  status: "open",
  created_at: "2026-11-05T12:00:00Z",
  resolved_at: null,
}

function cliente(opcoes: Opcoes = {}) {
  const gravacoes: { tabela: string; metodo: string; valores?: unknown }[] = []
  const filtros: { tabela: string; coluna: string; valor: unknown }[] = []

  const resposta = (tabela: string, unico: boolean) => {
    if (opcoes.erroDeTabela === tabela) {
      return { data: null, error: { code: "XX000", message: "segredo do Postgres" } }
    }
    if (tabela === "reports")
      return {
        data: unico ? (opcoes.semDenuncias === true ? null : linhaDaDenuncia) : [linhaDaDenuncia],
        error: null,
        count: null,
      }
    if (tabela === "posts")
      return {
        data: opcoes.alvoInvisivel === true ? null : { content: "Oferta repetida de serviço" },
        error: null,
      }
    if (tabela === "locality_memberships") return { data: { locality_id: CIDADE }, error: null }
    if (tabela === "group_memberships") return { data: [{ group_id: GRUPO }], error: null }
    if (tabela === "groups")
      return { data: [{ id: GRUPO, name: "Vizinhos do Centro" }], error: null }
    throw new Error(`Tabela inesperada: ${tabela}`)
  }

  const rpc = vi.fn(async (nome: string) => {
    if (nome === "feed_posts") {
      return {
        data: [
          { id: POST, user_id: OUTRO, content: "Oferta repetida de serviço" },
          { id: POST_MEU, user_id: USER, content: "Minha própria publicação" },
        ],
        error: null,
      }
    }
    return { data: null, error: null }
  })

  const from = vi.fn((tabela: string) => {
    const consulta: Record<string, unknown> = {}
    for (const metodo of ["select", "order", "limit", "or", "in"]) consulta[metodo] = () => consulta
    consulta["eq"] = (coluna: string, valor: unknown) => {
      filtros.push({ tabela, coluna, valor })
      return consulta
    }
    consulta["insert"] = (valores: unknown) => {
      gravacoes.push({ tabela, metodo: "insert", valores })
      const erro = opcoes.erroDoInsert ?? null
      return {
        select: () => ({
          single: async () => ({
            data: erro === null ? { id: DENUNCIA } : null,
            error: erro,
          }),
        }),
        // biome-ignore lint/suspicious/noThenProperty: o builder do insert é awaitable
        then: (resolver: (valor: unknown) => unknown) =>
          Promise.resolve(resolver({ data: null, error: erro })),
      }
    }
    consulta["maybeSingle"] = async () => resposta(tabela, true)
    // biome-ignore lint/suspicious/noThenProperty: o builder PostgREST é awaitable
    Object.defineProperty(consulta, "then", {
      value: (resolver: (valor: unknown) => unknown) =>
        Promise.resolve(resolver(resposta(tabela, false))),
    })
    return consulta
  })

  return {
    client: {
      from,
      rpc,
      auth: { getUser: async () => ({ data: { user: { id: USER } }, error: null }) },
    } as never,
    from,
    rpc,
    gravacoes,
    filtros,
  }
}

function autenticar(mock: ReturnType<typeof cliente>) {
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "membro@example.invalid", appMetadata: {} },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}

function req(caminho: string, metodo = "GET", body?: BodyInit, cabecalhos = headers) {
  return new NextRequest(`${BASE}/${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    ...(body === undefined ? {} : { body }),
  })
}

const corpo = JSON.stringify({
  tipo: "post",
  alvo: POST,
  motivo: "spam",
  explicacao: "Oferta repetida",
})

const rotas = [
  ["lista", () => lista(req("denuncias"))],
  ["detalhe", () => detalhe(req("denuncias/x"), contexto(DENUNCIA))],
  ["alvos", () => alvos(req("denuncias/alvos"))],
  ["nova denúncia", () => denunciar(req("denuncias", "POST", corpo))],
] as const

beforeEach(() => {
  vi.clearAllMocks()
})

describe("TROCA-005 — denúncias exigem sessão", () => {
  beforeEach(() => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it.each(rotas)("%s sem sessão é 401", async (_nome, chamar) => {
    expect((await chamar()).status).toBe(401)
  })

  it("sessão indisponível é 503, não 500", async () => {
    resolver.mockResolvedValue({ estado: "indisponivel" } as never)
    expect((await lista(req("denuncias"))).status).toBe(503)
  })
})

describe("TROCA-005 — escrita de denúncia pela porta", () => {
  it.each([
    { ...headers, origin: "https://fora.example.invalid" },
    { ...headers, "x-bivaque-app": "errado" },
    { "content-type": "application/json", origin: headers.origin },
  ])("recusa escrita sem a porta correta antes do banco", async (cabecalhos) => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await denunciar(req("denuncias", "POST", corpo, cabecalhos))
    expect(resposta.status).toBe(403)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it.each([
    "{}",
    JSON.stringify({ tipo: 5, alvo: POST, motivo: "spam", explicacao: "" }),
    JSON.stringify({ tipo: "post", alvo: "x", motivo: "spam", explicacao: 9 }),
  ])("corpo fora da forma é 400 antes do banco (%s)", async (body) => {
    const mock = cliente()
    autenticar(mock)
    expect((await denunciar(req("denuncias", "POST", body))).status).toBe(400)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("motivo fora da lista é 400 sem tocar o alvo", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await denunciar(
      req("denuncias", "POST", JSON.stringify({ tipo: "post", alvo: POST, motivo: "inventado" })),
    )
    expect(resposta.status).toBe(400)
    expect(mock.filtros.filter((filtro) => filtro.tabela === "posts")).toHaveLength(0)
    expect(mock.gravacoes).toHaveLength(0)
  })

  it("alvo invisível para a sessão é 404, sem insert", async () => {
    const mock = cliente({ alvoInvisivel: true })
    autenticar(mock)
    const resposta = await denunciar(req("denuncias", "POST", corpo))
    expect(resposta.status).toBe(404)
    expect(mock.gravacoes).toHaveLength(0)
  })

  it("grava a denúncia do dono da sessão e devolve o id", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await denunciar(req("denuncias", "POST", corpo))
    expect(resposta.status).toBe(201)
    expect((await resposta.json()).denuncia.id).toBe(DENUNCIA)
    expect(mock.gravacoes).toContainEqual({
      tabela: "reports",
      metodo: "insert",
      valores: { target_type: "post", target_id: POST, reason: "Spam: Oferta repetida" },
    })
    // A identidade não vai no corpo: a coluna tem default auth.uid() e a RLS
    // exige que o denunciante seja a própria sessão.
    expect(JSON.stringify(mock.gravacoes)).not.toContain("reporter_user_id")
  })

  it.each([
    [{ code: "23505", message: "duplicate" }, 409, "ja-denunciado"],
    [{ code: "P0001", message: "cannot report your own content" }, 403, "proprio-conteudo"],
    [{ code: "XX000", message: "segredo do Postgres" }, 503, "falha"],
  ])("traduz a recusa do banco (%o) em %i", async (erro, status, codigo) => {
    const mock = cliente({ erroDoInsert: erro })
    autenticar(mock)
    const resposta = await denunciar(req("denuncias", "POST", corpo))
    expect(resposta.status).toBe(status)
    const dados = await resposta.json()
    expect(dados.erro).toBe(codigo)
    expect(JSON.stringify(dados)).not.toContain("segredo")
  })
})

describe("TROCA-005 — a denúncia não identifica o denunciante", () => {
  it("a lista projeta só o que o denunciante sabe, sem autor", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await lista(req("denuncias"))
    const texto = await resposta.text()
    expect(resposta.status).toBe(200)
    expect(texto).not.toContain("reporter")
    expect(texto).not.toContain(USER)
    expect(JSON.parse(texto).denuncias[0]).toMatchObject({
      id: DENUNCIA,
      targetLabel: "Publicação",
      reason: "Spam: oferta repetida",
      status: "open",
    })
  })

  it("o detalhe projeta motivo e explicação, sem autor", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await detalhe(req("denuncias/x"), contexto(DENUNCIA))
    const texto = await resposta.text()
    expect(resposta.status).toBe(200)
    expect(texto).not.toContain("reporter")
    expect(JSON.parse(texto).denuncia.motivo).toEqual({
      label: "Spam",
      explanation: "oferta repetida",
    })
  })

  it("denúncia de outra pessoa é 404 — a RLS não devolve a linha", async () => {
    const mock = cliente({ semDenuncias: true })
    autenticar(mock)
    expect((await detalhe(req("denuncias/x"), contexto(DENUNCIA))).status).toBe(404)
  })

  it("id fora do formato é 404", async () => {
    autenticar(cliente())
    expect((await detalhe(req("denuncias/x"), contexto("nao-e-uuid"))).status).toBe(404)
  })

  it("falha de leitura é 503, nunca lista vazia", async () => {
    const mock = cliente({ erroDeTabela: "reports" })
    autenticar(mock)
    const resposta = await lista(req("denuncias"))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })
})

describe("TROCA-005 — alvos da nova denúncia", () => {
  it("oferece o conteúdo de outra pessoa e os grupos, sem autor", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await alvos(req("denuncias/alvos"))
    expect(resposta.status).toBe(200)
    const dados = await resposta.json()
    expect(dados.alvos).toEqual([
      { tipo: "post", id: POST, titulo: "Oferta repetida de serviço" },
      { tipo: "group", id: GRUPO, titulo: "Vizinhos do Centro" },
    ])
    expect(JSON.stringify(dados)).not.toContain(USER)
    expect(JSON.stringify(dados)).not.toContain(OUTRO)
  })
})
