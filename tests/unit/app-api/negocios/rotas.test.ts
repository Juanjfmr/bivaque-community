import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as criar, OPTIONS as opcoesCriar } from "web/app/api/app/negocios/[id]/pedidos/route"
import { GET as detalhe, OPTIONS as opcoesDetalhe } from "web/app/api/app/negocios/[id]/route"
import { GET as listar, OPTIONS as opcoesLista } from "web/app/api/app/negocios/route"
import { OPTIONS as opcoesPedido, GET as pedido } from "web/app/api/app/pedidos/[id]/route"
import { OPTIONS as opcoesPedidos, GET as pedidos } from "web/app/api/app/pedidos/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { requestInputFromBody } from "web/lib/service-requests/request-form"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app"
const ID = "10000000-0000-4000-8000-000000000001"
const USER = "10000000-0000-4000-8000-000000000010"
const CIDADE = "10000000-0000-4000-8000-000000000020"
const COMUNIDADE = "10000000-0000-4000-8000-000000000030"
const PEDIDO = "10000000-0000-4000-8000-000000000040"
const CHAVE = "10000000-0000-4000-8000-000000000050"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const contexto = { params: Promise.resolve({ id: ID }) }
const contextoPedido = { params: Promise.resolve({ id: PEDIDO }) }
const negocio = {
  id: ID,
  display_name: "Climatiza",
  category: "assistencia_tecnica",
  bio: "Instalação e manutenção",
  owner_user_id: "outro",
  provider_reach: [{ scope_type: "community", scope_id: COMUNIDADE, active: true }],
}
const linhaPedido = {
  id: PEDIDO,
  provider_id: ID,
  description: "Limpar o ar-condicionado",
  when_text: "Nesta semana",
  status: "open",
  category: "assistencia_tecnica",
  created_at: "2026-11-05T12:00:00Z",
  updated_at: "2026-11-05T12:00:00Z",
  conversation_id: "10000000-0000-4000-8000-000000000060",
  provider_profiles: { display_name: "Climatiza" },
}

type Opcoes = {
  semCidade?: boolean
  negocio?: typeof negocio | null
  negocios?: (typeof negocio)[]
  pedido?: typeof linhaPedido | null
  pedidos?: (typeof linhaPedido)[]
  erroTabela?: string
  erroRpc?: string
  rpcSemId?: boolean
  erroFoto?: boolean
  comFoto?: boolean
}

function cliente(opcoes: Opcoes = {}) {
  const filtros: { tabela: string; coluna: string; valor: unknown }[] = []
  const alcances: string[] = []
  const cursores: { tabela: string; coluna: string; valor: unknown }[] = []
  const selecoes: { tabela: string; campos: string }[] = []
  const rpc = vi.fn(async () => ({
    data: opcoes.erroRpc || opcoes.rpcSemId ? null : PEDIDO,
    error: opcoes.erroRpc ? { code: opcoes.erroRpc, message: "segredo do Postgres" } : null,
  }))
  const assinar = vi.fn(async () => ({
    data: opcoes.erroFoto ? null : { signedUrl: "https://midia.example.invalid/assinada" },
    error: opcoes.erroFoto ? { message: "segredo do storage" } : null,
  }))
  const from = vi.fn((tabela: string) => {
    const resposta = (unico = false) => {
      if (opcoes.erroTabela === tabela)
        return { data: null, error: { code: "XX000", message: "segredo do Postgres" } }
      if (tabela === "locality_memberships")
        return {
          data: opcoes.semCidade
            ? null
            : { locality_id: CIDADE, localities: { city_name: "Manaus" } },
          error: null,
        }
      if (tabela === "communities") return { data: [{ id: COMUNIDADE }], error: null }
      if (tabela === "provider_profiles")
        return {
          data: unico
            ? opcoes.negocio === undefined
              ? negocio
              : opcoes.negocio
            : (opcoes.negocios ?? [negocio]),
          error: null,
        }
      if (tabela === "provider_catalog_items")
        return { data: [{ id: "s1", title: "Limpeza", description: null }], error: null }
      if (tabela === "provider_portfolio_photos")
        return {
          data: opcoes.comFoto ? [{ photo_path: "privado/foto.jpg", caption: "Trabalho" }] : [],
          error: null,
        }
      if (tabela === "service_requests")
        return {
          data: unico
            ? opcoes.pedido === undefined
              ? linhaPedido
              : opcoes.pedido
            : (opcoes.pedidos ?? [linhaPedido]),
          error: null,
        }
      throw new Error(`Tabela inesperada: ${tabela}`)
    }
    const query: Record<string, unknown> = {}
    query["select"] = (campos: string) => {
      selecoes.push({ tabela, campos })
      return query
    }
    query["eq"] = (coluna: string, valor: unknown) => {
      filtros.push({ tabela, coluna, valor })
      return query
    }
    query["or"] = (filtro: string) => {
      alcances.push(filtro)
      return query
    }
    query["gt"] = (coluna: string, valor: unknown) => {
      cursores.push({ tabela, coluna, valor })
      return query
    }
    for (const metodo of ["order", "limit", "range"]) query[metodo] = () => query
    query["maybeSingle"] = async () => resposta(true)
    // biome-ignore lint/suspicious/noThenProperty: o builder PostgREST é awaitable
    Object.defineProperty(query, "then", {
      value: (resolve: (valor: unknown) => unknown) => Promise.resolve(resolve(resposta())),
    })
    return query
  })
  return {
    client: { from, rpc, storage: { from: () => ({ createSignedUrl: assinar }) } } as never,
    from,
    filtros,
    alcances,
    cursores,
    selecoes,
    rpc,
    assinar,
  }
}

function autenticar(mock: ReturnType<typeof cliente>) {
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "membro@example.invalid", appMetadata: {} },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}

function req(caminho: string, method = "GET", body?: string, cabecalhos = headers) {
  return new NextRequest(`${BASE}/${caminho}`, {
    method,
    headers: cabecalhos,
    ...(body === undefined ? {} : { body }),
  })
}

const corpo = JSON.stringify({
  descricao: "Limpar o ar-condicionado",
  quando: "Nesta semana",
  chave: CHAVE,
})
const rotas = [
  ["lista de negócios", () => listar(req("negocios"))],
  ["ficha", () => detalhe(req(`negocios/${ID}`), contexto)],
  ["criação", () => criar(req(`negocios/${ID}/pedidos`, "POST", corpo), contexto)],
  ["meus pedidos", () => pedidos(req("pedidos"))],
  ["pedido", () => pedido(req(`pedidos/${PEDIDO}`), contextoPedido)],
] as const

describe("F07 — rotas sob a sessão", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it.each(rotas)("%s exige sessão", async (_nome, chamar) => {
    expect((await chamar()).status).toBe(401)
  })

  it.each(rotas)("%s traduz indisponibilidade de sessão", async (_nome, chamar) => {
    resolver.mockResolvedValue({ estado: "indisponivel" } as never)
    expect((await chamar()).status).toBe(503)
  })

  it.each([opcoesLista, opcoesDetalhe, opcoesCriar, opcoesPedidos, opcoesPedido])(
    "preflight aceita só a origem permitida",
    (opcoes) => {
      expect(opcoes(req("negocios", "OPTIONS")).status).toBe(204)
      expect(
        opcoes(
          req("negocios", "OPTIONS", undefined, {
            ...headers,
            origin: "https://fora.example.invalid",
          }),
        ).status,
      ).toBe(403)
    },
  )

  it.each([
    { ...headers, origin: "https://fora.example.invalid" },
    { ...headers, "x-bivaque-app": "errado" },
    { "content-type": "application/json", origin: headers.origin },
  ])("recusa escrita sem a porta correta antes do banco", async (cabecalhos) => {
    const mock = cliente()
    autenticar(mock)
    expect(
      (await criar(req(`negocios/${ID}/pedidos`, "POST", corpo, cabecalhos), contexto)).status,
    ).toBe(403)
    expect(mock.from).not.toHaveBeenCalled()
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it("lista categorias e negócios só na cidade current, sem aceitar escopo da query", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await listar(req("negocios?locality_id=injetada&user_id=outro"))
    expect(resposta.status).toBe(200)
    const dados = await resposta.json()
    expect(dados.cidade).toBe("Manaus")
    expect(dados.negocios).toEqual([
      {
        id: ID,
        nome: "Climatiza",
        categoria: "assistencia_tecnica",
        categoriaNome: "Assistência técnica",
        descricao: "Instalação e manutenção",
      },
    ])
    expect(dados.categorias).toContainEqual({
      id: "assistencia_tecnica",
      nome: "Assistência técnica",
    })
    expect(mock.filtros).toContainEqual({
      tabela: "locality_memberships",
      coluna: "kind",
      valor: "current",
    })
    expect(mock.filtros).toContainEqual({
      tabela: "locality_memberships",
      coluna: "user_id",
      valor: USER,
    })
    expect(mock.filtros).toContainEqual({
      tabela: "communities",
      coluna: "locality_id",
      valor: CIDADE,
    })
    expect(mock.alcances[0]).toContain(CIDADE)
    expect(mock.alcances[0]).toContain(COMUNIDADE)
    expect(JSON.stringify(dados)).not.toMatch(/owner_user_id|contact_phone|provider_reach/)
  })

  it("lista vazia é resultado válido quando o banco respondeu", async () => {
    autenticar(cliente({ negocios: [] }))
    const resposta = await listar(req("negocios"))
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).negocios).toEqual([])
  })

  it("filtra categoria validada no banco", async () => {
    const mock = cliente()
    autenticar(mock)
    expect((await listar(req("negocios?categoria=pets"))).status).toBe(200)
    expect(mock.filtros).toContainEqual({
      tabela: "provider_profiles",
      coluna: "category",
      valor: "pets",
    })
  })

  it.each(["categoria=inventada", "depois=invalido"])(
    "recusa filtro inválido %s",
    async (query) => {
      const mock = cliente()
      autenticar(mock)
      expect((await listar(req(`negocios?${query}`))).status).toBe(400)
      expect(mock.from).not.toHaveBeenCalled()
    },
  )

  it.each(rotas.slice(0, 3))("%s recusa conta sem cidade", async (_nome, chamar) => {
    autenticar(cliente({ semCidade: true }))
    expect((await chamar()).status).toBe(403)
  })

  it("a ficha devolve os serviços e a foto assinada, sem caminho ou dono", async () => {
    const mock = cliente({ comFoto: true })
    autenticar(mock)
    const resposta = await detalhe(req(`negocios/${ID}`), contexto)
    expect(resposta.status).toBe(200)
    const dados = await resposta.json()
    expect(dados.negocio).toMatchObject({
      id: ID,
      nome: "Climatiza",
      cidade: "Manaus",
      podePedir: true,
      servicos: [{ id: "s1", titulo: "Limpeza", descricao: null }],
      foto: "https://midia.example.invalid/assinada",
    })
    expect(mock.assinar).toHaveBeenCalledWith("privado/foto.jpg", 300)
    expect(JSON.stringify(dados)).not.toMatch(/privado\/foto|owner_user_id|contact_phone/)
  })

  it.each([detalhe, criar])("negócio fora do alcance é 404", async (chamar) => {
    autenticar(cliente({ negocio: null }))
    expect((await chamar(req(`negocios/${ID}`, "POST", corpo), contexto)).status).toBe(404)
  })

  it("não oferece pedir serviço ao próprio negócio", async () => {
    autenticar(cliente({ negocio: { ...negocio, owner_user_id: USER } }))
    const resposta = await detalhe(req(`negocios/${ID}`), contexto)
    expect((await resposta.json()).negocio.podePedir).toBe(false)
    expect((await criar(req(`negocios/${ID}/pedidos`, "POST", corpo), contexto)).status).toBe(403)
  })

  it.each([
    "{",
    "[]",
    "null",
    "{}",
    '{"descricao":17}',
    '{"descricao":" "}',
    JSON.stringify({ descricao: "a".repeat(501) }),
    JSON.stringify({ descricao: "Bom", quando: 1 }),
    JSON.stringify({ descricao: "Bom", quando: "a".repeat(121) }),
    JSON.stringify({ descricao: "Bom", chave: "a".repeat(201) }),
  ])("recusa corpo inválido antes do banco", async (body) => {
    const mock = cliente()
    autenticar(mock)
    expect((await criar(req(`negocios/${ID}/pedidos`, "POST", body), contexto)).status).toBe(400)
    expect(mock.rpc).not.toHaveBeenCalled()
  })

  it("exige JSON na escrita", async () => {
    autenticar(cliente())
    expect(
      (
        await criar(
          req(`negocios/${ID}/pedidos`, "POST", corpo, {
            ...headers,
            "content-type": "text/plain",
          }),
          contexto,
        )
      ).status,
    ).toBe(400)
  })

  it("grava pelo RPC da sessão e retorna o pedido lido do banco", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await criar(
      req(
        `negocios/${ID}/pedidos`,
        "POST",
        JSON.stringify({
          descricao: " Limpar o ar-condicionado ",
          quando: " Nesta semana ",
          chave: CHAVE,
          user_id: "injetado",
          locality_id: "injetada",
          provider_user_id: "injetado",
        }),
      ),
      contexto,
    )
    expect(resposta.status).toBe(201)
    expect(mock.rpc).toHaveBeenCalledWith("create_service_request", {
      p_provider_id: ID,
      p_description: "Limpar o ar-condicionado",
      p_when_text: "Nesta semana",
      p_idempotency_key: CHAVE,
    })
    expect((await resposta.json()).pedido).toMatchObject({
      id: PEDIDO,
      descricao: "Limpar o ar-condicionado",
      situacao: "open",
    })
    expect(mock.filtros).toContainEqual({
      tabela: "service_requests",
      coluna: "requester_user_id",
      valor: USER,
    })
  })

  it.each([
    ["42501", 403],
    ["22023", 400],
    ["P0002", 404],
    ["54000", 429],
    ["XX000", 503],
  ])("traduz recusa %s sem eco do Postgres", async (codigo, status) => {
    autenticar(cliente({ erroRpc: codigo }))
    const resposta = await criar(req(`negocios/${ID}/pedidos`, "POST", corpo), contexto)
    expect(resposta.status).toBe(status)
    expect(await resposta.text()).not.toContain("segredo")
  })

  it.each([{ rpcSemId: true }, { pedido: null }])(
    "escrita sem confirmação não vira sucesso",
    async (opcoes) => {
      autenticar(cliente(opcoes))
      expect((await criar(req(`negocios/${ID}/pedidos`, "POST", corpo), contexto)).status).toBe(503)
    },
  )

  it("lista só pedidos do solicitante, inclusive quando a RLS também permitiria recebidos", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await pedidos(req("pedidos?user_id=outro"))
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).pedidos[0]).toMatchObject({
      id: PEDIDO,
      negocioNome: "Climatiza",
    })
    expect(mock.filtros).toContainEqual({
      tabela: "service_requests",
      coluna: "requester_user_id",
      valor: USER,
    })
  })

  it("detalhe do próprio pedido tem descrição e situação persistidas", async () => {
    const mock = cliente()
    autenticar(mock)
    const resposta = await pedido(req(`pedidos/${PEDIDO}`), contextoPedido)
    expect(resposta.status).toBe(200)
    expect((await resposta.json()).pedido).toMatchObject({
      id: PEDIDO,
      situacao: "open",
      quando: "Nesta semana",
    })
    expect(mock.filtros).toContainEqual({ tabela: "service_requests", coluna: "id", valor: PEDIDO })
    expect(mock.filtros).toContainEqual({
      tabela: "service_requests",
      coluna: "requester_user_id",
      valor: USER,
    })
  })

  it("pedido alheio ou inexistente é 404", async () => {
    autenticar(cliente({ pedido: null }))
    expect((await pedido(req(`pedidos/${PEDIDO}`), contextoPedido)).status).toBe(404)
  })

  it.each([
    ["negócios", () => listar(req("negocios")), "provider_profiles"],
    ["alcance", () => listar(req("negocios")), "communities"],
    ["cidade", () => listar(req("negocios")), "locality_memberships"],
    ["ficha", () => detalhe(req(`negocios/${ID}`), contexto), "provider_profiles"],
    ["catálogo", () => detalhe(req(`negocios/${ID}`), contexto), "provider_catalog_items"],
    ["foto", () => detalhe(req(`negocios/${ID}`), contexto), "provider_portfolio_photos"],
    ["meus pedidos", () => pedidos(req("pedidos")), "service_requests"],
    ["pedido", () => pedido(req(`pedidos/${PEDIDO}`), contextoPedido), "service_requests"],
    [
      "criação",
      () => criar(req(`negocios/${ID}/pedidos`, "POST", corpo), contexto),
      "provider_profiles",
    ],
  ] as const)(
    "%s falhando no banco é 503, nunca vazio ou erro cru",
    async (_nome, chamar, tabela) => {
      autenticar(cliente({ erroTabela: tabela }))
      const resposta = await chamar()
      expect(resposta.status).toBe(503)
      expect(await resposta.text()).not.toContain("segredo")
    },
  )

  it("falha ao assinar mídia não é uma ficha completa", async () => {
    autenticar(cliente({ comFoto: true, erroFoto: true }))
    expect((await detalhe(req(`negocios/${ID}`), contexto)).status).toBe(503)
  })

  it("a validação compartilhada normaliza só os campos do pedido", () => {
    expect(
      requestInputFromBody({ descricao: " Limpar ", quando: " ", chave: CHAVE, user_id: USER }),
    ).toEqual({ descricao: "Limpar", quando: null, chave: CHAVE })
  })
})

describe("F07 — cursores e identificadores", () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    [
      "ficha",
      () => detalhe(req("negocios/invalido"), { params: Promise.resolve({ id: "invalido" }) }),
    ],
    [
      "criação",
      () =>
        criar(req("negocios/invalido/pedidos", "POST", corpo), {
          params: Promise.resolve({ id: "invalido" }),
        }),
    ],
    [
      "pedido",
      () => pedido(req("pedidos/invalido"), { params: Promise.resolve({ id: "invalido" }) }),
    ],
  ] as const)("%s com id inválido é 404 sem consulta", async (_nome, chamar) => {
    const mock = cliente()
    autenticar(mock)
    expect((await chamar()).status).toBe(404)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("continua a lista de negócios sem truncar silenciosamente", async () => {
    const mock = cliente({ negocios: Array.from({ length: 20 }, () => negocio) })
    autenticar(mock)
    const resposta = await listar(req("negocios"))
    expect((await resposta.json()).proximo).toBe(ID)
    await listar(req(`negocios?depois=${ID}`))
    expect(mock.cursores).toContainEqual({ tabela: "provider_profiles", coluna: "id", valor: ID })
  })

  it("continua os pedidos com o cursor devolvido", async () => {
    const mock = cliente({ pedidos: Array.from({ length: 20 }, () => linhaPedido) })
    autenticar(mock)
    const resposta = await pedidos(req("pedidos"))
    expect((await resposta.json()).proximo).toBe(PEDIDO)
    await pedidos(req(`pedidos?depois=${PEDIDO}`))
    expect(mock.cursores).toContainEqual({
      tabela: "service_requests",
      coluna: "id",
      valor: PEDIDO,
    })
  })

  it("recusa cursor de pedidos inválido antes da consulta", async () => {
    const mock = cliente()
    autenticar(mock)
    expect((await pedidos(req("pedidos?depois=injetado"))).status).toBe(400)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("uma lista de pedidos vazia tem confirmação do banco", async () => {
    autenticar(cliente({ pedidos: [] }))
    const resposta = await pedidos(req("pedidos"))
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ pedidos: [], proximo: null })
  })
})
