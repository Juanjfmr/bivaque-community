import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET as ficha, PATCH as salvar } from "web/app/api/app/prestador/ficha/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app"
const FICHA = "10000000-0000-4000-8000-000000000001"
const USER = "10000000-0000-4000-8000-000000000010"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}

type Opcoes = {
  semFicha?: boolean
  /** A escrita não devolve linha: o `.select("id")` volta vazio. */
  semLinhaGravada?: boolean
  erroDoInsert?: { code: string; message: string }
  erroDoUpdate?: { code: string; message: string }
  erroDeTabela?: string
}

function cliente(opcoes: Opcoes = {}) {
  const gravacoes: { tabela: string; metodo: string; valores?: unknown }[] = []
  const filtros: { tabela: string; coluna: string; valor: unknown }[] = []
  // A ficha passa a existir quando o insert acontece: a rota relê depois.
  let existe = opcoes.semFicha !== true

  const linha = {
    id: FICHA,
    display_name: "Climatiza Manaus",
    category: "assistencia_tecnica",
    bio: "Apoio prático para quem está chegando.",
  }

  const resposta = (tabela: string, unico: boolean) => {
    if (opcoes.erroDeTabela === tabela) {
      return { data: null, error: { code: "XX000", message: "segredo do Postgres" } }
    }
    if (tabela === "provider_profiles")
      return { data: unico ? (existe ? linha : null) : [], error: null, count: null }
    if (tabela === "provider_catalog_items") return { data: [], error: null, count: 0 }
    if (tabela === "provider_portfolio_photos") return { data: [], error: null, count: 0 }
    throw new Error(`Tabela inesperada: ${tabela}`)
  }

  const rpc = vi.fn(async () => ({ data: null, error: null }))

  const from = vi.fn((tabela: string) => {
    // Resultado da escrita em curso: `insert`/`update` guardam o erro aqui e o
    // builder continua encadeável (`eq`, `then`), como o PostgREST.
    let pendente: { error: { code: string; message: string } | null } | null = null
    const consulta: Record<string, unknown> = {}
    for (const metodo of ["select", "order", "limit", "is"]) consulta[metodo] = () => consulta
    consulta["eq"] = (coluna: string, valor: unknown) => {
      filtros.push({ tabela, coluna, valor })
      return consulta
    }
    consulta["insert"] = (valores: unknown) => {
      gravacoes.push({ tabela, metodo: "insert", valores })
      pendente = { error: opcoes.erroDoInsert ?? null }
      if (opcoes.erroDoInsert === undefined) existe = true
      return consulta
    }
    consulta["update"] = (valores: unknown) => {
      gravacoes.push({ tabela, metodo: "update", valores })
      pendente = { error: opcoes.erroDoUpdate ?? null }
      return consulta
    }
    consulta["maybeSingle"] = async () => {
      if (pendente !== null) return { data: null, error: pendente.error }
      return resposta(tabela, true)
    }
    // biome-ignore lint/suspicious/noThenProperty: o builder PostgREST é awaitable
    Object.defineProperty(consulta, "then", {
      value: (fn: (valor: unknown) => unknown) => {
        // A escrita com `.select("id")` devolve a linha gravada; o caso vazio é
        // o update que não toca nada (B1).
        const escrita =
          pendente === null
            ? null
            : {
                data: opcoes.semLinhaGravada === true ? [] : [{ id: FICHA }],
                error: pendente.error,
              }
        return Promise.resolve(fn(escrita ?? resposta(tabela, false)))
      },
    })
    return consulta
  })

  return {
    client: {
      from,
      rpc,
      storage: {
        from: () => ({ createSignedUrl: async () => ({ data: null, error: null }) }),
      },
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
    usuario: { id: USER, email: "prestador@example.invalid", appMetadata: {} },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}

function req(caminho = "prestador/ficha", metodo = "GET", body?: BodyInit, cabecalhos = headers) {
  return new NextRequest(`${BASE}/${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    ...(body === undefined ? {} : { body }),
  })
}

const corpo = JSON.stringify({
  nome: "Climatiza Manaus",
  categoria: "assistencia_tecnica",
  descricao: "Apoio prático para quem está chegando.",
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe("TROCA-005 — ficha do prestador pela porta", () => {
  it("sem sessão é 401", async () => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
    expect((await ficha(req())).status).toBe(401)
    expect((await salvar(req(undefined, "PATCH", corpo))).status).toBe(401)
  })

  it("sessão indisponível é 503, não 500", async () => {
    resolver.mockResolvedValue({ estado: "indisponivel" } as never)
    expect((await ficha(req())).status).toBe(503)
  })
})

describe("TROCA-005 — escrita da ficha do prestador", () => {
  it.each([
    { ...headers, origin: "https://fora.example.invalid" },
    { ...headers, "x-bivaque-app": "errado" },
    { "content-type": "application/json", origin: headers.origin },
  ])("recusa escrita sem a porta correta antes do banco", async (cabecalhos) => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await salvar(req(undefined, "PATCH", corpo, cabecalhos))
    expect(resposta.status).toBe(403)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("exige JSON na escrita", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await salvar(
      req(undefined, "PATCH", corpo, { ...headers, "content-type": "text/plain" }),
    )
    expect(resposta.status).toBe(400)
    expect(mock.gravacoes).toHaveLength(0)
  })
})

describe("TROCA-005 — leitura e gravação da ficha", () => {
  it("lê a ficha do dono da sessão com o catálogo de categorias", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await ficha(req())
    expect(resposta.status).toBe(200)
    const dados = await resposta.json()
    expect(dados.negocio).toMatchObject({ id: FICHA, nome: "Climatiza Manaus" })
    expect(dados.categorias.length).toBeGreaterThan(5)
    expect(mock.filtros).toContainEqual({
      tabela: "provider_profiles",
      coluna: "owner_user_id",
      valor: USER,
    })
  })

  it("quem ainda não tem ficha lê `null`, não erro", async () => {
    const mock = cliente({ semFicha: true })
    autenticar(mock)
    const resposta = await ficha(req())
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).negocio).toBeNull()
  })

  it("edita a ficha existente pelo id do BANCO, sem tocar no telefone que a aba não edita", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await salvar(req(undefined, "PATCH", corpo))
    expect(resposta.status).toBe(200)
    expect(mock.gravacoes).toContainEqual({
      tabela: "provider_profiles",
      metodo: "update",
      valores: {
        display_name: "Climatiza Manaus",
        category: "assistencia_tecnica",
        bio: "Apoio prático para quem está chegando.",
      },
    })
    expect(mock.filtros).toContainEqual({
      tabela: "provider_profiles",
      coluna: "id",
      valor: FICHA,
    })
  })

  it("cria a ficha do dono da SESSÃO quando ainda não existe", async () => {
    const mock = cliente({ semFicha: true })
    autenticar(mock)
    const resposta = await salvar(req(undefined, "PATCH", corpo))
    expect(resposta.status).toBe(200)
    expect(mock.gravacoes).toContainEqual({
      tabela: "provider_profiles",
      metodo: "insert",
      valores: {
        display_name: "Climatiza Manaus",
        category: "assistencia_tecnica",
        bio: "Apoio prático para quem está chegando.",
        owner_user_id: USER,
      },
    })
  })

  it.each([
    '{"nome":"A","categoria":"assistencia_tecnica"}',
    '{"nome":"Climatiza Manaus","categoria":"inventada"}',
    '{"nome":"Climatiza Manaus","categoria":"pets","descricao":9}',
    '{"nome":"Climatiza Manaus","categoria":"pets","telefone":"123"}',
    JSON.stringify({ nome: "Climatiza Manaus", categoria: "pets", descricao: "a".repeat(801) }),
  ])("recusa corpo inválido antes do banco (%s)", async (body) => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await salvar(req(undefined, "PATCH", body))
    expect(resposta.status).toBe(400)
    expect((await resposta.json()).mensagem).toEqual(expect.any(String))
    expect(mock.gravacoes).toHaveLength(0)
  })

  it("recusa do veto de conta (42501) vira 403 com a frase da tela antiga, sem eco", async () => {
    const mock = cliente({ erroDoUpdate: { code: "42501", message: "segredo do banco" } })
    autenticar(mock)
    const resposta = await salvar(req(undefined, "PATCH", corpo))
    expect(resposta.status).toBe(403)
    const texto = await resposta.text()
    expect(texto).toContain("não pode gerenciar a página do negócio")
    expect(texto).not.toContain("segredo")
  })

  it("update que não toca linha nenhuma é recusa (403), não sucesso mudo", async () => {
    const mock = cliente({ semLinhaGravada: true })
    autenticar(mock)
    const resposta = await salvar(req(undefined, "PATCH", corpo))
    expect(resposta.status).toBe(403)
    expect(await resposta.text()).toContain("não pode gerenciar a página do negócio")
  })

  it("falha do banco é 503 sem eco", async () => {
    const mock = cliente({ erroDeTabela: "provider_profiles" })
    autenticar(mock)
    const resposta = await ficha(req())
    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })
})
