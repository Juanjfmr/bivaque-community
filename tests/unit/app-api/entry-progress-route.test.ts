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

const PESSOA = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "pessoa@example.invalid",
  appMetadata: {},
}
// O NextRequest normaliza o host do URL para localhost no runner de teste; o que
// importa é a origem do cabeçalho bater com a do request, como no runtime.
const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/app/api/app/entry/progress`

const mockMaybeSingle = vi.fn()
const mockVinculo = vi.fn()
const mockUpsert = vi.fn()
const mockDelete = vi.fn()

// Duas leituras do usuário, sob RLS: o rascunho (`entry_progress`) e o vínculo
// com a cidade (`locality_memberships`), que decide o destino.
function clienteDoUsuario() {
  return {
    from: (tabela: string) => ({
      select: () =>
        tabela === "locality_memberships"
          ? { eq: () => ({ limit: () => ({ maybeSingle: mockVinculo }) }) }
          : { eq: () => ({ maybeSingle: mockMaybeSingle }) },
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
  mockVinculo.mockResolvedValue({ data: null, error: null })
  mockUpsert.mockResolvedValue({ error: null })
  mockDelete.mockResolvedValue({ error: null })
  criarClienteDeServico.mockReturnValue({
    from: () => ({
      upsert: mockUpsert,
      delete: () => ({ eq: mockDelete }),
    }),
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

  it("rascunho vencido é apagado na leitura e a entrada recomeça", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        versao: 2,
        etapa: "cidade",
        estado: {},
        updated_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      },
      error: null,
    })
    const resposta = await GET(requisicao("GET"))
    expect(resposta.status).toBe(200)
    expect(mockDelete).toHaveBeenCalledWith("user_id", PESSOA.id)
    expect(((await resposta.json()) as { progresso: { etapa: string } }).progresso.etapa).toBe(
      "porta",
    )
  })

  it("falha ao apagar o rascunho vencido vira 503, não sucesso com dado para trás", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: {
        versao: 2,
        etapa: "cidade",
        estado: {},
        updated_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      },
      error: null,
    })
    mockDelete.mockResolvedValue({ error: { message: "db offline" } })
    const resposta = await GET(requisicao("GET"))
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "leitura-indisponivel" })
  })

  it("informa o Google quando a sessão nasceu no OAuth", async () => {
    resolver.mockResolvedValue({
      ...sessaoAutenticada(),
      usuario: { ...PESSOA, appMetadata: { provider: "google" } },
    } as never)

    const resposta = await GET(requisicao("GET"))

    expect(await resposta.json()).toEqual({
      autenticado: true,
      via: "cookie",
      provedor: "google",
      progresso: { versao: 2, etapa: "porta", estado: {} },
    })
  })

  it("não inventa provedor para sessão de e-mail ou metadado desconhecido", async () => {
    resolver.mockResolvedValue({
      ...sessaoAutenticada(),
      usuario: { ...PESSOA, appMetadata: { provider: "github" } },
    } as never)

    const resposta = await GET(requisicao("GET"))

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

  it("falha na leitura do vínculo também é 503: não decide o destino às cegas", async () => {
    mockVinculo.mockResolvedValue({ data: null, error: { message: "db offline" } })
    expect((await GET(requisicao("GET"))).status).toBe(503)
  })

  it("quem já tem vínculo com a cidade recebe a etapa final, não a porta", async () => {
    mockVinculo.mockResolvedValue({
      data: { locality_id: "00000000-0000-4000-8000-000000000001" },
      error: null,
    })
    const semRascunho = await GET(requisicao("GET"))
    expect(await semRascunho.json()).toEqual({
      autenticado: true,
      via: "cookie",
      progresso: { versao: 2, etapa: "inicio", estado: {} },
    })

    // O rascunho que sobreviveu ao provisionamento é o marcador da etapa
    // seguinte: com vínculo, ele retoma a entrada em vez de pular para o Início.
    mockMaybeSingle.mockResolvedValue({
      data: {
        versao: 2,
        etapa: "previa-cidade",
        estado: { cidade: "Manaus" },
        updated_at: new Date().toISOString(),
      },
      error: null,
    })
    const comRascunho = (await (await GET(requisicao("GET"))).json()) as {
      progresso: { etapa: string; estado: unknown }
    }
    expect(comRascunho.progresso.etapa).toBe("previa-cidade")
  })

  it("marcador de versão antiga com vínculo é ignorado e vira a etapa final", async () => {
    mockVinculo.mockResolvedValue({
      data: { locality_id: "00000000-0000-4000-8000-000000000001" },
      error: null,
    })
    mockMaybeSingle.mockResolvedValue({
      data: {
        versao: 1,
        etapa: "combinado",
        estado: {},
        updated_at: new Date().toISOString(),
      },
      error: null,
    })
    const corpo = (await (await GET(requisicao("GET"))).json()) as {
      progresso: { etapa: string }
    }
    expect(corpo.progresso.etapa).toBe("inicio")
  })

  it("sem vínculo o rascunho continua mandando (a etapa não é forçada)", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { versao: 2, etapa: "cidade", estado: {} },
      error: null,
    })
    const corpo = (await (await GET(requisicao("GET"))).json()) as { progresso: { etapa: string } }
    expect(corpo.progresso.etapa).toBe("cidade")
  })

  it("rascunho de versão diferente da atual volta ao progresso inicial", async () => {
    for (const versao of [1, 3]) {
      mockMaybeSingle.mockResolvedValue({
        data: { versao, etapa: "cidade", estado: { cidade: "Manaus" } },
        error: null,
      })
      const corpo = (await (await GET(requisicao("GET"))).json()) as { progresso: unknown }
      expect(corpo.progresso).toEqual({ versao: 2, etapa: "porta", estado: {} })
    }
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

  it("quem já tem vínculo com a cidade recebe 409 e o rascunho não é regravado", async () => {
    mockVinculo.mockResolvedValue({ data: { locality_id: "cidade" }, error: null })
    const resposta = await PUT(requisicao("PUT", { cabecalho: "bivaque-spa", corpo: CORPO }))
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toEqual({ erro: "entrada-concluida" })
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("falha ao conferir o vínculo é 503, não gravação às cegas", async () => {
    mockVinculo.mockResolvedValue({ data: null, error: { message: "boom" } })
    const resposta = await PUT(requisicao("PUT", { cabecalho: "bivaque-spa", corpo: CORPO }))
    expect(resposta.status).toBe(503)
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

  it("recusa versão diferente da atual (400) sem gravar", async () => {
    for (const versao of [1, 3]) {
      const resposta = await PUT(
        requisicao("PUT", { cabecalho: "bivaque-spa", corpo: { ...CORPO, versao } }),
      )
      expect(resposta.status).toBe(400)
      expect(await resposta.json()).toEqual({ erro: "versao-invalida" })
    }
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it("aceita sobrenome vazio no rascunho", async () => {
    const corpo = { ...CORPO, etapa: "nome", estado: { nome: { nome: "Madonna", sobrenome: "" } } }
    const resposta = await PUT(requisicao("PUT", { cabecalho: "bivaque-spa", corpo }))
    expect(resposta.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledTimes(1)
  })

  it("falta de variável do servidor responde 503, não 500", async () => {
    criarClienteDeServico.mockImplementation(() => {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    })
    const resposta = await PUT(requisicao("PUT", { cabecalho: "bivaque-spa", corpo: CORPO }))
    expect(resposta.status).toBe(503)
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
