import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// A gestão de interesses no app (F10 / RUN-160): leitura dos grupos da cidade
// da SESSÃO com o que já está marcado, e a gravação replace-set pelo RPC
// canônico. O teste troca a sessão e o cliente de serviço e prova o contrato da
// porta (ADR-20261105 §5): CSRF da escrita, teto de 20, UUID válido, duplicados
// removidos, cidade vinda do vínculo `current` da sessão (nunca do corpo), grupo
// de outra cidade recusado pelo RPC (42501 -> 409) e falha do banco virando 503
// sem eco da mensagem nem dos ids.

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { GET, OPTIONS, POST } from "web/app/api/app/voce/interesses/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { createServerClient } from "web/lib/supabase/server"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const criarCliente = vi.mocked(createServerClient)

const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }
const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/api/app/voce/interesses`
const CIDADE = "00000000-0000-4000-8000-000000000001"
const CIDADE_DO_CORPO = "00000000-0000-4000-8000-000000000999"
const GRUPO_A = "60000000-0000-4000-8000-000000000001"
const GRUPO_B = "60000000-0000-4000-8000-000000000002"
// Grupo de uma cidade anterior: gravado, mas fora de `grupos` na cidade atual.
const GRUPO_ANTIGO = "60000000-0000-4000-8000-0000000000ff"

const mockVinculo = vi.fn()
const mockRpc = vi.fn()
const mockEq = vi.fn()
// O cliente do USUÁRIO não aparece neste caminho: a tabela é operacional e só
// o cliente de serviço, autorizado no código, lê e grava.
const mockClienteDoUsuario = vi.fn()

type Cadeia = {
  select: () => Cadeia
  eq: (coluna: string, valor: string) => Cadeia
  order: () => Cadeia
  limit: () => { maybeSingle: typeof mockVinculo }
}

function clienteDeServico() {
  const cadeia: Cadeia = {
    select: () => cadeia,
    eq: (coluna, valor) => {
      mockEq(coluna, valor)
      return cadeia
    },
    order: () => cadeia,
    limit: () => ({ maybeSingle: mockVinculo }),
  }
  return {
    from: (tabela: string) => {
      if (tabela !== "locality_memberships") throw new Error(`tabela inesperada: ${tabela}`)
      return cadeia
    },
    rpc: mockRpc,
  }
}

const GRUPOS_DISPONIVEIS = [
  { id: GRUPO_A, name: "Trocas de Livros", already_member: false },
  { id: GRUPO_B, name: "Pesca e Trilha", already_member: true },
]

/**
 * Responde cada RPC pelo nome: a leitura e a gravação vivem na mesma rota e o
 * teste precisa de respostas diferentes para as duas.
 */
function rpcs(tabela: {
  disponiveis?: unknown
  gravados?: unknown
  gravacao?: { message: string; code?: string } | null
}) {
  mockRpc.mockImplementation((nome: string) => {
    if (nome === "list_available_groups_for_interests")
      return Promise.resolve({ data: tabela.disponiveis ?? [], error: null })
    if (nome === "list_user_group_interests")
      return Promise.resolve({ data: tabela.gravados ?? [], error: null })
    if (nome === "record_user_group_interests")
      return Promise.resolve({ data: null, error: tabela.gravacao ?? null })
    return Promise.reject(new Error(`rpc inesperada: ${nome}`))
  })
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

function leitura() {
  return new NextRequest(URL_DA_ROTA, { method: "GET", headers: { origin: ORIGEM } })
}

function preflight(origem = ORIGEM) {
  return new NextRequest(URL_DA_ROTA, { method: "OPTIONS", headers: { origin: origem } })
}

/** Um UUID válido por posição, para os casos de teto. */
function grupo(indice: number): string {
  return `60000000-0000-4000-8000-${String(indice).padStart(12, "0")}`
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  mockVinculo.mockResolvedValue({
    data: { locality_id: CIDADE, localities: { city_name: "Manaus" } },
    error: null,
  })
  rpcs({})
  criarCliente.mockReturnValue(clienteDeServico() as never)
  resolver.mockResolvedValue(sessaoAutenticada() as never)
})

describe("GET /api/app/voce/interesses", () => {
  it("sem sessão responde 401 e não toca no banco", async () => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
    const resposta = await GET(leitura())
    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toEqual({ autenticado: false, motivo: "sem-credencial" })
    expect(mockVinculo).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("devolve os grupos da cidade e o que já está marcado", async () => {
    rpcs({ disponiveis: GRUPOS_DISPONIVEIS, gravados: [{ group_id: GRUPO_A }] })
    const resposta = await GET(leitura())
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      grupos: [
        { id: GRUPO_A, nome: "Trocas de Livros", jaMembro: false },
        { id: GRUPO_B, nome: "Pesca e Trilha", jaMembro: true },
      ],
      interesses: [GRUPO_A],
    })
    // A cidade é a do vínculo `current` da SESSÃO (ADR-20261105 §3.3).
    expect(mockEq).toHaveBeenCalledWith("user_id", PESSOA.id)
    expect(mockEq).toHaveBeenCalledWith("kind", "current")
    expect(mockRpc).toHaveBeenCalledWith("list_available_groups_for_interests", {
      p_user_id: PESSOA.id,
      p_locality_id: CIDADE,
    })
    expect(mockRpc).toHaveBeenCalledWith("list_user_group_interests", { p_user_id: PESSOA.id })
    expect(mockClienteDoUsuario).not.toHaveBeenCalled()
  })

  it("lista vazia é resposta legítima, não erro", async () => {
    const resposta = await GET(leitura())
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ grupos: [], interesses: [] })
  })

  it("interesses devolvidos são sempre subconjunto dos grupos da cidade", async () => {
    // Trocar de cidade não apaga os interesses antigos. Se o GET devolvesse o
    // conjunto completo, a folha o reenviaria no Salvar e o RPC recusaria tudo.
    rpcs({
      disponiveis: GRUPOS_DISPONIVEIS,
      gravados: [{ group_id: GRUPO_A }, { group_id: GRUPO_ANTIGO }],
    })
    const resposta = await GET(leitura())
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      grupos: [
        { id: GRUPO_A, nome: "Trocas de Livros", jaMembro: false },
        { id: GRUPO_B, nome: "Pesca e Trilha", jaMembro: true },
      ],
      interesses: [GRUPO_A],
    })
  })

  it("só interesse de outra cidade vira lista vazia, não o interesse antigo", async () => {
    rpcs({ disponiveis: GRUPOS_DISPONIVEIS, gravados: [{ group_id: GRUPO_ANTIGO }] })
    const resposta = await GET(leitura())
    expect(await resposta.json()).toEqual({
      grupos: [
        { id: GRUPO_A, nome: "Trocas de Livros", jaMembro: false },
        { id: GRUPO_B, nome: "Pesca e Trilha", jaMembro: true },
      ],
      interesses: [],
    })
  })

  it("sem vínculo com cidade responde 409 sem-cidade", async () => {
    mockVinculo.mockResolvedValue({ data: null, error: null })
    const resposta = await GET(leitura())
    expect(resposta.status).toBe(409)
    expect(await resposta.json()).toEqual({ erro: "sem-cidade" })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("falha de leitura do banco vira 503, não lista vazia", async () => {
    mockRpc.mockImplementation(() =>
      Promise.resolve({ data: null, error: { message: "db offline" } }),
    )
    const resposta = await GET(leitura())
    expect(resposta.status).toBe(503)
    const texto = await resposta.text()
    expect(texto).toContain("leitura-indisponivel")
    expect(texto).not.toContain("db offline")
  })

  it("falta de variável do servidor responde 503, não 500", async () => {
    criarCliente.mockImplementation(() => {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required")
    })
    const resposta = await GET(leitura())
    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "indisponivel" })
  })
})

describe("POST /api/app/voce/interesses", () => {
  it("sem sessão responde 401 e não grava", async () => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
    const resposta = await POST(requisicao({ corpo: { grupos: [GRUPO_A] } }))
    expect(resposta.status).toBe(401)
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
      requisicao({ origem: "https://evil.example.invalid", corpo: { grupos: [GRUPO_A] } }),
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
      { grupos: ["60000000-0000-4000-8000-00000000000"] },
      { grupos: ["60000000-0000-4000-8000-00000000000g"] },
      { grupos: { 0: GRUPO_A } },
    ]
    for (const corpo of INVALIDOS) {
      const resposta = await POST(requisicao({ corpo }))
      expect(resposta.status).toBe(400)
      expect(await resposta.json()).toEqual({ erro: "grupos-invalidos" })
    }
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
      requisicao({ texto: JSON.stringify({ grupos: [GRUPO_A], lixo: "x".repeat(40 * 1024) }) }),
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
    expect(await resposta.json()).toEqual({ erro: "leitura-indisponivel" })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("grava com o id da SESSÃO e a cidade do vínculo, e devolve o estado gravado", async () => {
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
    expect(await resposta.json()).toEqual({ ok: true, interesses: [GRUPO_A, GRUPO_B] })
    expect(mockEq).toHaveBeenCalledWith("user_id", PESSOA.id)
    expect(mockEq).toHaveBeenCalledWith("kind", "current")
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
    expect(await resposta.json()).toEqual({ ok: true, interesses: [GRUPO_A, GRUPO_B] })
    expect(mockRpc).toHaveBeenCalledWith("record_user_group_interests", {
      p_user_id: PESSOA.id,
      p_locality_id: CIDADE,
      p_group_ids: [GRUPO_A, GRUPO_B],
    })
  })

  it("lista vazia é aceita: limpar os interesses", async () => {
    const resposta = await POST(requisicao({ corpo: { grupos: [] } }))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ ok: true, interesses: [] })
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

  it("grupo de outra cidade recusado pelo RPC (42501) vira 409 sem eco", async () => {
    rpcs({ gravacao: { message: "group not in caller locality", code: "42501" } })
    const resposta = await POST(requisicao({ corpo: { grupos: [GRUPO_A] } }))
    expect(resposta.status).toBe(409)
    const texto = await resposta.text()
    expect(texto).toContain("grupo-de-outra-cidade")
    expect(texto).not.toContain("caller locality")
  })

  it("outra falha do RPC vira 503 sem ecoar a mensagem do banco", async () => {
    rpcs({ gravacao: { message: "connection closed", code: "08006" } })
    const resposta = await POST(requisicao({ corpo: { grupos: [GRUPO_A] } }))
    expect(resposta.status).toBe(503)
    const texto = await resposta.text()
    expect(texto).toContain("gravacao-indisponivel")
    expect(texto).not.toContain("connection closed")
  })

  it("falha do RPC não registra os ids dos grupos no log", async () => {
    const registrado: string[] = []
    const consoleError = vi.spyOn(console, "error").mockImplementation((linha: unknown) => {
      registrado.push(String(linha))
    })
    try {
      rpcs({ gravacao: { message: "group not in caller locality", code: "42501" } })
      const resposta = await POST(requisicao({ corpo: { grupos: [GRUPO_A, GRUPO_B] } }))
      expect(resposta.status).toBe(409)
      expect(registrado.join("\n")).toContain("voce interests write failed")
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

// F1 da revisão do RUN-160: quem trocou de cidade ficava com a folha travada em
// 409, porque o GET devolvia os interesses antigos e o Salvar reenviava o
// conjunto inteiro. O recorte no GET devolve a saída pela UI sem quebrar o
// replace-set: salvar descarta o passado e limpar esvazia tudo.
describe("pessoa com interesses de uma cidade anterior", () => {
  const CIDADE_DOS_GRUPOS = new Set(GRUPOS_DISPONIVEIS.map((grupo) => grupo.id))

  /** O RPC real recusa o conjunto inteiro quando um grupo não é da cidade. */
  function rpcsComRegraDaCidade(): void {
    mockRpc.mockImplementation((nome: string, argumentos?: { p_group_ids?: string[] }) => {
      if (nome === "list_available_groups_for_interests")
        return Promise.resolve({ data: GRUPOS_DISPONIVEIS, error: null })
      if (nome === "list_user_group_interests")
        return Promise.resolve({
          data: [{ group_id: GRUPO_ANTIGO }, { group_id: GRUPO_A }],
          error: null,
        })
      if (nome === "record_user_group_interests") {
        const fora = (argumentos?.p_group_ids ?? []).some((id) => !CIDADE_DOS_GRUPOS.has(id))
        return Promise.resolve({
          data: null,
          error: fora ? { message: "group not in caller locality", code: "42501" } : null,
        })
      }
      return Promise.reject(new Error(`rpc inesperada: ${nome}`))
    })
  }

  it("abre a folha, salva e limpa sem 409, e o conjunto antigo é descartado", async () => {
    rpcsComRegraDaCidade()

    // O que a folha recebe hoje: só o recorte da cidade atual.
    const lido = await GET(leitura())
    const corpo = (await lido.json()) as { interesses: string[] }
    expect(corpo.interesses).toEqual([GRUPO_A])

    // Negativo: era este reenvio que travava a tela, sem saída.
    const completo = await POST(requisicao({ corpo: { grupos: [GRUPO_ANTIGO, GRUPO_A] } }))
    expect(completo.status).toBe(409)

    // Positivo: com o recorte, o Salvar passa e o replace-set descarta o antigo.
    const salvo = await POST(requisicao({ corpo: { grupos: corpo.interesses } }))
    expect(salvo.status).toBe(200)
    expect(await salvo.json()).toEqual({ ok: true, interesses: [GRUPO_A] })
    expect(mockRpc).toHaveBeenCalledWith("record_user_group_interests", {
      p_user_id: PESSOA.id,
      p_locality_id: CIDADE,
      p_group_ids: [GRUPO_A],
    })

    // Limpar também passa: esvazia tudo, inclusive o interesse antigo.
    mockRpc.mockClear()
    const limpo = await POST(requisicao({ corpo: { grupos: [] } }))
    expect(limpo.status).toBe(200)
    expect(await limpo.json()).toEqual({ ok: true, interesses: [] })
    expect(mockRpc).toHaveBeenCalledWith("record_user_group_interests", {
      p_user_id: PESSOA.id,
      p_locality_id: CIDADE,
      p_group_ids: [],
    })
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
