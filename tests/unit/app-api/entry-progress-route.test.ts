import { NextRequest as RequisicaoDoNext } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// A rota fala com dois clientes: o do usuário (leitura sob RLS) e o de serviço
// (escrita, porque a tabela não tem grant de escrita). O teste troca os dois e
// o resolvedor de sessão, e prova o que a rota promete: dono da linha vem da
// sessão, CSRF da escrita, forma validada e nada de confiar no corpo.

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { GET, OPTIONS, PUT } from "web/app/api/app/entry/progress/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { createServerClient } from "web/lib/supabase/server"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const criarClienteDeServico = vi.mocked(createServerClient)

const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }
// O NextRequest normaliza o host do URL para localhost no runner de teste; o que
// importa é a origem do cabeçalho bater com a do request, como no runtime.
const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/app/api/app/entry/progress`

const mockMaybeSingle = vi.fn()
const mockUpsert = vi.fn()

function clienteDoUsuario() {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: mockMaybeSingle }),
      }),
    }),
  }
}

function sessaoAutenticada() {
  return {
    estado: "autenticada",
    via: "cookie",
    usuario: PESSOA,
    cliente: clienteDoUsuario(),
    cabecalhos: {},
  }
}

function requisicao(
  metodo: string,
  opcoes: { origem?: string; cabecalho?: string; corpo?: unknown; texto?: string } = {},
) {
  const headers: Record<string, string> = { origin: opcoes.origem ?? ORIGEM }
  if (opcoes.cabecalho !== undefined) headers["x-bivaque-app"] = opcoes.cabecalho
  if (opcoes.corpo !== undefined || opcoes.texto !== undefined) {
    headers["content-type"] = "application/json"
  }
  return new RequisicaoDoNext(URL_DA_ROTA, {
    method: metodo,
    headers,
    ...(metodo === "GET" || metodo === "OPTIONS"
      ? {}
      : { body: opcoes.texto ?? JSON.stringify(opcoes.corpo ?? {}) }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  mockUpsert.mockResolvedValue({ error: null })
  criarClienteDeServico.mockReturnValue({
    from: () => ({ upsert: mockUpsert }),
  } as never)
  resolver.mockResolvedValue(sessaoAutenticada() as never)
})

describe("GET /api/app/entry/progress", () => {
  it("sem sessão responde 401 e não lê rascunho", async () => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
    const resposta = await GET(requisicao("GET"))
    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toEqual({ autenticado: false, motivo: "sem-credencial" })
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })

  it("sem rascunho devolve o progresso inicial", async () => {
    const resposta = await GET(requisicao("GET"))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      autenticado: true,
      via: "cookie",
      progresso: { versao: 2, etapa: "porta", estado: {} },
    })
  })

  it("devolve o rascunho gravado", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { versao: 2, etapa: "cidade", estado: { cidade: "Manaus" } },
      error: null,
    })
    const resposta = await GET(requisicao("GET"))
    expect(await resposta.json()).toEqual({
      autenticado: true,
      via: "cookie",
      progresso: { versao: 2, etapa: "cidade", estado: { cidade: "Manaus" } },
    })
  })

  it("rascunho fora da forma vira progresso inicial, não erro de tela", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { versao: 2, etapa: "etapa-inexistente", estado: {} },
      error: null,
    })
    const corpo = (await (await GET(requisicao("GET"))).json()) as {
      progresso: { etapa: string }
    }
    expect(corpo.progresso.etapa).toBe("porta")
  })

  it("falha de leitura vira 503, nunca lista vazia silenciosa", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: "db offline" } })
    const resposta = await GET(requisicao("GET"))
    expect(resposta.status).toBe(503)
  })
})

describe("PUT /api/app/entry/progress", () => {
  const CORPO = {
    versao: 2,
    etapa: "cidade",
    estado: { cidade: "Manaus", momento: "chegando" },
  }

  it("sem sessão responde 401", async () => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "token-invalido" },
    } as never)
    expect((await PUT(requisicao("PUT", { cabecalho: "bivaque-spa", corpo: CORPO }))).status).toBe(
      401,
    )
  })

  it("escrita por cookie sem o cabeçalho do app é recusada antes de qualquer gravação", async () => {
    const resposta = await PUT(requisicao("PUT", { corpo: CORPO }))
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "cabecalho-ausente" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("origem fora da lista é recusada", async () => {
    const resposta = await PUT(
      requisicao("PUT", {
        origem: "https://evil.example.invalid",
        cabecalho: "bivaque-spa",
        corpo: CORPO,
      }),
    )
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "origem-recusada" })
  })

  it("corpo inválido e grande demais são recusados", async () => {
    expect((await PUT(requisicao("PUT", { cabecalho: "bivaque-spa", corpo: [] }))).status).toBe(400)
    expect(
      (await PUT(requisicao("PUT", { cabecalho: "bivaque-spa", texto: "{quebrado" }))).status,
    ).toBe(400)
    const resposta = await PUT(
      requisicao("PUT", { cabecalho: "bivaque-spa", texto: "x".repeat(40 * 1024) }),
    )
    expect(resposta.status).toBe(413)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("grava com o id da SESSÃO, nunca com o do corpo", async () => {
    const resposta = await PUT(
      requisicao("PUT", {
        cabecalho: "bivaque-spa",
        corpo: {
          ...CORPO,
          user_id: "10000000-0000-4000-8000-000000000999",
          estado: { ...CORPO.estado, cpf: "123" },
        },
      }),
    )
    // O CPF no estado é recusado: nada de dado sensível no rascunho.
    expect(resposta.status).toBe(400)
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("grava o rascunho validado do dono da sessão", async () => {
    const resposta = await PUT(requisicao("PUT", { cabecalho: "bivaque-spa", corpo: CORPO }))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true, progresso: CORPO })
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: PESSOA.id,
        versao: 2,
        etapa: "cidade",
        estado: { cidade: "Manaus", momento: "chegando" },
      },
      { onConflict: "user_id" },
    )
  })

  it("falha de gravação vira 503", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "db offline" } })
    const resposta = await PUT(requisicao("PUT", { cabecalho: "bivaque-spa", corpo: CORPO }))
    expect(resposta.status).toBe(503)
  })
})

describe("OPTIONS da rota", () => {
  it("responde preflight só para origem da lista", () => {
    const sim = OPTIONS(requisicao("OPTIONS"))
    expect(sim.status).toBe(204)
    expect(sim.headers.get("access-control-allow-origin")).toBe(ORIGEM)
    expect(sim.headers.get("access-control-allow-headers")).toContain("x-bivaque-app")

    const nao = OPTIONS(requisicao("OPTIONS", { origem: "https://evil.example.invalid" }))
    expect(nao.status).toBe(403)
    expect(nao.headers.get("access-control-allow-origin")).toBeNull()
  })
})
