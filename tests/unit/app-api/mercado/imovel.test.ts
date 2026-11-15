import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// RUN-164 — imóvel (kind property) no POST e no PATCH do Mercado do app. O
// corpo fala o vocabulário do antigo formulário de Moradia da web; o servidor
// grava as mesmas colunas (`listings` + `property_details`) com as mesmas
// validações, e nada abre o cliente privilegiado.
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
// `create_property_listing` é security invoker: a rota nunca precisa do
// service_role, e este mock torna a dependência uma falha alta.
const { clienteDeServico } = vi.hoisted(() => ({
  clienteDeServico: vi.fn(() => {
    throw new Error("a rota do imóvel não deve abrir o cliente privilegiado")
  }),
}))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: clienteDeServico }))

import { PATCH as editar } from "web/app/api/app/mercado/[id]/_editar"
import { POST as anunciar } from "web/app/api/app/mercado/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app/mercado"
const ID = "b2000000-0000-4000-8000-000000000001"
const USER = "10000000-0000-4000-8000-000000000010"
const CIDADE = "00000000-0000-4000-8000-0000000000aa"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const context = { params: Promise.resolve({ id: ID }) }

/** O corpo que a folha do app manda: só o que o formulário mostra. */
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
}

/** A linha que a edição relê, no formato do SELECT da rota. */
const LINHA = {
  id: ID,
  kind: "property",
  owner_user_id: USER,
  address: "Rua A, 100",
  status: "active",
  title: "Apartamento 2 quartos no Centro",
  description: "Próximo ao comércio.",
  neighborhood: "Centro",
  property_details: {
    deal: "rent",
    property_type: "apartment",
    rent_cents: 180000,
    condo_fee_cents: 35000,
    iptu_cents: 90000,
    sale_price_cents: null,
    bedrooms: 2,
    suites: 1,
    parking_spots: 1,
    area_m2: 62,
    available_from: "2026-11-01",
  },
}

type Opcoes = {
  cidade?: { id: string; nome: string } | null
  linha?: typeof LINHA | null
  erroTabela?: string
  erroEscrita?: { code: string; message: string } | null
  erroDetalhe?: { code: string; message: string } | null
  erroRpc?: { code?: string; message: string } | null
  idCriado?: unknown
}

function cliente(opcoes: Opcoes = {}) {
  const escritas: { tabela: string; valor: Record<string, unknown> }[] = []
  const rpcCalls: { nome: string; argumentos: Record<string, unknown> }[] = []
  const from = vi.fn((tabela: string) => {
    let atualizando = false
    const resultado = () => {
      if (opcoes.erroTabela === tabela) {
        return { data: null, error: { code: "XX000", message: "segredo do Postgres" } }
      }
      if (atualizando) {
        const falha =
          tabela === "property_details"
            ? (opcoes.erroDetalhe ?? null)
            : (opcoes.erroEscrita ?? null)
        if (falha) return { data: null, error: falha }
        return {
          data: tabela === "property_details" ? { listing_id: ID } : { id: ID },
          error: null,
        }
      }
      if (tabela === "locality_memberships") {
        const cidade = opcoes.cidade === undefined ? { id: CIDADE, nome: "Manaus" } : opcoes.cidade
        return {
          data:
            cidade === null
              ? null
              : { locality_id: cidade.id, localities: { city_name: cidade.nome } },
          error: null,
        }
      }
      if (tabela === "listings") return { data: opcoes.linha ?? null, error: null }
      return { data: null, error: null }
    }
    const query: Record<string, unknown> = {}
    query["select"] = () => query
    query["update"] = (valor: Record<string, unknown>) => {
      atualizando = true
      escritas.push({ tabela, valor })
      return query
    }
    for (const metodo of ["eq", "order", "limit"]) query[metodo] = () => query
    query["maybeSingle"] = async () => resultado()
    query["single"] = async () => resultado()
    // biome-ignore lint/suspicious/noThenProperty: builder awaitable do Supabase
    Object.defineProperty(query, "then", {
      value: (resolve: (valor: unknown) => unknown) => Promise.resolve(resolve(resultado())),
    })
    return query
  })
  const rpc = vi.fn(async (nome: string, argumentos: Record<string, unknown>) => {
    rpcCalls.push({ nome, argumentos })
    if (opcoes.erroRpc) return { data: null, error: opcoes.erroRpc }
    return { data: "idCriado" in opcoes ? opcoes.idCriado : ID, error: null }
  })
  const client = { from, rpc, storage: { from: vi.fn(() => ({ remove: vi.fn() })) } }
  resolver.mockResolvedValue({
    estado: "autenticada",
    usuario: { id: USER },
    via: "cookie",
    cliente: client,
  } as never)
  return { escritas, from, rpc, rpcCalls }
}

function post(corpo: unknown, cabecalhos = headers) {
  return new NextRequest(BASE, {
    method: "POST",
    headers: cabecalhos,
    body: JSON.stringify(corpo),
  })
}

function patch(corpo: unknown, cabecalhos = headers) {
  return new NextRequest(`${BASE}/${ID}`, {
    method: "PATCH",
    headers: cabecalhos,
    body: JSON.stringify(corpo),
  })
}

async function json(resposta: Response) {
  return (await resposta.json()) as Record<string, unknown>
}

beforeEach(() => {
  vi.clearAllMocks()
  resolver.mockResolvedValue({
    estado: "recusada",
    sessao: { estado: "recusada", motivo: "sem-credencial" },
  } as never)
})

describe("POST de imóvel", () => {
  it("publica pela RPC transacional, com as colunas do imóvel e a cidade da sessão", async () => {
    const mock = cliente()
    const resposta = await anunciar(post({ kind: "property", ...IMOVEL }))
    expect(resposta.status).toBe(201)
    expect(await json(resposta)).toEqual({ anuncio: { id: ID } })
    expect(mock.escritas).toHaveLength(0)
    expect(clienteDeServico).not.toHaveBeenCalled()
    expect(mock.rpcCalls).toHaveLength(1)
    const [chamada] = mock.rpcCalls
    expect(chamada?.nome).toBe("create_property_listing")
    expect(chamada?.argumentos["p_listing"]).toMatchObject({
      status: "active",
      title: "Apartamento 2 quartos no Centro",
      description: "Próximo ao comércio.",
      neighborhood: "Centro",
      address: null,
      locality_id: CIDADE,
      community_id: null,
    })
    expect(chamada?.argumentos["p_listing"]).toMatchObject({
      published_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    })
    expect(chamada?.argumentos["p_details"]).toEqual({
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
    })
  })

  it("leva endereço e venda quando o corpo os traz", async () => {
    const mock = cliente()
    const resposta = await anunciar(
      post({
        kind: "property",
        ...IMOVEL,
        deal: "sale",
        rent: "",
        salePrice: "450000",
        address: "Rua das Flores, 123",
      }),
    )
    expect(resposta.status).toBe(201)
    const [chamada] = mock.rpcCalls
    expect(chamada?.argumentos["p_listing"]).toMatchObject({ address: "Rua das Flores, 123" })
    expect(chamada?.argumentos["p_details"]).toMatchObject({
      deal: "sale",
      rent_cents: null,
      sale_price_cents: 45000000,
    })
  })

  it("sem sessão é 401 antes de qualquer leitura", async () => {
    const mock = cliente()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
    expect((await anunciar(post({ kind: "property", ...IMOVEL }))).status).toBe(401)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it.each([
    ["origem fora da lista", { ...headers, origin: "https://fora.example" }],
    [
      "cookie sem o cabeçalho do app",
      { origin: "http://localhost:3000", "content-type": "application/json" },
    ],
  ])("recusa %s com 403, sem tocar o banco", async (_caso, cabecalhos) => {
    const mock = cliente()
    const resposta = await anunciar(post({ kind: "property", ...IMOVEL }, cabecalhos))
    expect(resposta.status).toBe(403)
    expect(mock.from).not.toHaveBeenCalled()
    expect(mock.rpcCalls).toHaveLength(0)
  })

  it("a validação da web devolve o campo em erro, sem chamar a RPC", async () => {
    const mock = cliente()
    const resposta = await anunciar(post({ kind: "property", ...IMOVEL, rent: "1800,50" }))
    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toMatchObject({
      erro: "dados-invalidos",
      campo: "rent",
    })
    expect(mock.rpcCalls).toHaveLength(0)
  })

  it("aluguel com preço de venda é recusado como o formulário da web recusa", async () => {
    const mock = cliente()
    const resposta = await anunciar(
      post({ kind: "property", ...IMOVEL, salePrice: "450000", rent: "1800" }),
    )
    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toMatchObject({ campo: "salePrice" })
    expect(mock.rpcCalls).toHaveLength(0)
  })

  it("tipo que não é item nem imóvel é 400 sem consultar o banco", async () => {
    const mock = cliente()
    expect((await anunciar(post({ kind: "servico" }))).status).toBe(400)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("foto em imóvel é 400: o fluxo da foto é outro", async () => {
    const mock = cliente()
    const resposta = await anunciar(
      post({ kind: "property", ...IMOVEL, foto: { tipo: "image/png", conteudo: "aGVsbG8=" } }),
    )
    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toEqual({ erro: "foto-invalida" })
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("sem cidade atual é 403 sem gravar", async () => {
    const mock = cliente({ cidade: null })
    const resposta = await anunciar(post({ kind: "property", ...IMOVEL }))
    expect(resposta.status).toBe(403)
    expect(await json(resposta)).toEqual({ erro: "sem-cidade" })
    expect(mock.rpcCalls).toHaveLength(0)
  })

  it.each([
    ["42501", 403, "recusado"],
    ["22023", 400, "dados-invalidos"],
    ["XX000", 503, "escrita-indisponivel"],
  ])("SQLSTATE %s da RPC vira %s sem ecoar o Postgres", async (codigo, status, erro) => {
    cliente({ erroRpc: { code: codigo, message: "segredo do Postgres" } })
    const resposta = await anunciar(post({ kind: "property", ...IMOVEL }))
    expect(resposta.status).toBe(status)
    const corpo = await json(resposta)
    expect(corpo["erro"]).toBe(erro)
    expect(JSON.stringify(corpo)).not.toContain("Postgres")
  })

  it("RPC sem identificador é falha de escrita, nunca sucesso vazio", async () => {
    cliente({ idCriado: null })
    expect((await anunciar(post({ kind: "property", ...IMOVEL }))).status).toBe(503)
  })
})

describe("PATCH de imóvel", () => {
  it("o dono grava as colunas de listings e de property_details", async () => {
    const mock = cliente({ linha: LINHA })
    const resposta = await editar(patch({ ...IMOVEL, title: "Cobertura no Centro" }), context)
    expect(resposta.status).toBe(200)
    expect(await json(resposta)).toEqual({ anuncio: { id: ID } })
    expect(mock.escritas[0]).toEqual({
      tabela: "listings",
      valor: {
        title: "Cobertura no Centro",
        description: "Próximo ao comércio.",
        neighborhood: "Centro",
        address: "Rua A, 100",
      },
    })
    expect(mock.escritas[1]).toEqual({
      tabela: "property_details",
      valor: {
        deal: "rent",
        property_type: "apartment",
        rent_cents: 180000,
        condo_fee_cents: 35000,
        iptu_cents: 90000,
        sale_price_cents: null,
        bedrooms: 2,
        suites: 1,
        parking_spots: 1,
        area_m2: 62,
        available_from: "2026-11-01",
      },
    })
  })

  it("campo que o app não mostra continua gravado", async () => {
    const mock = cliente({ linha: LINHA })
    const resposta = await editar(
      patch({
        title: "Apartamento 2 quartos no Centro",
        deal: "rent",
        propertyType: "apartment",
        rent: "1900",
        bedrooms: "3",
        areaM2: "70",
        description: "Reformado.",
        neighborhood: "Flores",
      }),
      context,
    )
    expect(resposta.status).toBe(200)
    expect(mock.escritas[1]?.valor).toMatchObject({
      rent_cents: 190000,
      bedrooms: 3,
      area_m2: 70,
      suites: 1,
      parking_spots: 1,
      condo_fee_cents: 35000,
      iptu_cents: 90000,
      available_from: "2026-11-01",
    })
  })

  it("trocar o negócio sem zerar o outro lado é 400 pela coerência da web", async () => {
    const mock = cliente({ linha: LINHA })
    const resposta = await editar(
      patch({ ...IMOVEL, deal: "sale", salePrice: "450000", rent: undefined }),
      context,
    )
    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toMatchObject({ erro: "dados-invalidos", campo: "rent" })
    expect(mock.escritas).toHaveLength(0)
  })

  it("corpo de desapego num imóvel é 400, sem gravar nada", async () => {
    const mock = cliente({ linha: LINHA })
    const resposta = await editar(
      patch({
        titulo: "Mesa de jantar",
        bairro: "Centro",
        preco: "450",
        descricao: "Mesa em bom estado, sem riscos.",
        categoria: "casa_moveis",
        condicao: "used",
      }),
      context,
    )
    expect(resposta.status).toBe(400)
    expect(await json(resposta)).toMatchObject({ erro: "dados-invalidos" })
    expect(mock.escritas).toHaveLength(0)
  })

  it("imóvel de outra pessoa (invisível sob RLS) é 404, sem gravar", async () => {
    const mock = cliente({ linha: null })
    const resposta = await editar(patch(IMOVEL), context)
    expect(resposta.status).toBe(404)
    expect(await json(resposta)).toEqual({ erro: "anuncio-nao-encontrado" })
    expect(mock.escritas).toHaveLength(0)
  })

  it("foto em imóvel é 400: o fluxo da foto é o do desapego", async () => {
    const mock = cliente({ linha: LINHA })
    const resposta = await editar(
      patch({ ...IMOVEL, foto: { tipo: "image/png", conteudo: "aGVsbG8=" } }),
      context,
    )
    expect(resposta.status).toBe(400)
    expect(mock.escritas).toHaveLength(0)
  })

  it("conta suspensa (42501 na escrita) é 403 sem ecoar o Postgres", async () => {
    cliente({ linha: LINHA, erroEscrita: { code: "42501", message: "rls" } })
    const resposta = await editar(patch(IMOVEL), context)
    expect(resposta.status).toBe(403)
    const corpo = await json(resposta)
    expect(corpo).toEqual({
      erro: "recusado",
      mensagem: "Sua conta não pode editar este anúncio.",
    })
    expect(JSON.stringify(corpo)).not.toContain("rls")
  })

  it("falha ao gravar o satélite não vira sucesso", async () => {
    cliente({ linha: LINHA, erroDetalhe: { code: "XX000", message: "boom" } })
    const resposta = await editar(patch(IMOVEL), context)
    expect(resposta.status).toBe(503)
    expect(await json(resposta)).toEqual({ erro: "escrita-indisponivel" })
  })

  it("sem sessão é 401 antes de ler o anúncio", async () => {
    const mock = cliente({ linha: LINHA })
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
    expect((await editar(patch(IMOVEL), context)).status).toBe(401)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("id fora do formato é 404 sem consultar o banco", async () => {
    const mock = cliente()
    const invalido = { params: Promise.resolve({ id: "nao-e-uuid" }) }
    expect((await editar(patch(IMOVEL), invalido)).status).toBe(404)
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("não abre o cliente privilegiado em nenhum caminho", async () => {
    cliente({ linha: LINHA })
    await editar(patch(IMOVEL), context)
    expect(clienteDeServico).not.toHaveBeenCalled()
  })
})
