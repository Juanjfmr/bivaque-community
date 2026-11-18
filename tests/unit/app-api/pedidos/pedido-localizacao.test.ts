import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// RUN-179 — o CEP do pedido na rota: cache-first, limitador da MESMA pessoa (a
// janela é compartilhada com o anúncio), corpo com coordenada ignorado, payload
// sem as colunas cruas e distância por linha no GET.
vi.mock("server-only", () => ({}))
vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

// O cliente de serviço é o do módulo de geo (cache de CEP + catálogo de bairros).
const servico = vi.hoisted(() => {
  const estado: {
    cache: {
      latitude: number
      longitude: number
      neighborhood: string | null
      fetched_at: string
    } | null
    gravados: Record<string, unknown>[]
    bairros: string[]
  } = { cache: null, gravados: [], bairros: ["Flores"] }
  const cliente = {
    from: vi.fn((tabela: string) => {
      const query: Record<string, unknown> = {}
      query["select"] = () => query
      query["eq"] = () => query
      query["ilike"] = () => query
      query["limit"] = async () => ({
        data: estado.bairros.map((name) => ({ name })),
        error: null,
      })
      query["maybeSingle"] = async () => ({
        data:
          estado.cache === null
            ? null
            : {
                latitude: estado.cache.latitude,
                longitude: estado.cache.longitude,
                source: "brasilapi",
                neighborhood: estado.cache.neighborhood,
                fetched_at: estado.cache.fetched_at,
              },
        error: null,
      })
      query["upsert"] = async (valor: Record<string, unknown>) => {
        estado.gravados.push(valor)
        return { error: null }
      }
      void tabela
      return query
    }),
  }
  return { cliente, estado }
})
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => servico.cliente }))

const geocodificador = vi.hoisted(() => ({ geocodificarCep: vi.fn() }))
vi.mock("web/lib/geo/geocodificador", () => geocodificador)

import { POST as criar } from "web/app/api/app/negocios/[id]/pedidos/route"
import { GET as listar } from "web/app/api/app/pedidos/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { consumirConsulta, reiniciarJanelasParaTeste, TETO_POR_PESSOA } from "web/lib/geo/limite"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app"
const ID = "10000000-0000-4000-8000-000000000001"
const USER = "10000000-0000-4000-8000-000000000010"
const OUTRO = "10000000-0000-4000-8000-000000000098"
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
const negocio = {
  id: ID,
  display_name: "Climatiza",
  category: "assistencia_tecnica",
  bio: null,
  owner_user_id: OUTRO,
  provider_reach: [{ scope_type: "community", scope_id: COMUNIDADE, active: true }],
}
const linhaPedido = {
  id: PEDIDO,
  provider_id: ID,
  requester_user_id: USER,
  provider_user_id: OUTRO,
  description: "Limpar o ar-condicionado",
  when_text: null,
  status: "open",
  category: "assistencia_tecnica",
  region: "Flores",
  created_at: "2026-11-05T12:00:00Z",
  updated_at: "2026-11-05T12:00:00Z",
  conversation_id: null,
  provider_profiles: { display_name: "Climatiza" },
}

type Opcoes = {
  pedidos?: (typeof linhaPedido)[]
  distancia?: number | null
  erroDistancia?: string
  usuario?: string
}

function cliente(opcoes: Opcoes = {}) {
  const chamadas: { nome: string; argumentos: Record<string, unknown> }[] = []
  const from = vi.fn((tabela: string) => {
    const unica = () => {
      if (tabela === "locality_memberships")
        return { data: { locality_id: CIDADE, localities: { city_name: "Manaus" } }, error: null }
      if (tabela === "provider_profiles") return { data: negocio, error: null }
      if (tabela === "service_requests")
        return { data: (opcoes.pedidos ?? [linhaPedido])[0] ?? null, error: null }
      throw new Error(`Tabela inesperada: ${tabela}`)
    }
    const lista = () => {
      if (tabela === "communities") return { data: [{ id: COMUNIDADE }], error: null }
      if (tabela === "service_requests")
        return { data: opcoes.pedidos ?? [linhaPedido], error: null }
      throw new Error(`Tabela inesperada: ${tabela}`)
    }
    const query: Record<string, unknown> = { select: () => query }
    for (const metodo of ["eq", "or", "gt", "order", "limit", "range"]) query[metodo] = () => query
    query["maybeSingle"] = async () => unica()
    // biome-ignore lint/suspicious/noThenProperty: o builder PostgREST é awaitable
    Object.defineProperty(query, "then", {
      value: (resolve: (valor: unknown) => unknown) => Promise.resolve(resolve(lista())),
    })
    return query
  })
  const rpc = vi.fn(async (nome: string, argumentos: Record<string, unknown>) => {
    chamadas.push({ nome, argumentos })
    if (nome === "service_request_distance") {
      return opcoes.erroDistancia === undefined
        ? { data: opcoes.distancia ?? null, error: null }
        : { data: null, error: { code: opcoes.erroDistancia, message: "segredo do Postgres" } }
    }
    return { data: PEDIDO, error: null }
  })
  const client = { from, rpc }
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: opcoes.usuario ?? USER, email: "membro@example.invalid", appMetadata: {} },
    cliente: client,
    cabecalhos: {},
  } as never)
  return { chamadas, rpc, from }
}

function post(corpo: unknown) {
  return new NextRequest(`${BASE}/negocios/${ID}/pedidos`, {
    method: "POST",
    headers,
    body: JSON.stringify(corpo),
  })
}

/** Sessão própria por caso: a janela do limitador é por pessoa e vive no processo. */
let pessoa = 0
function novaPessoa(): string {
  pessoa += 1
  return `10000000-0000-4000-8000-0000000${String(2000 + pessoa).padStart(5, "0")}`
}

beforeEach(() => {
  vi.clearAllMocks()
  // A janela do limitador vive no processo: cada caso começa com ela zerada.
  reiniciarJanelasParaTeste()
  servico.estado.cache = null
  servico.estado.gravados = []
  servico.estado.bairros = ["Flores"]
  geocodificador.geocodificarCep.mockResolvedValue({
    estado: "encontrado",
    coordenada: { latitude: -3.10194, longitude: -60.025, fonte: "brasilapi" },
    endereco: { cidade: "Manaus", bairro: "Flores" },
  })
})

describe("POST do pedido com CEP", () => {
  it("CEP já conhecido no cache grava a localização sem chamar o provedor", async () => {
    servico.estado.cache = {
      latitude: -3.10194,
      longitude: -60.025,
      neighborhood: "Flores",
      fetched_at: new Date().toISOString(),
    }
    const mock = cliente()

    const resposta = await criar(
      post({ descricao: "Instalar duas luminárias", chave: CHAVE, cep: "69000-000" }),
      contexto,
    )

    expect(resposta.status).toBe(201)
    const criacao = mock.chamadas.find((item) => item.nome === "create_service_request")
    expect(criacao?.argumentos).toMatchObject({
      p_provider_id: ID,
      p_cep: "69000000",
      p_latitude: -3.10194,
      p_longitude: -60.025,
      p_region: "Flores",
    })
    // Cache hit não consome cota nem chama o provedor.
    expect(geocodificador.geocodificarCep).not.toHaveBeenCalled()
    expect(servico.estado.gravados).toHaveLength(0)
  })

  it("o pedido nunca devolve cep, latitude ou longitude; devolve bairro e distância", async () => {
    servico.estado.cache = {
      latitude: -3.10194,
      longitude: -60.025,
      neighborhood: "Flores",
      fetched_at: new Date().toISOString(),
    }
    cliente({ distancia: 3100 })

    const resposta = await criar(post({ descricao: "Instalar", cep: "69000000" }), contexto)
    const dados = (await resposta.json()) as { pedido: Record<string, unknown> }

    expect(dados.pedido).toMatchObject({ bairro: "Flores", distanciaMetros: 3100 })
    expect(Object.keys(dados.pedido).sort()).toEqual(
      [
        "atualizadoEm",
        "bairro",
        "categoriaNome",
        "conversaId",
        "criadoEm",
        "descricao",
        "distanciaMetros",
        "id",
        "lado",
        "negocioId",
        "negocioNome",
        "quando",
        "situacao",
      ].sort(),
    )
  })

  it("sem CEP o pedido é idêntico ao de hoje: só os quatro campos históricos", async () => {
    const mock = cliente({ pedidos: [{ ...linhaPedido, region: null }] })

    const resposta = await criar(
      post({ descricao: "Sem CEP", quando: "A combinar", chave: CHAVE }),
      contexto,
    )

    expect(resposta.status).toBe(201)
    const criacao = mock.chamadas.find((item) => item.nome === "create_service_request")
    expect(criacao?.argumentos).toEqual({
      p_provider_id: ID,
      p_description: "Sem CEP",
      p_when_text: "A combinar",
      p_idempotency_key: CHAVE,
    })
    expect(geocodificador.geocodificarCep).not.toHaveBeenCalled()
    const dados = (await resposta.json()) as { pedido: Record<string, unknown> }
    expect(dados.pedido).toMatchObject({ bairro: null, distanciaMetros: null })
  })

  it("corpo com latitude/longitude diretas é IGNORADO: a coordenada é do servidor", async () => {
    servico.estado.cache = {
      latitude: -3.10194,
      longitude: -60.025,
      neighborhood: "Flores",
      fetched_at: new Date().toISOString(),
    }
    const mock = cliente()

    const resposta = await criar(
      post({
        descricao: "Instalar",
        cep: "69000000",
        latitude: -23.55,
        longitude: -46.63,
        p_latitude: -23.55,
      }),
      contexto,
    )

    expect(resposta.status).toBe(201)
    const criacao = mock.chamadas.find((item) => item.nome === "create_service_request")
    expect(criacao?.argumentos["p_latitude"]).toBe(-3.10194)
    expect(criacao?.argumentos["p_longitude"]).toBe(-60.025)
  })

  it("corpo com coordenada e SEM cep não grava posição nenhuma", async () => {
    const mock = cliente()

    const resposta = await criar(
      post({ descricao: "Instalar", latitude: -23.55, longitude: -46.63 }),
      contexto,
    )

    expect(resposta.status).toBe(201)
    const criacao = mock.chamadas.find((item) => item.nome === "create_service_request")
    expect(criacao?.argumentos).not.toHaveProperty("p_latitude")
    expect(criacao?.argumentos).not.toHaveProperty("p_cep")
  })

  it.each(["123", "6900-000", "invalido"])("CEP torto é 400 antes do banco (%s)", async (cep) => {
    const mock = cliente()

    const resposta = await criar(post({ descricao: "Instalar", cep }), contexto)

    expect(resposta.status).toBe(400)
    expect(mock.from).not.toHaveBeenCalled()
    expect(geocodificador.geocodificarCep).not.toHaveBeenCalled()
  })

  it("cache miss geocodifica sob o limitador e grava o bairro no cache", async () => {
    cliente()

    const resposta = await criar(post({ descricao: "Instalar", cep: "69000-000" }), contexto)

    expect(resposta.status).toBe(201)
    expect(geocodificador.geocodificarCep).toHaveBeenCalledWith("69000000")
    expect(servico.estado.gravados[0]).toMatchObject({
      cep: "69000000",
      neighborhood: "Flores",
      source: "brasilapi",
    })
  })

  it("linha de cache vencida consulta o provedor e regrava (SEC-016)", async () => {
    servico.estado.cache = {
      latitude: -3.10194,
      longitude: -60.025,
      neighborhood: "Flores",
      // Mais de 180 dias: conta como ausente e o provedor é consultado.
      fetched_at: new Date(Date.now() - 181 * 24 * 60 * 60 * 1000).toISOString(),
    }
    geocodificador.geocodificarCep.mockResolvedValue({
      estado: "encontrado",
      coordenada: { latitude: -3.12, longitude: -60.03, fonte: "google" },
      endereco: { cidade: "Manaus", bairro: "Flores" },
    })
    const mock = cliente()

    const resposta = await criar(post({ descricao: "Instalar", cep: "69000-000" }), contexto)

    expect(resposta.status).toBe(201)
    expect(geocodificador.geocodificarCep).toHaveBeenCalledWith("69000000")
    expect(servico.estado.gravados[0]).toMatchObject({ latitude: -3.12, longitude: -60.03 })
    const criacao = mock.chamadas.find((item) => item.nome === "create_service_request")
    expect(criacao?.argumentos).toMatchObject({ p_latitude: -3.12, p_longitude: -60.03 })
  })

  it("linha vencida com provedor fora usa a coordenada antiga (SEC-016)", async () => {
    servico.estado.cache = {
      latitude: -3.10194,
      longitude: -60.025,
      neighborhood: "Flores",
      fetched_at: new Date(Date.now() - 181 * 24 * 60 * 60 * 1000).toISOString(),
    }
    geocodificador.geocodificarCep.mockResolvedValue({ estado: "indisponivel" })
    const mock = cliente()

    const resposta = await criar(post({ descricao: "Instalar", cep: "69000-000" }), contexto)

    expect(resposta.status).toBe(201)
    expect(geocodificador.geocodificarCep).toHaveBeenCalledWith("69000000")
    const criacao = mock.chamadas.find((item) => item.nome === "create_service_request")
    // CEP raramente muda de lugar: a linha vencida vale como rede.
    expect(criacao?.argumentos).toMatchObject({
      p_cep: "69000000",
      p_latitude: -3.10194,
      p_longitude: -60.025,
      p_region: "Flores",
    })
    // Sem resposta do provedor não há o que regravar.
    expect(servico.estado.gravados).toHaveLength(0)
  })

  it("cache válido não consome cota: com a janela gasta o pedido ainda passa", async () => {
    const usuario = novaPessoa()
    cliente({ usuario })
    servico.estado.cache = {
      latitude: -3.10194,
      longitude: -60.025,
      neighborhood: "Flores",
      fetched_at: new Date().toISOString(),
    }
    for (let indice = 0; indice < TETO_POR_PESSOA; indice++) consumirConsulta(usuario)

    const resposta = await criar(post({ descricao: "Instalar", cep: "69000-000" }), contexto)

    expect(resposta.status).toBe(201)
    expect(geocodificador.geocodificarCep).not.toHaveBeenCalled()
  })

  it("a janela é a MESMA do anúncio: gasta, o pedido responde 429", async () => {
    const usuario = novaPessoa()
    cliente({ usuario })
    // A janela é por pessoa e vive no processo: o que o anúncio consumiu é o que
    // o pedido encontra.
    for (let indice = 0; indice < TETO_POR_PESSOA; indice++) consumirConsulta(usuario)

    const resposta = await criar(post({ descricao: "Instalar", cep: "69000000" }), contexto)

    expect(resposta.status).toBe(429)
    expect(geocodificador.geocodificarCep).not.toHaveBeenCalled()
  })

  it("CEP conhecido sem coordenada grava cep e bairro, sem posição", async () => {
    geocodificador.geocodificarCep.mockResolvedValue({
      estado: "sem-coordenada",
      endereco: { cidade: "Manaus", bairro: "Flores" },
    })
    const mock = cliente()

    const resposta = await criar(post({ descricao: "Instalar", cep: "69000000" }), contexto)

    expect(resposta.status).toBe(201)
    const criacao = mock.chamadas.find((item) => item.nome === "create_service_request")
    expect(criacao?.argumentos).toMatchObject({ p_cep: "69000000", p_region: "Flores" })
    expect(criacao?.argumentos).not.toHaveProperty("p_latitude")
    // Sem posição não há o que guardar no cache de coordenadas.
    expect(servico.estado.gravados).toHaveLength(0)
  })

  it("CEP que nenhuma fonte conhece é 400, sem criar pedido", async () => {
    geocodificador.geocodificarCep.mockResolvedValue({ estado: "nao-encontrado" })
    const mock = cliente()

    const resposta = await criar(post({ descricao: "Instalar", cep: "69000000" }), contexto)

    expect(resposta.status).toBe(400)
    expect(mock.chamadas).toHaveLength(0)
  })

  it("provedor fora é 503 com a saída de enviar sem CEP", async () => {
    geocodificador.geocodificarCep.mockResolvedValue({ estado: "indisponivel" })
    const mock = cliente()

    const resposta = await criar(post({ descricao: "Instalar", cep: "69000000" }), contexto)
    const dados = (await resposta.json()) as Record<string, unknown>

    expect(resposta.status).toBe(503)
    expect(dados["mensagem"]).toMatch(/sem ele/)
    expect(mock.chamadas).toHaveLength(0)
  })
})

describe("GET dos pedidos com localização", () => {
  it("cada linha traz a distância do ponto de vista de quem lê", async () => {
    const mock = cliente({ distancia: 3100 })

    const resposta = await listar(
      new NextRequest(`${BASE}/pedidos`, { headers: { origin: headers.origin } }),
    )
    const dados = (await resposta.json()) as { pedidos: Record<string, unknown>[] }

    expect(resposta.status).toBe(200)
    expect(dados.pedidos[0]).toMatchObject({ bairro: "Flores", distanciaMetros: 3100 })
    expect(mock.chamadas).toContainEqual({
      nome: "service_request_distance",
      argumentos: { p_request_id: PEDIDO },
    })
    expect(JSON.stringify(dados)).not.toMatch(/cep|latitude|longitude/)
  })

  it("sem origem no perfil o campo é null, nunca zero", async () => {
    cliente({ distancia: null })

    const resposta = await listar(
      new NextRequest(`${BASE}/pedidos`, { headers: { origin: headers.origin } }),
    )
    const dados = (await resposta.json()) as { pedidos: Record<string, unknown>[] }

    expect(dados.pedidos[0]?.["distanciaMetros"]).toBeNull()
  })

  it("falha na RPC de distância é 503, não uma lista com dado inventado", async () => {
    cliente({ erroDistancia: "XX000" })

    const resposta = await listar(
      new NextRequest(`${BASE}/pedidos`, { headers: { origin: headers.origin } }),
    )

    expect(resposta.status).toBe(503)
    expect(await resposta.text()).not.toContain("segredo")
  })
})
