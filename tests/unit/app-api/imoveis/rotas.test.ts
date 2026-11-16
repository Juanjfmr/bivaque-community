import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { DELETE as apagar, PATCH as editar } from "web/app/api/app/imoveis/alertas/[id]/route"
import { POST as criar, GET as listar } from "web/app/api/app/imoveis/alertas/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)

const USER = "20000000-0000-4000-8000-000000000001"
const OUTRA_PESSOA = "20000000-0000-4000-8000-000000000002"
const ALERTA = "c0000000-0000-4000-8000-000000000001"
const BASE = "http://localhost:3000/api/app/imoveis/alertas"
const DATA = "2026-11-10T12:00:00.000Z"
const headers = { origin: "http://localhost:3000", "x-bivaque-app": "bivaque-spa" }
const contexto = { params: Promise.resolve({ id: ALERTA }) }

/**
 * RUN-169 — a porta de gestão dos alertas de busca de imóvel. O que se prova
 * aqui: sessão obrigatória, CSRF na escrita, o payload que a action antiga
 * gravava, a posse decidida pelo banco (linha alheia = 404 sem confirmar
 * existência), duplicata permitida como antes e 503 sem eco do banco.
 */

type Resultado = { data: unknown; error: { message: string; code?: string } | null }

type Operacao = {
  acao: "select" | "insert" | "update" | "delete"
  valores?: unknown
  colunas?: string
  iguais: readonly [string, string][]
}

function mockClient(resultados: Partial<Record<Operacao["acao"], Resultado>> = {}) {
  const registro: Operacao[] = []
  const vazio: Resultado = { data: [], error: null }

  function consulta() {
    const operacao: Operacao = { acao: "select", iguais: [] }
    const concluir = () => {
      registro.push({ ...operacao, iguais: [...operacao.iguais] })
      return Promise.resolve(resultados[operacao.acao] ?? vazio)
    }
    const alvo = {
      select: (colunas?: string) => {
        if (operacao.acao === "select") operacao.colunas = colunas
        return alvo
      },
      insert: (valores: unknown) => {
        operacao.acao = "insert"
        operacao.valores = valores
        return alvo
      },
      update: (valores: unknown) => {
        operacao.acao = "update"
        operacao.valores = valores
        return alvo
      },
      delete: () => {
        operacao.acao = "delete"
        return alvo
      },
      eq: (coluna: string, valor: string) => {
        operacao.iguais.push([coluna, valor])
        return alvo
      },
      order: () => alvo,
      single: () => concluir(),
      // O duplo de teste É um thenable de propósito: a rota faz `await` no
      // builder do PostgREST, e o mock precisa responder igual.
      // biome-ignore lint/suspicious/noThenProperty: duplo de teste thenable, como o builder real
      then: (resolver: (valor: Resultado) => unknown, rejeitar?: (erro: unknown) => unknown) =>
        concluir().then(resolver, rejeitar),
    }
    return alvo
  }

  const from = vi.fn(() => consulta())
  return { client: { from } as never, registro }
}

function authenticate(client: unknown) {
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "pessoa@example.invalid", appMetadata: {} },
    cliente: client,
    cabecalhos: {},
  } as never)
}

function requisicao(metodo: "GET" | "POST" | "PATCH" | "DELETE", corpo?: unknown, id?: string) {
  const url = id === undefined ? BASE : `${BASE}/${id}`
  return new NextRequest(url, {
    method: metodo,
    headers: corpo === undefined ? headers : { ...headers, "content-type": "application/json" },
    ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
  })
}

async function json(resposta: Response) {
  return resposta.json() as Promise<Record<string, unknown>>
}

const LINHA = {
  id: ALERTA,
  name: "Apartamento no Centro",
  kind: "property",
  locality_id: null,
  neighborhood: "Centro",
  deal: "rent",
  max_value_cents: 250000,
  min_bedrooms: 2,
  is_active: true,
  created_at: DATA,
}

const CRITERIOS = {
  nome: "Apartamento no Centro",
  bairro: "Centro",
  tipoNegocio: "rent",
  valorMaxCents: 250000,
  quartos: 2,
  ativo: true,
}

describe("GET /api/app/imoveis/alertas", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it("sem sessão responde 401 e não consulta o banco", async () => {
    const mock = mockClient()
    const resposta = await listar(requisicao("GET"))
    expect(resposta.status).toBe(401)
    expect(mock.registro).toEqual([])
  })

  it("devolve os alertas da sessão no formato do app", async () => {
    const mock = mockClient({ select: { data: [LINHA], error: null } })
    authenticate(mock.client)

    const resposta = await listar(requisicao("GET"))
    expect(resposta.status).toBe(200)
    expect(await json(resposta)).toEqual({
      alertas: [
        {
          id: ALERTA,
          nome: "Apartamento no Centro",
          bairro: "Centro",
          tipoNegocio: "rent",
          valorMaxCents: 250000,
          quartos: 2,
          ativo: true,
          criadoEm: DATA,
          busca: { bairro: "Centro", tipo_negocio: "rent", valor_max: "2500", quartos: "2" },
        },
      ],
    })
    // A leitura é a da tabela dos alertas, pelo cliente da sessão (RLS): as
    // colunas do critério, sem filtro de dono — quem decide a posse é a policy.
    expect(mock.registro[0]?.acao).toBe("select")
    expect(mock.registro[0]?.colunas).toContain("max_value_cents")
    expect(mock.registro[0]?.iguais).toEqual([])
  })

  it("falha de leitura vira 503 sem eco do banco", async () => {
    const mock = mockClient({ select: { data: null, error: { message: "segredo do banco" } } })
    authenticate(mock.client)

    const resposta = await listar(requisicao("GET"))
    expect(resposta.status).toBe(503)
    const corpo = await json(resposta)
    expect(corpo).toEqual({ erro: "leitura-indisponivel" })
    expect(JSON.stringify(corpo)).not.toContain("segredo")
  })
})

describe("POST /api/app/imoveis/alertas", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it("sem sessão responde 401 e não escreve", async () => {
    const mock = mockClient()
    const resposta = await criar(requisicao("POST", CRITERIOS))
    expect(resposta.status).toBe(401)
    expect(mock.registro).toEqual([])
  })

  it("escrita por cookie sem o cabeçalho do app é 403 (CSRF)", async () => {
    const mock = mockClient()
    authenticate(mock.client)
    const resposta = await criar(
      new NextRequest(BASE, {
        method: "POST",
        headers: { origin: "http://localhost:3000", "content-type": "application/json" },
        body: JSON.stringify(CRITERIOS),
      }),
    )
    expect(resposta.status).toBe(403)
    expect(await json(resposta)).toEqual({ erro: "cabecalho-ausente" })
    expect(mock.registro).toEqual([])
  })

  it("grava exatamente o payload da action antiga, com o dono da sessão", async () => {
    const mock = mockClient({ insert: { data: LINHA, error: null } })
    authenticate(mock.client)

    const resposta = await criar(requisicao("POST", { ...CRITERIOS, owner_user_id: OUTRA_PESSOA }))
    expect(resposta.status).toBe(201)
    expect(mock.registro[0]?.valores).toEqual({
      owner_user_id: USER,
      name: "Apartamento no Centro",
      kind: "property",
      locality_id: null,
      neighborhood: "Centro",
      deal: "rent",
      max_value_cents: 250000,
      min_bedrooms: 2,
      is_active: true,
    })
    expect((await json(resposta))["alerta"]).toMatchObject({ id: ALERTA, ativo: true })
  })

  it("a mesma busca pode ser criada duas vezes, como na action antiga", async () => {
    const mock = mockClient({ insert: { data: LINHA, error: null } })
    authenticate(mock.client)

    expect((await criar(requisicao("POST", CRITERIOS))).status).toBe(201)
    expect((await criar(requisicao("POST", CRITERIOS))).status).toBe(201)
    // Duas gravações, nenhuma consulta de existência: a tabela não deduplica e
    // a rota não inventa uma regra de duplicata que a action não tinha.
    expect(mock.registro.map((operacao) => operacao.acao)).toEqual(["insert", "insert"])
  })

  it("critério inválido é 400 no campo, sem tocar o banco", async () => {
    const mock = mockClient()
    authenticate(mock.client)

    const resposta = await criar(requisicao("POST", { ...CRITERIOS, quartos: 21 }))
    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toEqual({ erro: "dados-invalidos", campo: "quartos" })
    expect(mock.registro).toEqual([])
  })

  it("corpo sem content-type JSON é 400", async () => {
    const mock = mockClient()
    authenticate(mock.client)
    const resposta = await criar(
      new NextRequest(BASE, { method: "POST", headers, body: "nome=teste" }),
    )
    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toEqual({ erro: "corpo-invalido" })
  })

  it("falha de escrita vira 503 sem eco do banco", async () => {
    const mock = mockClient({ insert: { data: null, error: { message: "permissão negada" } } })
    authenticate(mock.client)

    const resposta = await criar(requisicao("POST", CRITERIOS))
    expect(resposta.status).toBe(503)
    expect(await json(resposta)).toEqual({ erro: "escrita-indisponivel" })
  })
})

describe("PATCH /api/app/imoveis/alertas/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it("sem sessão responde 401", async () => {
    const mock = mockClient()
    expect((await editar(requisicao("PATCH", CRITERIOS, ALERTA), contexto)).status).toBe(401)
    expect(mock.registro).toEqual([])
  })

  it("id fora do formato é 404, sem consultar o banco", async () => {
    const mock = mockClient()
    authenticate(mock.client)
    const invalido = { params: Promise.resolve({ id: "nao-e-uuid" }) }
    const resposta = await editar(requisicao("PATCH", CRITERIOS, "nao-e-uuid"), invalido)
    expect(resposta.status).toBe(404)
    expect(await json(resposta)).toEqual({ erro: "alerta-nao-encontrado" })
    expect(mock.registro).toEqual([])
  })

  it("linha de outra pessoa é 404, sem confirmar que ela existe", async () => {
    const mock = mockClient({ update: { data: [], error: null } })
    authenticate(mock.client)

    const resposta = await editar(requisicao("PATCH", CRITERIOS, ALERTA), contexto)
    expect(resposta.status).toBe(404)
    expect(await json(resposta)).toEqual({ erro: "alerta-nao-encontrado" })
    // A posse é a da policy: o `where` é só o id, sem segunda regra de dono.
    expect(mock.registro[0]?.iguais).toEqual([["id", ALERTA]])
  })

  it("grava os critérios e a situação, e devolve a linha gravada", async () => {
    const pausado = { ...LINHA, is_active: false, name: "Centro, 2 quartos" }
    const mock = mockClient({ update: { data: [pausado], error: null } })
    authenticate(mock.client)

    const resposta = await editar(
      requisicao("PATCH", { ...CRITERIOS, nome: "Centro, 2 quartos", ativo: false }, ALERTA),
      contexto,
    )
    expect(resposta.status).toBe(200)
    expect(mock.registro[0]?.valores).toEqual({
      name: "Centro, 2 quartos",
      neighborhood: "Centro",
      deal: "rent",
      max_value_cents: 250000,
      min_bedrooms: 2,
      is_active: false,
    })
    expect((await json(resposta))["alerta"]).toMatchObject({ id: ALERTA, ativo: false })
  })

  it("sem o cabeçalho do app é 403 (CSRF)", async () => {
    const mock = mockClient()
    authenticate(mock.client)
    const resposta = await editar(
      new NextRequest(`${BASE}/${ALERTA}`, {
        method: "PATCH",
        headers: { origin: "http://localhost:3000", "content-type": "application/json" },
        body: JSON.stringify(CRITERIOS),
      }),
      contexto,
    )
    expect(resposta.status).toBe(403)
    expect(mock.registro).toEqual([])
  })

  it("falha de escrita vira 503 sem eco do banco", async () => {
    const mock = mockClient({ update: { data: null, error: { message: "segredo do banco" } } })
    authenticate(mock.client)

    const resposta = await editar(requisicao("PATCH", CRITERIOS, ALERTA), contexto)
    expect(resposta.status).toBe(503)
    expect(await json(resposta)).toEqual({ erro: "escrita-indisponivel" })
  })
})

describe("DELETE /api/app/imoveis/alertas/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it("sem sessão responde 401", async () => {
    const mock = mockClient()
    expect((await apagar(requisicao("DELETE", undefined, ALERTA), contexto)).status).toBe(401)
    expect(mock.registro).toEqual([])
  })

  it("linha de outra pessoa é 404, e nenhuma linha é confirmada", async () => {
    const mock = mockClient({ delete: { data: [], error: null } })
    authenticate(mock.client)

    const resposta = await apagar(requisicao("DELETE", undefined, ALERTA), contexto)
    expect(resposta.status).toBe(404)
    expect(await json(resposta)).toEqual({ erro: "alerta-nao-encontrado" })
  })

  it("apaga a própria linha", async () => {
    const mock = mockClient({ delete: { data: [{ id: ALERTA }], error: null } })
    authenticate(mock.client)

    const resposta = await apagar(requisicao("DELETE", undefined, ALERTA), contexto)
    expect(resposta.status).toBe(200)
    expect(await json(resposta)).toEqual({ removido: true })
  })

  it("falha de escrita vira 503 sem eco do banco", async () => {
    const mock = mockClient({ delete: { data: null, error: { message: "segredo do banco" } } })
    authenticate(mock.client)

    const resposta = await apagar(requisicao("DELETE", undefined, ALERTA), contexto)
    expect(resposta.status).toBe(503)
    expect(await json(resposta)).toEqual({ erro: "escrita-indisponivel" })
  })
})
