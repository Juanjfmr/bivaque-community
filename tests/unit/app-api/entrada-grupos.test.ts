import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// A rota dos grupos da etapa de interesses: sessão obrigatória, cidade vinda da
// sessão (nunca do pedido) e leitura pelo cliente de serviço — o app não fala
// com o Supabase. O teste troca a sessão e o cliente e prova o contrato: 401
// sem sessão, 409 sem cidade (o provisionamento não terminou), grupos públicos
// da cidade mapeados para nome/descricao e 503 em qualquer falha de leitura,
// nunca lista vazia silenciosa.

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET, OPTIONS } from "web/app/api/app/entry/groups/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)

const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }
const CIDADE = "00000000-0000-4000-8000-000000000001"
const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/app/api/app/entry/groups`

// Espiões do encadeamento de `locality_memberships` e de `groups`: o teste não
// olha só o JSON, confere os filtros que a rota aplica no banco.
const mockVinculoSelect = vi.fn()
const mockVinculoFiltro = vi.fn()
const mockVinculoLimite = vi.fn()
const mockVinculo = vi.fn()

const mockGruposSelect = vi.fn()
const mockGruposFiltroCidade = vi.fn()
const mockGruposFiltroVisibilidade = vi.fn()
const mockGruposOrdem = vi.fn()
const mockGruposLimite = vi.fn()

function clienteDoUsuario() {
  return {
    from: (tabela: string) => {
      if (tabela === "locality_memberships") {
        return {
          select: (colunas: string) => {
            mockVinculoSelect(colunas)
            return {
              eq: (coluna: string, valor: unknown) => {
                mockVinculoFiltro(coluna, valor)
                return {
                  limit: (quantidade: number) => {
                    mockVinculoLimite(quantidade)
                    return { maybeSingle: mockVinculo }
                  },
                }
              },
            }
          },
        }
      }
      if (tabela === "groups") {
        return {
          select: (colunas: string) => {
            mockGruposSelect(colunas)
            return {
              eq: (coluna: string, valor: unknown) => {
                mockGruposFiltroCidade(coluna, valor)
                return {
                  eq: (colunaDaVisibilidade: string, visibilidade: unknown) => {
                    mockGruposFiltroVisibilidade(colunaDaVisibilidade, visibilidade)
                    return {
                      order: (colunaDaOrdem: string, opcoes: unknown) => {
                        mockGruposOrdem(colunaDaOrdem, opcoes)
                        return { limit: mockGruposLimite }
                      },
                    }
                  },
                }
              },
            }
          },
        }
      }
      throw new Error(`tabela inesperada: ${tabela}`)
    },
  }
}

// A rota lê pelo cliente da sessão, sob RLS: a leitura do vínculo é a do dono e
// a policy de `groups` já exige ser membro da cidade.
function sessaoAutenticada() {
  return {
    estado: "autenticada",
    via: "cookie",
    usuario: PESSOA,
    cliente: clienteDoUsuario(),
    cabecalhos: {},
  }
}

function semSessao() {
  resolver.mockResolvedValue({
    estado: "recusada",
    sessao: { estado: "recusada", motivo: "sem-credencial" },
  } as never)
}

function requisicao(metodo = "GET", origem = ORIGEM) {
  return new NextRequest(URL_DA_ROTA, { method: metodo, headers: { origin: origem } })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  mockVinculo.mockResolvedValue({ data: { locality_id: CIDADE }, error: null })
  mockGruposLimite.mockResolvedValue({ data: [], error: null })
  resolver.mockResolvedValue(sessaoAutenticada() as never)
})

describe("GET /api/app/entry/groups", () => {
  it("sem sessão responde 401 com o motivo e não lê nada", async () => {
    semSessao()
    const resposta = await GET(requisicao())
    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toEqual({ autenticado: false, motivo: "sem-credencial" })
    expect(mockVinculoSelect).not.toHaveBeenCalled()
  })

  it("sem cidade responde 409 e não consulta grupos", async () => {
    mockVinculo.mockResolvedValue({ data: null, error: null })
    const resposta = await GET(requisicao())
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toEqual({ erro: "sem-cidade" })
    expect(mockGruposSelect).not.toHaveBeenCalled()
  })

  it("com cidade devolve os grupos públicos mapeados para nome/descricao", async () => {
    const veteranos = {
      id: "10000000-0000-4000-8000-000000000101",
      name: "Veteranos",
      description: "Encontros",
    }
    const familias = {
      id: "10000000-0000-4000-8000-000000000102",
      name: "Famílias",
      description: null,
    }
    mockGruposLimite.mockResolvedValue({ data: [veteranos, familias], error: null })

    const resposta = await GET(requisicao())
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      autenticado: true,
      grupos: [
        { id: veteranos.id, nome: "Veteranos", descricao: "Encontros" },
        { id: familias.id, nome: "Famílias", descricao: null },
      ],
    })

    // A cidade é a da sessão; os grupos são só os públicos dela, por nome, com teto.
    expect(mockVinculoSelect).toHaveBeenCalledWith("locality_id")
    expect(mockVinculoFiltro).toHaveBeenCalledWith("user_id", PESSOA.id)
    expect(mockVinculoLimite).toHaveBeenCalledWith(1)
    expect(mockGruposSelect).toHaveBeenCalledWith("id, name, description")
    expect(mockGruposFiltroCidade).toHaveBeenCalledWith("locality_id", CIDADE)
    expect(mockGruposFiltroVisibilidade).toHaveBeenCalledWith("visibility", "public")
    expect(mockGruposOrdem).toHaveBeenCalledWith("name", { ascending: true })
    expect(mockGruposLimite).toHaveBeenCalledWith(50)
  })

  it("leitura da cidade que falha vira 503, nunca lista vazia", async () => {
    mockVinculo.mockResolvedValue({ data: null, error: { message: "db offline" } })
    const resposta = await GET(requisicao())
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "leitura-indisponivel" })
    expect(mockGruposSelect).not.toHaveBeenCalled()
  })

  it("leitura dos grupos que falha vira 503", async () => {
    mockGruposLimite.mockResolvedValue({ data: null, error: { message: "db offline" } })
    const resposta = await GET(requisicao())
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "leitura-indisponivel" })
  })

  it("responde com os cabeçalhos de CORS e no-store do contrato", async () => {
    const resposta = await GET(requisicao())
    expect(resposta.headers.get("access-control-allow-origin")).toBe(ORIGEM)
    expect(resposta.headers.get("access-control-allow-credentials")).toBe("true")
    expect(resposta.headers.get("cache-control")).toBe("no-store")
  })

  it("é leitura: não exige o cabeçalho do app", async () => {
    // O helper de requisição não manda x-bivaque-app; um 403 aqui seria CSRF na leitura.
    expect((await GET(requisicao())).status).toBe(200)
  })
})

describe("OPTIONS da rota", () => {
  it("responde preflight só para a origem da lista", () => {
    const permitida = OPTIONS(requisicao("OPTIONS"))
    expect(permitida.status).toBe(204)
    expect(permitida.headers.get("access-control-allow-origin")).toBe(ORIGEM)

    const recusada = OPTIONS(requisicao("OPTIONS", "https://evil.example.invalid"))
    expect(recusada.status).toBe(403)
    expect(recusada.headers.get("access-control-allow-origin")).toBeNull()
  })
})
