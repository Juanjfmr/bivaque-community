import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// RUN-175 — a localização do anúncio na rota: CEP obrigatório no imóvel, avô sem
// CEP recusado na primeira edição, aproximado forçado no desapego, limitador por
// pessoa (429) e CEP sem coordenada como sucesso parcial.
vi.mock("server-only", () => ({}))
vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/storage/listing-photo", () => ({
  enviarFotoDoAnuncio: vi.fn(),
  FalhaDaFoto: class extends Error {
    constructor(
      readonly status: number,
      mensagem: string,
    ) {
      super(mensagem)
    }
  },
}))

const servico = vi.hoisted(() => {
  const tabelas: string[] = []
  const estado: { coordenada: { latitude: number; longitude: number } | null } = {
    coordenada: null,
  }
  const cliente = {
    from: vi.fn((tabela: string) => {
      tabelas.push(tabela)
      const query: Record<string, unknown> = {
        select: () => query,
        eq: () => query,
        ilike: () => query,
        limit: async () => ({ data: [{ name: "Flores" }], error: null }),
        maybeSingle: async () => ({
          data: estado.coordenada === null ? null : { ...estado.coordenada, source: "brasilapi" },
          error: null,
        }),
        upsert: async () => ({ error: null }),
      }
      return query
    }),
  }
  return { cliente, tabelas, estado }
})
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => servico.cliente }))

const geocodificador = vi.hoisted(() => ({ geocodificarCep: vi.fn() }))
vi.mock("web/lib/geo/geocodificador", () => geocodificador)

import { PATCH as editar } from "web/app/api/app/mercado/[id]/_editar"
import { POST as anunciar } from "web/app/api/app/mercado/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { JANELA_MS, TETO_POR_PESSOA } from "web/lib/geo/limite"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app/mercado"
const ID = "b2000000-0000-4000-8000-000000000001"
const CIDADE = "00000000-0000-4000-8000-0000000000aa"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const context = { params: Promise.resolve({ id: ID }) }

const IMOVEL = {
  title: "Apartamento 2 quartos no Centro",
  deal: "rent",
  propertyType: "apartment",
  rent: "1800",
  salePrice: "",
  bedrooms: "2",
  areaM2: "62",
  description: "Próximo ao comércio.",
  neighborhood: "Centro",
  address: "Rua A, 100",
  cep: "69000-000",
  localizacaoPublica: "exata",
}

const LINHA = {
  id: ID,
  kind: "property",
  owner_user_id: "10000000-0000-4000-8000-000000000010",
  locality_id: CIDADE,
  address: "Rua A, 100",
  status: "active",
  title: "Apartamento 2 quartos no Centro",
  description: "Próximo ao comércio.",
  neighborhood: "Centro",
  property_details: {
    deal: "rent",
    property_type: "apartment",
    rent_cents: 180000,
    condo_fee_cents: null,
    iptu_cents: null,
    sale_price_cents: null,
    bedrooms: 2,
    suites: null,
    parking_spots: null,
    area_m2: 62,
    available_from: null,
  },
}

type Opcoes = {
  usuario?: string
  linha?: typeof LINHA | null
  cepGravado?: string | null
  escolhaGravada?: string | null
}

function cliente(opcoes: Opcoes = {}) {
  const escritas: { tabela: string; valor: Record<string, unknown> }[] = []
  const rpcCalls: { nome: string; argumentos: Record<string, unknown> }[] = []
  const from = vi.fn((tabela: string) => {
    let atualizando = false
    const resultado = () => {
      if (tabela === "locality_memberships") {
        return { data: { locality_id: CIDADE, localities: { city_name: "Manaus" } }, error: null }
      }
      if (tabela === "listings") {
        if (atualizando) return { data: { id: ID }, error: null }
        return { data: opcoes.linha ?? null, error: null }
      }
      return { data: null, error: null }
    }
    const query: Record<string, unknown> = {}
    query["select"] = () => query
    query["update"] = (valor: Record<string, unknown>) => {
      atualizando = true
      escritas.push({ tabela, valor })
      return query
    }
    query["insert"] = (valor: Record<string, unknown>) => {
      atualizando = true
      escritas.push({ tabela, valor })
      return query
    }
    for (const metodo of ["eq", "order", "limit", "lt"]) query[metodo] = () => query
    query["maybeSingle"] = async () => resultado()
    query["single"] = async () => resultado()
    // biome-ignore lint/suspicious/noThenProperty: builder awaitable do Supabase
    Object.defineProperty(query, "then", {
      value: (resolve: (valor: unknown) => unknown) => Promise.resolve(resolve(resultado())),
    })
    return { ...query, atualizando: () => atualizando }
  })
  const rpc = vi.fn(async (nome: string, argumentos: Record<string, unknown>) => {
    rpcCalls.push({ nome, argumentos })
    if (nome === "get_listing_location") {
      const cep = opcoes.cepGravado === undefined ? "69000000" : opcoes.cepGravado
      const publica = opcoes.escolhaGravada === undefined ? "exata" : opcoes.escolhaGravada
      return {
        data: cep === null ? [] : [{ listing_id: ID, cep, localizacao_publica: publica }],
        error: null,
      }
    }
    return { data: ID, error: null }
  })
  const client = { from, rpc, storage: { from: vi.fn(() => ({ remove: vi.fn() })) } }
  resolver.mockResolvedValue({
    estado: "autenticada",
    usuario: { id: opcoes.usuario ?? "10000000-0000-4000-8000-000000000010" },
    via: "cookie",
    cliente: client,
  } as never)
  return { escritas, from, rpcCalls }
}

function post(corpo: unknown) {
  return new NextRequest(BASE, {
    method: "POST",
    headers,
    body: JSON.stringify(corpo),
  })
}

function patch(corpo: unknown) {
  return new NextRequest(`${BASE}/${ID}`, { method: "PATCH", headers, body: JSON.stringify(corpo) })
}

async function json(resposta: Response) {
  return (await resposta.json()) as Record<string, unknown>
}

/** Sesão própria por caso: o limitador é por pessoa e vive no processo. */
let pessoa = 0
function novaPessoa(): string {
  pessoa += 1
  return `10000000-0000-4000-8000-00000000${String(1000 + pessoa).padStart(4, "0")}`
}

beforeEach(() => {
  vi.clearAllMocks()
  servico.tabelas.length = 0
  servico.estado.coordenada = null
  geocodificador.geocodificarCep.mockResolvedValue({
    estado: "encontrado",
    coordenada: { latitude: -3.10194, longitude: -60.025, fonte: "brasilapi" },
    endereco: { cidade: "Manaus", bairro: "Flores" },
  })
})

describe("POST de imóvel: o CEP é obrigatório", () => {
  it("sem cep é 400 no campo cep, sem chamar a RPC", async () => {
    const mock = cliente()
    const { cep: _semCep, ...semCep } = IMOVEL
    const resposta = await anunciar(post({ kind: "property", ...semCep }))

    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toMatchObject({ erro: "dados-invalidos", campo: "cep" })
    expect(mock.rpcCalls).toHaveLength(0)
  })

  it("cep fora do formato é 400 no campo cep", async () => {
    const mock = cliente()
    const resposta = await anunciar(post({ kind: "property", ...IMOVEL, cep: "6900" }))

    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toMatchObject({ campo: "cep" })
    expect(mock.rpcCalls).toHaveLength(0)
  })

  it("escolha desconhecida é 400 no campo da escolha", async () => {
    const mock = cliente()
    const resposta = await anunciar(
      post({ kind: "property", ...IMOVEL, localizacaoPublica: "exato" }),
    )

    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toMatchObject({ campo: "localizacaoPublica" })
    expect(mock.rpcCalls).toHaveLength(0)
  })

  it("local exato sem endereço é 400: o exato é o endereço publicado", async () => {
    const mock = cliente()
    const resposta = await anunciar(post({ kind: "property", ...IMOVEL, address: "" }))

    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toMatchObject({ campo: "address" })
    expect(mock.rpcCalls).toHaveLength(0)
  })

  it("sem escolha no corpo, o servidor grava aproximada e não publica endereço", async () => {
    const mock = cliente()
    const { localizacaoPublica: _omitida, ...corpo } = IMOVEL
    const resposta = await anunciar(post({ kind: "property", ...corpo }))

    expect(resposta.status).toBe(201)
    const chamada = mock.rpcCalls.find((item) => item.nome === "create_property_listing")
    const lista = chamada?.argumentos["p_listing"] as Record<string, unknown>
    expect(lista["localizacao_publica"]).toBe("aproximada")
    expect(lista["address"]).toBeNull()
    // O aproximado do servidor não é o ponto cru.
    expect(lista["latitude"]).not.toBe(-3.10194)
    expect(lista["longitude"]).not.toBe(-60.025)
  })

  it("CEP sem coordenada publica aproximada, sem posição — sem 422", async () => {
    geocodificador.geocodificarCep.mockResolvedValue({
      estado: "sem-coordenada",
      endereco: { cidade: "Manaus", bairro: "Flores" },
    })
    const mock = cliente()

    const resposta = await anunciar(post({ kind: "property", ...IMOVEL }))

    expect(resposta.status).toBe(201)
    const chamada = mock.rpcCalls.find((item) => item.nome === "create_property_listing")
    const lista = chamada?.argumentos["p_listing"] as Record<string, unknown>
    expect(lista).toMatchObject({
      cep: "69000000",
      latitude: null,
      longitude: null,
      localizacao_publica: "aproximada",
    })
  })

  it("CEP que nenhuma fonte conhece é 422, não 400", async () => {
    geocodificador.geocodificarCep.mockResolvedValue({ estado: "nao-encontrado" })
    const mock = cliente()

    const resposta = await anunciar(post({ kind: "property", ...IMOVEL }))

    expect(resposta.status).toBe(422)
    expect(await json(resposta)).toMatchObject({ erro: "cep-nao-encontrado" })
    expect(mock.rpcCalls).toHaveLength(0)
  })

  it('provedor fora é 503, nunca "CEP não encontrado"', async () => {
    geocodificador.geocodificarCep.mockResolvedValue({ estado: "indisponivel" })
    const mock = cliente()

    const resposta = await anunciar(post({ kind: "property", ...IMOVEL }))

    expect(resposta.status).toBe(503)
    expect(await json(resposta)).toMatchObject({ erro: "geocodificador-indisponivel" })
    expect(mock.rpcCalls).toHaveLength(0)
  })
})

describe("limitador da geocodificação", () => {
  it("a consulta real é limitada por pessoa e responde 429 com retry-after", async () => {
    const usuario = novaPessoa()
    const mock = cliente({ usuario })

    for (let indice = 0; indice < TETO_POR_PESSOA; indice++) {
      const cep = String(69000000 + indice)
      const resposta = await anunciar(post({ kind: "property", ...IMOVEL, cep }))
      expect(resposta.status).toBe(201)
    }

    const recusa = await anunciar(
      post({ kind: "property", ...IMOVEL, cep: String(69000000 + TETO_POR_PESSOA) }),
    )
    expect(recusa.status).toBe(429)
    expect(await json(recusa)).toMatchObject({ erro: "limite-de-consultas" })
    const espera = Number(recusa.headers.get("retry-after"))
    expect(espera).toBeGreaterThan(0)
    expect(espera).toBeLessThanOrEqual(JANELA_MS / 1000)
    // A 21ª não chegou ao provedor.
    expect(geocodificador.geocodificarCep).toHaveBeenCalledTimes(TETO_POR_PESSOA)
    expect(mock.rpcCalls.filter((item) => item.nome === "create_property_listing")).toHaveLength(
      TETO_POR_PESSOA,
    )
  })

  it("cache hit não consome cota: o teto cheio continua publicando", async () => {
    const usuario = novaPessoa()
    cliente({ usuario })
    for (let indice = 0; indice < TETO_POR_PESSOA; indice++) {
      await anunciar(post({ kind: "property", ...IMOVEL, cep: String(69000000 + indice) }))
    }

    // Agora o CEP já está no cache: nenhuma chamada real, nenhuma cota.
    servico.estado.coordenada = { latitude: -3.10194, longitude: -60.025 }
    const resposta = await anunciar(post({ kind: "property", ...IMOVEL, cep: "69000000" }))

    expect(resposta.status).toBe(201)
    expect(geocodificador.geocodificarCep).toHaveBeenCalledTimes(TETO_POR_PESSOA)
  })
})

describe("PATCH de imóvel: o avô sem CEP", () => {
  it("editar imóvel publicado antes do CEP sem informar CEP é 400 com a frase do avô", async () => {
    const mock = cliente({ linha: LINHA, cepGravado: null })
    const { cep: _semCep, localizacaoPublica: _escolha, ...corpo } = IMOVEL

    const resposta = await editar(patch(corpo), context)

    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toMatchObject({
      erro: "dados-invalidos",
      campo: "cep",
      mensagem: "Este imóvel foi publicado antes do CEP. Informe o CEP para salvar a edição.",
    })
    expect(mock.escritas).toHaveLength(0)
  })

  it("o avô que informa o CEP na primeira edição passa", async () => {
    const mock = cliente({ linha: LINHA, cepGravado: null, escolhaGravada: null })

    const resposta = await editar(
      patch({ ...IMOVEL, address: "", localizacaoPublica: "aproximada" }),
      context,
    )

    expect(resposta.status).toBe(200)
    expect(mock.escritas[0]?.valor).toMatchObject({
      cep: "69000000",
      localizacao_publica: "aproximada",
    })
  })

  it("o imóvel já geocodificado preserva o CEP quando o corpo não o manda", async () => {
    const mock = cliente({ linha: LINHA })
    const { cep: _semCep, ...corpo } = IMOVEL

    const resposta = await editar(patch(corpo), context)

    expect(resposta.status).toBe(200)
    expect(mock.escritas[0]?.valor).toMatchObject({ cep: "69000000" })
  })
})

describe("desapego: CEP opcional e aproximado forçado", () => {
  const DESAPEGO = {
    chave: ID,
    titulo: "Mesa de jantar",
    bairro: "",
    preco: "450",
    descricao: "Mesa em bom estado, sem riscos.",
    categoria: "casa_moveis",
    condicao: "used",
    foto: null,
  }

  it("sem bairro e sem CEP é válido: a cidade da sessão permanece", async () => {
    const mock = cliente()
    const resposta = await anunciar(post(DESAPEGO))

    expect(resposta.status).toBe(201)
    const escrita = mock.escritas.find((item) => item.tabela === "listings")
    expect(escrita?.valor).toMatchObject({ neighborhood: null })
    expect(escrita?.valor["cep"]).toBeUndefined()
  })

  it("com CEP, o desapego publica aproximada mesmo sem pedir escolha", async () => {
    const mock = cliente()
    const resposta = await anunciar(post({ ...DESAPEGO, cep: "69000-000" }))

    expect(resposta.status).toBe(201)
    const escrita = mock.escritas.find((item) => item.tabela === "listings")
    expect(escrita?.valor).toMatchObject({
      cep: "69000000",
      localizacao_publica: "aproximada",
      neighborhood: "Flores",
    })
    expect(escrita?.valor["latitude"]).not.toBe(-3.10194)
  })

  it("CEP sem coordenada no desapego não trava: publica sem posição", async () => {
    geocodificador.geocodificarCep.mockResolvedValue({
      estado: "sem-coordenada",
      endereco: { cidade: "Manaus", bairro: null },
    })
    const mock = cliente()

    const resposta = await anunciar(post({ ...DESAPEGO, cep: "69000000" }))

    expect(resposta.status).toBe(201)
    const escrita = mock.escritas.find((item) => item.tabela === "listings")
    expect(escrita?.valor).toMatchObject({ latitude: null, longitude: null })
  })
})
