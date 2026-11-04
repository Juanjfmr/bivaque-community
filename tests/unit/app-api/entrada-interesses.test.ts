import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// A etapa "interesses" da entrada grava, pelo RPC canônico, os grupos que a
// pessoa marcou na própria cidade. O teste troca a sessão e o cliente de
// serviço e prova o contrato: CSRF da escrita, forma do corpo (lista de UUIDs,
// teto de 20, duplicados removidos), a cidade vinda do vínculo da SESSÃO (nunca
// do corpo), a lista vazia aceita (continuar sem grupos) e a falha do banco
// virando 503 sem eco da mensagem nem dos ids no log.

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { OPTIONS, POST } from "web/app/api/app/entry/interests/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { createServerClient } from "web/lib/supabase/server"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const criarCliente = vi.mocked(createServerClient)

const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }
// O NextRequest normaliza o host do URL para localhost no runner de teste; o que
// importa é a origem do cabeçalho bater com a do request, como no runtime.
const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/app/api/app/entry/interests`
const CIDADE = "00000000-0000-4000-8000-000000000001"
const CIDADE_DO_CORPO = "00000000-0000-4000-8000-000000000999"
const GRUPO_A = "20000000-0000-4000-8000-00000000000a"
const GRUPO_B = "20000000-0000-4000-8000-00000000000b"

const mockVinculo = vi.fn()
const mockRpc = vi.fn()
const mockEq = vi.fn()
// O cliente do USUÁRIO não aparece neste caminho: a tabela é operacional e só
// o cliente de serviço, autorizado no código, lê e grava. Se a rota tocar nele,
// os testes falham.
const mockClienteDoUsuario = vi.fn()

function clienteDeServico() {
  return {
    from: (tabela: string) => {
      if (tabela !== "locality_memberships") throw new Error(`tabela inesperada: ${tabela}`)
      return {
        select: () => ({
          eq: (coluna: string, valor: string) => {
            mockEq(coluna, valor)
            return { limit: () => ({ maybeSingle: mockVinculo }) }
          },
        }),
      }
    },
    rpc: mockRpc,
  }
}

function sessaoAutenticada() {
  return {
    estado: "autenticada",
    via: "cookie",
    usuario: PESSOA,
    cliente: { from: mockClienteDoUsuario, rpc: mockClienteDoUsuario },
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

/** Um UUID válido por posição, para os casos de teto. */
function grupo(indice: number): string {
  return `20000000-0000-4000-8000-${String(indice).padStart(12, "0")}`
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  mockVinculo.mockResolvedValue({ data: { locality_id: CIDADE }, error: null })
  mockRpc.mockResolvedValue({ data: null, error: null })
  criarCliente.mockReturnValue(clienteDeServico() as never)
  resolver.mockResolvedValue(sessaoAutenticada() as never)
})

describe("POST /api/app/entry/interests", () => {
  it("sem sessão responde 401 e não toca no banco", async () => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
    const resposta = await POST(requisicao({ corpo: { grupos: [GRUPO_A] } }))
    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toEqual({ autenticado: false, motivo: "sem-credencial" })
    expect(mockVinculo).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("escrita por cookie sem o cabeçalho do app é recusada antes de qualquer leitura", async () => {
    const resposta = await POST(requisicao({ cabecalho: false, corpo: { grupos: [GRUPO_A] } }))
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "cabecalho-ausente" })
    expect(mockVinculo).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("origem fora da lista é recusada", async () => {
    const resposta = await POST(
      requisicao({
        origem: "https://evil.example.invalid",
        corpo: { grupos: [GRUPO_A] },
      }),
    )
    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "origem-recusada" })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("corpo que não é objeto ou JSON quebrado é 400 corpo-invalido", async () => {
    for (const texto of ["[]", '"texto"', "null", "123", "{quebrado"]) {
      const resposta = await POST(requisicao({ texto }))
      expect(resposta.status).toBe(400)
      expect(await resposta.json()).toEqual({ erro: "corpo-invalido" })
    }
    expect(mockVinculo).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("grupo que não é UUID válido é 400 grupos-invalidos, sem gravar", async () => {
    const INVALIDOS: unknown[] = [
      {},
      { grupos: null },
      { grupos: true },
      { grupos: GRUPO_A },
      { grupos: [GRUPO_A, 123] },
      { grupos: [null] },
      { grupos: ["nao-e-uuid"] },
      { grupos: ["20000000-0000-4000-8000-00000000000"] },
      { grupos: ["20000000-0000-4000-8000-00000000000g"] },
      { grupos: { 0: GRUPO_A } },
    ]
    for (const corpo of INVALIDOS) {
      const resposta = await POST(requisicao({ corpo }))
      expect(resposta.status).toBe(400)
      expect(await resposta.json()).toEqual({ erro: "grupos-invalidos" })
    }
    expect(mockVinculo).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("mais de 20 grupos é 400 grupos-invalidos, sem gravar", async () => {
    const resposta = await POST(
      requisicao({ corpo: { grupos: Array.from({ length: 21 }, (_, i) => grupo(i + 1)) } }),
    )
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "grupos-invalidos" })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("corpo acima de 32 KB é 413 grande-demais, sem gravar", async () => {
    const resposta = await POST(
      requisicao({
        texto: JSON.stringify({ grupos: [GRUPO_A], lixo: "x".repeat(40 * 1024) }),
      }),
    )
    expect(resposta.status).toBe(413)
    expect(await resposta.json()).toEqual({ erro: "grande-demais" })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("sem vínculo com cidade responde 409 sem-cidade, sem gravar", async () => {
    mockVinculo.mockResolvedValue({ data: null, error: null })
    const resposta = await POST(requisicao({ corpo: { grupos: [GRUPO_A] } }))
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toEqual({ erro: "sem-cidade" })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("falha na leitura do vínculo vira 503, não 409", async () => {
    mockVinculo.mockResolvedValue({ data: null, error: { message: "db offline" } })
    const resposta = await POST(requisicao({ corpo: { grupos: [GRUPO_A] } }))
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "indisponivel" })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("grava com o id da SESSÃO e a cidade do vínculo, e devolve os grupos", async () => {
    const resposta = await POST(
      requisicao({
        corpo: {
          grupos: [GRUPO_A, GRUPO_B],
          // Campos forjados no corpo não escolhem dono nem cidade.
          user_id: "10000000-0000-4000-8000-000000000999",
          locality_id: CIDADE_DO_CORPO,
        },
      }),
    )
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true, grupos: [GRUPO_A, GRUPO_B] })
    expect(mockEq).toHaveBeenCalledWith("user_id", PESSOA.id)
    expect(mockRpc).toHaveBeenCalledTimes(1)
    expect(mockRpc).toHaveBeenCalledWith("record_user_group_interests", {
      p_user_id: PESSOA.id,
      p_locality_id: CIDADE,
      p_group_ids: [GRUPO_A, GRUPO_B],
    })
    expect(mockClienteDoUsuario).not.toHaveBeenCalled()
  })

  it("duplicados saem antes de gravar, inclusive variante de caixa", async () => {
    const resposta = await POST(
      requisicao({ corpo: { grupos: [GRUPO_A, GRUPO_B, GRUPO_A, GRUPO_B.toUpperCase()] } }),
    )
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true, grupos: [GRUPO_A, GRUPO_B] })
    expect(mockRpc).toHaveBeenCalledWith("record_user_group_interests", {
      p_user_id: PESSOA.id,
      p_locality_id: CIDADE,
      p_group_ids: [GRUPO_A, GRUPO_B],
    })
  })

  it("lista vazia é aceita: continuar sem grupos limpa o conjunto", async () => {
    const resposta = await POST(requisicao({ corpo: { grupos: [] } }))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true, grupos: [] })
    expect(mockRpc).toHaveBeenCalledWith("record_user_group_interests", {
      p_user_id: PESSOA.id,
      p_locality_id: CIDADE,
      p_group_ids: [],
    })
  })

  it("vinte grupos no limite são aceitos", async () => {
    const grupos = Array.from({ length: 20 }, (_, i) => grupo(i + 1))
    const resposta = await POST(requisicao({ corpo: { grupos } }))
    expect(resposta.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith("record_user_group_interests", {
      p_user_id: PESSOA.id,
      p_locality_id: CIDADE,
      p_group_ids: grupos,
    })
  })

  it("falha do RPC vira 503 sem ecoar a mensagem do banco", async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "group not in caller locality" },
    })
    const resposta = await POST(requisicao({ corpo: { grupos: [GRUPO_A] } }))
    expect(resposta.status).toBe(503)
    const texto = await resposta.text()
    expect(texto).toContain("gravacao-indisponivel")
    expect(texto).not.toContain("caller locality")
  })

  it("falha do RPC não registra os ids dos grupos no log", async () => {
    const registrado: string[] = []
    const consoleError = vi.spyOn(console, "error").mockImplementation((linha: unknown) => {
      registrado.push(String(linha))
    })
    try {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "group not in caller locality" },
      })
      const resposta = await POST(requisicao({ corpo: { grupos: [GRUPO_A, GRUPO_B] } }))
      expect(resposta.status).toBe(503)
      expect(registrado.join("\n")).toContain("entry interests write failed")
      expect(registrado.join("\n")).toContain("group not in caller locality")
      expect(registrado.join("\n")).not.toContain(GRUPO_A)
      expect(registrado.join("\n")).not.toContain(GRUPO_B)
    } finally {
      consoleError.mockRestore()
    }
  })

  it("falta de variável do servidor responde 503, não 500", async () => {
    criarCliente.mockImplementation(() => {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    })
    const resposta = await POST(requisicao({ corpo: { grupos: [GRUPO_A] } }))
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
