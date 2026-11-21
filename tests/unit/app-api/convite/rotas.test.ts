import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

const estado = vi.hoisted(() => ({ publico: null as unknown }))
vi.mock("@supabase/supabase-js", () => ({ createClient: () => estado.publico }))

import { GET, POST } from "web/app/api/app/prestador-convite/[token]/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app"
const USER = "10000000-0000-4000-8000-000000000010"
const TOKEN = "a".repeat(64)
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const contexto = (token: string) => ({ params: Promise.resolve({ token }) })

function publico(resultado: unknown) {
  return { rpc: vi.fn(async () => ({ data: resultado, error: null })) }
}

function clienteDoAceite(erro: { code: string; message: string } | null = null) {
  const rpc = vi.fn(async () => ({ data: null, error: erro }))
  return { client: { rpc } as never, rpc }
}

function autenticar(mock: ReturnType<typeof clienteDoAceite>) {
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "prestador@example.invalid", appMetadata: {} },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}

function req(metodo = "GET", cabecalhos = headers) {
  return new NextRequest(`${BASE}/prestador-convite/${TOKEN}`, {
    method: metodo,
    headers: cabecalhos,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env["NEXT_PUBLIC_SUPABASE_URL"] = "http://localhost:54321"
  process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"] = "anon-de-teste"
  estado.publico = publico([
    {
      community_id: "10000000-0000-4000-8000-0000000000c1",
      community_name: "Comunidade Manaus",
      status: "pending",
    },
  ])
})

describe("TROCA-005 — leitura do convite de prestador", () => {
  it("token malformado e desconhecido recebem o mesmo 404", async () => {
    resolver.mockResolvedValue({ estado: "recusada", sessao: {} } as never)
    expect((await GET(req(), contexto("curto"))).status).toBe(404)
    expect(estado.publico.rpc).not.toHaveBeenCalled()
  })

  it("token válido devolve comunidade e estado, com o e-mail da sessão quando há", async () => {
    resolver.mockResolvedValue({
      estado: "autenticada",
      via: "cookie",
      usuario: { id: USER, email: "prestador@example.invalid", appMetadata: {} },
      cliente: {} as never,
      cabecalhos: {},
    } as never)
    const resposta = await GET(req(), contexto(TOKEN))
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).convite).toEqual({
      comunidadeId: "10000000-0000-4000-8000-0000000000c1",
      comunidade: "Comunidade Manaus",
      estado: "pendente",
    })
    expect(estado.publico.rpc).toHaveBeenCalledWith("read_provider_invitation", { p_token: TOKEN })
  })

  it("sem sessão a leitura continua pública e emailDaSessao é nulo", async () => {
    resolver.mockResolvedValue({ estado: "recusada", sessao: {} } as never)
    const resposta = await GET(req(), contexto(TOKEN))
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).emailDaSessao).toBeNull()
  })

  it.each(["accepted", "revoked", "expired"])("o estado %s chega traduzido", async (status) => {
    estado.publico = publico([
      {
        community_id: "10000000-0000-4000-8000-0000000000c1",
        community_name: "Comunidade Manaus",
        status,
      },
    ])
    resolver.mockResolvedValue({ estado: "recusada", sessao: {} } as never)
    const resposta = await GET(req(), contexto(TOKEN))
    expect((await resposta.json()).convite.estado).toMatch(/aceito|revogado|expirado/)
  })

  it("zero linhas é 404, sem oráculo de existência", async () => {
    estado.publico = publico([])
    resolver.mockResolvedValue({ estado: "recusada", sessao: {} } as never)
    expect((await GET(req(), contexto(TOKEN))).status).toBe(404)
  })

  it("falha da RPC é 503, não convite inexistente", async () => {
    estado.publico = { rpc: vi.fn(async () => ({ data: null, error: { message: "segredo" } })) }
    resolver.mockResolvedValue({ estado: "recusada", sessao: {} } as never)
    const resposta = await GET(req(), contexto(TOKEN))
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })
})

describe("TROCA-005 — aceite do convite de prestador", () => {
  it("sem sessão é 401", async () => {
    resolver.mockResolvedValue({ estado: "recusada", sessao: {} } as never)
    expect((await POST(req("POST"), contexto(TOKEN))).status).toBe(401)
  })

  it.each([
    { ...headers, origin: "https://fora.example.invalid" },
    { ...headers, "x-bivaque-app": "errado" },
  ])("recusa escrita sem a porta correta antes do banco", async (cabecalhos) => {
    const mock = clienteDoAceite()
    autenticar(mock)
    expect((await POST(req("POST", cabecalhos), contexto(TOKEN))).status).toBe(403)
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it("aceita com o e-mail da SESSÃO, nunca com um e-mail do corpo", async () => {
    const mock = clienteDoAceite()
    autenticar(mock)
    const resposta = await POST(req("POST"), contexto(TOKEN))
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).aceito).toBe(true)
    expect(mock.rpc).toHaveBeenCalledWith("accept_provider_invitation", {
      p_token: TOKEN,
      p_email: "prestador@example.invalid",
    })
  })

  it.each([
    ["P0002", "outro-email"],
    ["P0003", "convite-usado"],
    ["P0004", "convite-expirado"],
    ["42501", "conta-recusada"],
  ])("a recusa %s vira 409 %s sem eco", async (code, motivo) => {
    const mock = clienteDoAceite({ code, message: "segredo do banco" })
    autenticar(mock)
    const resposta = await POST(req("POST"), contexto(TOKEN))
    expect(resposta.status).toBe(409)
    const texto = await resposta.text()
    expect(JSON.parse(texto).erro).toBe(motivo)
    expect(texto).not.toContain("segredo")
  })

  it("token malformado não chega ao banco", async () => {
    const mock = clienteDoAceite()
    autenticar(mock)
    expect((await POST(req("POST"), contexto("curto"))).status).toBe(404)
    expect(mock.rpc).not.toHaveBeenCalled()
  })
})
