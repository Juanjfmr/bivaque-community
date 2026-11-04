import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// A etapa "avisos" da entrada grava nas preferências canônicas de notificação.
// O teste troca a sessão e o cliente de serviço, e prova o contrato: CSRF da
// escrita, os dois valores aceitos, o dono da linha vindo da SESSÃO, os quatro
// booleanos gravados juntos (e só eles) e a falha de gravação virando 503.

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { OPTIONS, POST } from "web/app/api/app/entry/notices/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { createServerClient } from "web/lib/supabase/server"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const criarCliente = vi.mocked(createServerClient)

const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }
// O NextRequest normaliza o host do URL para localhost no runner de teste; o que
// importa é a origem do cabeçalho bater com a do request, como no runtime.
const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/app/api/app/entry/notices`

const mockUpsert = vi.fn()

function clienteDeServico() {
  return { from: () => ({ upsert: mockUpsert }) }
}

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
  const headers: Record<string, string> = { origin: opcoes.origem ?? ORIGEM }
  if (opcoes.cabecalho !== false) headers["x-bivaque-app"] = "bivaque-spa"
  headers["content-type"] = "application/json"
  return new NextRequest(URL_DA_ROTA, {
    method: "POST",
    headers,
    body: opcoes.texto ?? JSON.stringify(opcoes.corpo ?? {}),
  })
}

function preflight(origem = ORIGEM) {
  return new NextRequest(URL_DA_ROTA, { method: "OPTIONS", headers: { origin: origem } })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  mockUpsert.mockResolvedValue({ error: null })
  criarCliente.mockReturnValue(clienteDeServico() as never)
  resolver.mockResolvedValue(sessaoAutenticada() as never)
})

describe("POST /api/app/entry/notices", () => {
  it("sem sessão responde 401 e não grava", async () => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
    const resposta = await POST(requisicao({ corpo: { avisos: "ativados" } }))
    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toEqual({ autenticado: false, motivo: "sem-credencial" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("escrita por cookie sem o cabeçalho do app é recusada antes de qualquer gravação", async () => {
    const resposta = await POST(requisicao({ cabecalho: false, corpo: { avisos: "ativados" } }))
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "cabecalho-ausente" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("origem fora da lista é recusada", async () => {
    const resposta = await POST(
      requisicao({
        origem: "https://evil.example.invalid",
        corpo: { avisos: "ativados" },
      }),
    )
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "origem-recusada" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("valor fora do enum é 400 avisos-invalidos, sem gravar", async () => {
    const INVALIDOS: unknown[] = [
      {},
      { avisos: "talvez" },
      { avisos: "" },
      { avisos: "ATIVADOS" },
      { avisos: true },
      { avisos: 1 },
      { avisos: null },
      { avisos: ["ativados"] },
      { avisos: { valor: "ativados" } },
    ]
    for (const corpo of INVALIDOS) {
      const resposta = await POST(requisicao({ corpo }))
      expect(resposta.status).toBe(400)
      expect(await resposta.json()).toEqual({ erro: "avisos-invalidos" })
    }
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("corpo que não é objeto ou JSON quebrado é 400 corpo-invalido", async () => {
    for (const texto of ["[]", '"texto"', "null", "{quebrado"]) {
      const resposta = await POST(requisicao({ texto }))
      expect(resposta.status).toBe(400)
      expect(await resposta.json()).toEqual({ erro: "corpo-invalido" })
    }
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("corpo acima de 4 KB é 413 grande-demais, sem gravar", async () => {
    const resposta = await POST(
      requisicao({
        texto: JSON.stringify({ avisos: "ativados", lixo: "x".repeat(5 * 1024) }),
      }),
    )
    expect(resposta.status).toBe(413)
    expect(await resposta.json()).toEqual({ erro: "grande-demais" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("estrutura desconhecida no corpo não escapa para a linha gravada", async () => {
    const resposta = await POST(
      requisicao({
        corpo: {
          avisos: "ativados",
          user_id: "10000000-0000-4000-8000-000000000999",
          email: "outra@example.invalid",
        },
      }),
    )
    expect(resposta.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: PESSOA.id,
        messages: true,
        comments: true,
        events: true,
        mentions: true,
        updated_at: expect.any(String),
      },
      { onConflict: "user_id" },
    )
  })

  it("'ativados' grava os quatro tipos ligados com o id da SESSÃO", async () => {
    const resposta = await POST(requisicao({ corpo: { avisos: "ativados" } }))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true, avisos: "ativados" })
    expect(mockUpsert).toHaveBeenCalledTimes(1)
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: PESSOA.id,
        messages: true,
        comments: true,
        events: true,
        mentions: true,
        updated_at: expect.any(String),
      },
      { onConflict: "user_id" },
    )
    const linha = mockUpsert.mock.calls[0]?.[0] as Record<string, unknown>
    expect(linha["updated_at"]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it("'agora-nao' grava os quatro tipos desligados com o id da SESSÃO", async () => {
    const resposta = await POST(requisicao({ corpo: { avisos: "agora-nao" } }))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true, avisos: "agora-nao" })
    expect(mockUpsert).toHaveBeenCalledTimes(1)
    expect(mockUpsert).toHaveBeenCalledWith(
      {
        user_id: PESSOA.id,
        messages: false,
        comments: false,
        events: false,
        mentions: false,
        updated_at: expect.any(String),
      },
      { onConflict: "user_id" },
    )
  })

  it("falha do upsert vira 503", async () => {
    mockUpsert.mockResolvedValue({ error: { message: "db offline" } })
    const resposta = await POST(requisicao({ corpo: { avisos: "ativados" } }))
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "gravacao-indisponivel" })
  })

  it("falta de variável do servidor responde 503, não 500", async () => {
    criarCliente.mockImplementation(() => {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    })
    const resposta = await POST(requisicao({ corpo: { avisos: "ativados" } }))
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "indisponivel" })
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
