import { CODE_OF_CONDUCT_VERSION } from "@bivaque/domain"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// O "combinado" da entrada no app: a rota grava que a pessoa viu e confirmou as
// quatro regras de convivência, com a versão do Código de Conduta exibida. O
// teste troca a sessão e o cliente de serviço e prova as regras: CSRF da
// escrita, teto de corpo, versão só a do contrato (nunca a do corpo), autor é o
// id da SESSÃO e falha de gravação vira 503.

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { OPTIONS, POST } from "web/app/api/app/entry/combinado/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { createServerClient } from "web/lib/supabase/server"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const criarCliente = vi.mocked(createServerClient)

const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }
// Id de outra pessoa no corpo: o autor da gravação é o da sessão, nunca o pedido.
const OUTRO_ID = "20000000-0000-4000-8000-000000000002"
const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/app/api/app/entry/combinado`

const mockUpsert = vi.fn()
const mockMarcador = vi.fn()
const mockFrom = vi.fn((tabela: string) =>
  tabela === "entry_progress" ? { upsert: mockMarcador } : { upsert: mockUpsert },
)

function sessaoAutenticada() {
  return {
    estado: "autenticada",
    via: "cookie",
    usuario: PESSOA,
    cliente: { from: () => ({}) },
    cabecalhos: {},
  }
}

function requisicao(
  opcoes: { cabecalho?: boolean; origem?: string; corpo?: unknown; texto?: string } = {},
) {
  const headers: Record<string, string> = {
    origin: opcoes.origem ?? ORIGEM,
    "content-type": "application/json",
  }
  if (opcoes.cabecalho !== false) headers["x-bivaque-app"] = "bivaque-spa"
  return new NextRequest(URL_DA_ROTA, {
    method: "POST",
    headers,
    // `texto` é o corpo cru, para os casos de JSON quebrado ou grande demais.
    body: opcoes.texto ?? JSON.stringify(opcoes.corpo ?? {}),
  })
}

function preflight(origem = ORIGEM) {
  return new NextRequest(URL_DA_ROTA, { method: "OPTIONS", headers: { origin: origem } })
}

function semSessao() {
  resolver.mockResolvedValue({
    estado: "recusada",
    sessao: { estado: "recusada", motivo: "sem-credencial" },
  } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  resolver.mockResolvedValue(sessaoAutenticada() as never)
  criarCliente.mockReturnValue({ from: mockFrom } as never)
  mockUpsert.mockResolvedValue({ error: null })
  mockMarcador.mockResolvedValue({ error: null })
})

describe("POST /api/app/entry/combinado", () => {
  it("sem sessão responde 401 e não grava", async () => {
    semSessao()
    const resposta = await POST(requisicao({ corpo: { versao: CODE_OF_CONDUCT_VERSION } }))
    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toEqual({ autenticado: false, motivo: "sem-credencial" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("escrita por cookie sem o cabeçalho do app é recusada antes de qualquer gravação", async () => {
    const resposta = await POST(
      requisicao({ cabecalho: false, corpo: { versao: CODE_OF_CONDUCT_VERSION } }),
    )
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "cabecalho-ausente" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("origem fora da lista é recusada", async () => {
    const resposta = await POST(
      requisicao({
        origem: "https://evil.example.invalid",
        corpo: { versao: CODE_OF_CONDUCT_VERSION },
      }),
    )
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "origem-recusada" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it.each([
    ["ausente", {}],
    ["errada", { versao: CODE_OF_CONDUCT_VERSION + 1 }],
    ["string", { versao: String(CODE_OF_CONDUCT_VERSION) }],
    ["fração", { versao: CODE_OF_CONDUCT_VERSION + 0.5 }],
  ] as const)("versão %s é 400 versao-invalida, sem gravar", async (_caso, corpo) => {
    const resposta = await POST(requisicao({ corpo }))
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "versao-invalida" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("corpo que não é objeto ou JSON quebrado é 400 corpo-invalido", async () => {
    for (const texto of ["[]", '"texto"', "null", "{ versao: 2, quebrado"]) {
      const resposta = await POST(requisicao({ texto }))
      expect(resposta.status).toBe(400)
      expect(await resposta.json()).toEqual({ erro: "corpo-invalido" })
    }
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("corpo acima de 4 KB é 413 grande-demais, sem gravar", async () => {
    const resposta = await POST(
      requisicao({
        texto: JSON.stringify({ versao: CODE_OF_CONDUCT_VERSION, lixo: "x".repeat(5 * 1024) }),
      }),
    )
    expect(resposta.status).toBe(413)
    expect(await resposta.json()).toEqual({ erro: "grande-demais" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("grava o combinado do dono da SESSÃO com a versão do contrato e devolve a versão", async () => {
    const resposta = await POST(
      requisicao({ corpo: { versao: CODE_OF_CONDUCT_VERSION, user_id: OUTRO_ID } }),
    )
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true, versao: CODE_OF_CONDUCT_VERSION })
    expect(mockFrom).toHaveBeenCalledWith("entry_commitments")
    // O id do corpo (OUTRO_ID) não é usado: o autor é o usuário da sessão, e a
    // versão gravada é a do contrato compartilhado.
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: PESSOA.id, versao: CODE_OF_CONDUCT_VERSION },
      { onConflict: "user_id" },
    )
    expect(mockFrom).toHaveBeenCalledWith("entry_progress")
    expect(mockMarcador).toHaveBeenCalledWith(
      { user_id: PESSOA.id, versao: 2, etapa: "avisos", estado: {} },
      { onConflict: "user_id" },
    )
  })

  it("falha ao avançar o marcador vira 503, não sucesso sem retomada", async () => {
    mockMarcador.mockResolvedValue({ error: { message: "db offline" } })
    const resposta = await POST(requisicao({ corpo: { versao: CODE_OF_CONDUCT_VERSION } }))
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "gravacao-indisponivel" })
  })

  it("falha do upsert vira 503 gravacao-indisponivel", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "db offline" } })
    const resposta = await POST(requisicao({ corpo: { versao: CODE_OF_CONDUCT_VERSION } }))
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "gravacao-indisponivel" })
  })

  it("falta de variável do servidor responde 503, não 500", async () => {
    criarCliente.mockImplementation(() => {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    })
    const resposta = await POST(requisicao({ corpo: { versao: CODE_OF_CONDUCT_VERSION } }))
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "indisponivel" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })
})

describe("OPTIONS da rota", () => {
  it("responde preflight só para origem da lista", () => {
    const sim = OPTIONS(preflight())
    expect(sim.status).toBe(204)
    expect(sim.headers.get("access-control-allow-origin")).toBe(ORIGEM)
    expect(sim.headers.get("access-control-allow-headers")).toContain("x-bivaque-app")

    const nao = OPTIONS(preflight("https://evil.example.invalid"))
    expect(nao.status).toBe(403)
    expect(nao.headers.get("access-control-allow-origin")).toBeNull()
  })
})
