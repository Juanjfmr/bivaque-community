import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import type { AnuncioBruto } from "web/app/api/app/mercado/_comum"
import { POST as interesse } from "web/app/api/app/mercado/[id]/interesse/route"
import { GET as detalhe } from "web/app/api/app/mercado/[id]/route"
import { GET as listar } from "web/app/api/app/mercado/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const BASE = "http://localhost:3000/api/app/mercado"
const ID = "10000000-0000-4000-8000-000000000001"
const OWNER = "10000000-0000-4000-8000-000000000002"
const USER = "10000000-0000-4000-8000-000000000010"
const DATE = "2026-12-01T12:00:00.000Z"
const CIDADE = "00000000-0000-4000-8000-0000000000aa"
const OUTRA_CIDADE = "00000000-0000-4000-8000-0000000000bb"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
// Escrita sem corpo não leva content-type: se levar, a rota exige JSON válido.
const headersSemCorpo = { origin: "http://localhost:3000", "x-bivaque-app": "bivaque-spa" }
const context = { params: Promise.resolve({ id: ID }) }

const ANUNCIO: AnuncioBruto = {
  id: ID,
  kind: "item",
  title: "Mesa",
  description: "Mesa de madeira",
  price_cents: 45000,
  neighborhood: "Centro",
  condition: "used",
  category: "casa_moveis",
  status: "active",
  created_at: DATE,
  owner_user_id: OWNER,
  address: null,
  localities: { city_name: "Manaus" },
  property_details: null,
  listing_photos: [{ id: "photo-1", path: "fotos/1.jpg", position: 0 }],
}

const IMOVEL: AnuncioBruto = {
  ...ANUNCIO,
  id: "10000000-0000-4000-8000-000000000003",
  kind: "property",
  category: null,
  condition: null,
  price_cents: null,
  property_details: {
    deal: "rent",
    property_type: "apartment",
    bedrooms: 2,
    area_m2: 62,
    condo_fee_cents: 35000,
    rent_cents: 180000,
    sale_price_cents: null,
  },
}

const IMOVEL_VENDA: AnuncioBruto = {
  ...ANUNCIO,
  id: "10000000-0000-4000-8000-000000000004",
  kind: "property",
  category: null,
  condition: null,
  price_cents: null,
  property_details: {
    deal: "sale",
    property_type: "house",
    bedrooms: 3,
    area_m2: 120,
    condo_fee_cents: null,
    rent_cents: null,
    sale_price_cents: 45000000,
  },
}

type Options = {
  cidade?: { id: string; nome: string } | null
  listings?: (typeof ANUNCIO)[]
  listing?: typeof ANUNCIO | null
  profileName?: string | null
  saved?: boolean
  errorTable?: string
  rpcError?: { code: string; message: string } | null
}

function mockClient(options: Options = {}) {
  const eqCalls: Array<{ table: string; column: string; value: unknown }> = []
  const orCalls: string[] = []
  const notCalls: string[] = []
  const gteCalls: Array<{ column: string; value: unknown }> = []
  const lteCalls: Array<{ column: string; value: unknown }> = []
  const orderCalls: Array<{ column: string; ascending: boolean }> = []
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = []

  const rpc = (name: string, args: Record<string, unknown>) => {
    rpcCalls.push({ name, args })
    return Promise.resolve(
      options.rpcError
        ? { data: null, error: options.rpcError }
        : { data: "conversation-1", error: null },
    )
  }

  const storage = {
    from: () => ({
      createSignedUrl: (path: string) =>
        Promise.resolve({ data: { signedUrl: `https://assinada/${path}` }, error: null }),
    }),
  }

  const from = vi.fn((table: string) => {
    const answer = (single = false) => {
      if (options.errorTable === table) {
        return { data: null, error: { message: "boom", code: "XX000" } }
      }
      if (table === "locality_memberships") {
        const cidade =
          options.cidade === undefined ? { id: CIDADE, nome: "Manaus" } : options.cidade
        return {
          data:
            cidade === null
              ? null
              : { locality_id: cidade.id, localities: { city_name: cidade.nome } },
          error: null,
        }
      }
      if (table === "listings") {
        if (single)
          return { data: options.listing === undefined ? ANUNCIO : options.listing, error: null }
        return { data: options.listings ?? [ANUNCIO], error: null }
      }
      if (table === "profiles") {
        return {
          data:
            options.profileName === null ? null : { display_name: options.profileName ?? "Maria" },
          error: null,
        }
      }
      if (table === "listing_saves") {
        return { data: options.saved ? { listing_id: ID } : null, error: null }
      }
      return { data: null, error: null }
    }
    const query: Record<string, unknown> = {}
    query["select"] = () => query
    query["eq"] = (column: string, value: unknown) => {
      eqCalls.push({ table, column, value })
      return query
    }
    query["or"] = (filtro: string) => {
      orCalls.push(filtro)
      return query
    }
    query["not"] = (column: string) => {
      notCalls.push(column)
      return query
    }
    query["gte"] = (column: string, value: unknown) => {
      gteCalls.push({ column, value })
      return query
    }
    query["lte"] = (column: string, value: unknown) => {
      lteCalls.push({ column, value })
      return query
    }
    query["order"] = (column: string, opts?: { ascending?: boolean }) => {
      orderCalls.push({ column, ascending: opts?.ascending ?? true })
      return query
    }
    query["limit"] = () => query
    query["maybeSingle"] = async () => answer(true)
    query["single"] = async () => answer(true)
    // biome-ignore lint/suspicious/noThenProperty: reproduz o builder fluente do PostgREST
    Object.defineProperty(query, "then", {
      value: (resolve: (value: unknown) => unknown) => Promise.resolve(resolve(answer())),
    })
    return query
  })

  return {
    client: { from, rpc, storage } as never,
    from,
    eqCalls,
    orCalls,
    notCalls,
    gteCalls,
    lteCalls,
    orderCalls,
    rpcCalls,
  }
}

function req(method: string, url = BASE, body?: string, requestHeaders = headers) {
  return new NextRequest(url, {
    method,
    headers: requestHeaders,
    ...(body === undefined ? {} : { body }),
  })
}

function authenticate(mock: ReturnType<typeof mockClient>) {
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id: USER, email: "pessoa@example.invalid", appMetadata: {} },
    cliente: mock.client,
    cabecalhos: {},
  } as never)
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

describe("rotas de mercado do app", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it.each([
    ["GET lista", () => listar(req("GET", `${BASE}?tipo=item`))],
    ["GET detalhe", () => detalhe(req("GET"), context)],
    [
      "POST interesse",
      () => interesse(req("POST", `${BASE}/${ID}/interesse`, undefined, headersSemCorpo), context),
    ],
  ])("%s recusa ausência de sessão", async (_label, invoke) => {
    expect((await invoke()).status).toBe(401)
  })

  describe("porta do app (CSRF)", () => {
    it("interesse recusa origem fora da lista", async () => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await interesse(
        req("POST", `${BASE}/${ID}/interesse`, undefined, {
          ...headers,
          origin: "https://fora.example",
        }),
        context,
      )
      expect(resposta.status).toBe(403)
      expect(mock.rpcCalls).toHaveLength(0)
    })

    it("interesse por cookie sem o cabeçalho do app é recusado", async () => {
      const mock = mockClient()
      authenticate(mock)
      const semCabecalho = { origin: "http://localhost:3000", "content-type": "application/json" }
      const resposta = await interesse(
        req("POST", `${BASE}/${ID}/interesse`, undefined, semCabecalho),
        context,
      )
      expect(resposta.status).toBe(403)
      expect(mock.rpcCalls).toHaveLength(0)
    })
  })

  describe("lista", () => {
    it.each([
      ["sem tipo", "?"],
      ["tipo inválido", "?tipo=servico"],
      ["ordem inválida", "?tipo=item&ordem=mais-caros"],
      ["quartos com item", "?tipo=item&quartos=2"],
      ["valor_max com item", "?tipo=item&valor_max=1000"],
      ["tipo_imovel com item", "?tipo=item&tipo_imovel=casa"],
      ["quartos fora da faixa", "?tipo=property&quartos=11"],
      ["valor_max não positivo", "?tipo=property&valor_max=0"],
      ["tipo_imovel inválido", "?tipo=property&tipo_imovel=loja"],
      ["limite acima do teto", "?tipo=item&limite=51"],
      ["limite zero", "?tipo=item&limite=0"],
      ["cursor malformado", `?tipo=item&depois=${encodeURIComponent("invalido")}`],
    ])("query inválida (%s) é 400 sem consultar o banco", async (_label, query) => {
      const mock = mockClient()
      authenticate(mock)
      expect((await listar(req("GET", `${BASE}${query}`))).status).toBe(400)
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("mapeia os resultados e só pagina quando a página veio cheia", async () => {
      const cheia = mockClient({ listings: [ANUNCIO] })
      authenticate(cheia)
      const corpo = await json(await listar(req("GET", `${BASE}?tipo=item&limite=1`)))
      expect(corpo["cidade"]).toBe("Manaus")
      expect(corpo["proximo"]).toBe(`${DATE}|${ID}`)
      expect(corpo["anuncios"]).toEqual([
        {
          id: ID,
          tipo: "item",
          titulo: "Mesa",
          descricao: "Mesa de madeira",
          precoCents: 45000,
          deal: null,
          bairro: "Centro",
          cidade: "Manaus",
          status: "active",
          condicao: "used",
          categoria: "casa_moveis",
          quartos: null,
          tipoImovel: null,
          areaM2: null,
          condoFeeCents: null,
          foto: "https://assinada/fotos/1.jpg",
          criadoEm: DATE,
        },
      ])

      const curta = mockClient({ listings: [ANUNCIO] })
      authenticate(curta)
      const outra = await json(await listar(req("GET", `${BASE}?tipo=item&limite=2`)))
      expect(outra["proximo"]).toBeNull()
    })

    it("anúncio sem foto devolve foto null, nunca o caminho do bucket", async () => {
      const mock = mockClient({ listings: [{ ...ANUNCIO, listing_photos: null }] })
      authenticate(mock)
      const corpo = await json(await listar(req("GET", `${BASE}?tipo=item`)))
      const anuncio = (corpo["anuncios"] as Record<string, unknown>[])[0]
      expect(anuncio?.["foto"]).toBeNull()
      expect(JSON.stringify(corpo)).not.toContain("listing_photos")
    })

    it("mapeia o satélite do imóvel e o preço vem do aluguel", async () => {
      const mock = mockClient({ listings: [IMOVEL] })
      authenticate(mock)
      const corpo = await json(await listar(req("GET", `${BASE}?tipo=property`)))
      expect(corpo["anuncios"]).toEqual([
        expect.objectContaining({
          tipo: "property",
          precoCents: 180000,
          deal: "rent",
          quartos: 2,
          tipoImovel: "apartment",
          areaM2: 62,
          condoFeeCents: 35000,
        }),
      ])
    })

    it("imóvel de venda usa o preço de venda", async () => {
      const mock = mockClient({ listings: [IMOVEL_VENDA] })
      authenticate(mock)
      const corpo = await json(await listar(req("GET", `${BASE}?tipo=property`)))
      expect(corpo["anuncios"]).toEqual([
        expect.objectContaining({
          tipo: "property",
          precoCents: 45000000,
          deal: "sale",
        }),
      ])
    })

    it("price_cents presente vence o preço do satélite", async () => {
      const mock = mockClient({ listings: [{ ...IMOVEL, price_cents: 9999 }] })
      authenticate(mock)
      const corpo = await json(await listar(req("GET", `${BASE}?tipo=property`)))
      expect(corpo["anuncios"]).toEqual([
        expect.objectContaining({
          precoCents: 9999,
          deal: "rent",
        }),
      ])
    })

    it("usa o cursor composto no recente", async () => {
      const mock = mockClient({ listings: [] })
      authenticate(mock)
      await listar(req("GET", `${BASE}?tipo=item&depois=${encodeURIComponent(`${DATE}|${ID}`)}`))
      expect(mock.orCalls[0]).toBe(
        `created_at.lt."${DATE}",and(created_at.eq."${DATE}",id.lt.${ID})`,
      )
    })

    it("ordenar por preço exclui nulos e usa o cursor de centavos", async () => {
      const mock = mockClient({ listings: [] })
      authenticate(mock)
      await listar(
        req("GET", `${BASE}?tipo=item&ordem=price_asc&depois=${encodeURIComponent(`45000|${ID}`)}`),
      )
      expect(mock.notCalls).toContain("price_cents")
      expect(mock.orCalls[0]).toBe(`price_cents.gt.45000,and(price_cents.eq.45000,id.lt.${ID})`)
      expect(mock.orderCalls).toContainEqual({ column: "price_cents", ascending: true })
    })

    it("a cidade é a da sessão, pelo vínculo current", async () => {
      const mock = mockClient({ listings: [] })
      authenticate(mock)
      await listar(req("GET", `${BASE}?tipo=item&locality_id=${OUTRA_CIDADE}`))
      expect(mock.eqCalls).toContainEqual({
        table: "locality_memberships",
        column: "user_id",
        value: USER,
      })
      expect(mock.eqCalls).toContainEqual({
        table: "locality_memberships",
        column: "kind",
        value: "current",
      })
      expect(mock.eqCalls).toContainEqual({
        table: "listings",
        column: "locality_id",
        value: CIDADE,
      })
      expect(mock.eqCalls).not.toContainEqual({
        table: "listings",
        column: "locality_id",
        value: OUTRA_CIDADE,
      })
    })

    it("sem vínculo de cidade a lista é vazia, não erro", async () => {
      const mock = mockClient({ cidade: null })
      authenticate(mock)
      const resposta = await listar(req("GET", `${BASE}?tipo=item`))
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ anuncios: [], proximo: null, cidade: null })
    })

    it("falha de leitura vira 503, nunca lista vazia", async () => {
      const mock = mockClient({ errorTable: "listings" })
      authenticate(mock)
      const resposta = await listar(req("GET", `${BASE}?tipo=item`))
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "leitura-indisponivel" })
    })
  })

  describe("detalhe", () => {
    it("devolve dono, autoria, salvo e as fotos assinadas", async () => {
      const mock = mockClient({ saved: true, profileName: "Dona da Vila" })
      authenticate(mock)
      const corpo = await json(await detalhe(req("GET"), context))
      expect(corpo["anuncio"]).toMatchObject({
        id: ID,
        tipo: "item",
        titulo: "Mesa",
        endereco: null,
        donoId: OWNER,
        donoNome: "Dona da Vila",
        meu: false,
        salvo: true,
        fotos: ["https://assinada/fotos/1.jpg"],
      })
    })

    it("sem address o endereço é null, a localização aproximada cobre", async () => {
      const mock = mockClient({ listing: { ...ANUNCIO, address: null } })
      authenticate(mock)
      const corpo = await json(await detalhe(req("GET"), context))
      const anuncio = corpo["anuncio"] as Record<string, unknown>
      expect(anuncio["endereco"]).toBeNull()
      expect(anuncio["bairro"]).toBe("Centro")
    })

    it("anúncio inexistente é 404", async () => {
      const mock = mockClient({ listing: null })
      authenticate(mock)
      expect((await detalhe(req("GET"), context)).status).toBe(404)
    })

    it("id fora do formato é 404, sem consultar o banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      const invalido = { params: Promise.resolve({ id: "nao-e-uuid" }) }
      expect((await detalhe(req("GET"), invalido)).status).toBe(404)
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("falha de leitura do anúncio é 503", async () => {
      const mock = mockClient({ errorTable: "listings" })
      authenticate(mock)
      expect((await detalhe(req("GET"), context)).status).toBe(503)
    })

    it("falha de leitura dos salvos é 503, nunca salvo falso", async () => {
      const mock = mockClient({ errorTable: "listing_saves" })
      authenticate(mock)
      const resposta = await detalhe(req("GET"), context)
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "leitura-indisponivel" })
    })
  })

  describe("interesse", () => {
    it("abre ou reaproveita a conversa com quem anunciou", async () => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await interesse(
        req("POST", `${BASE}/${ID}/interesse`, undefined, headersSemCorpo),
        context,
      )
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ conversaId: "conversation-1" })
      expect(mock.rpcCalls).toEqual([
        {
          name: "open_conversation",
          args: { p_other_user_id: OWNER, p_context_type: "listing", p_context_id: ID },
        },
      ])
    })

    it("corpo {} com content-type JSON também abre", async () => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await interesse(req("POST", `${BASE}/${ID}/interesse`, "{}"), context)
      expect(resposta.status).toBe(200)
      expect(await json(resposta)).toEqual({ conversaId: "conversation-1" })
    })

    it("o próprio dono não abre conversa consigo, sem chamar a RPC", async () => {
      const mock = mockClient({ listing: { ...ANUNCIO, owner_user_id: USER } })
      authenticate(mock)
      const resposta = await interesse(
        req("POST", `${BASE}/${ID}/interesse`, undefined, headersSemCorpo),
        context,
      )
      expect(resposta.status).toBe(400)
      expect(await json(resposta)).toEqual({
        erro: "dados-invalidos",
        mensagem: "Você não pode abrir conversa com o seu próprio anúncio.",
      })
      expect(mock.rpcCalls).toHaveLength(0)
    })

    it("recusa de RLS vira 403 recusado, sem ecoar a mensagem do Postgres", async () => {
      const mock = mockClient({ rpcError: { code: "42501", message: "new row violates rls" } })
      authenticate(mock)
      const resposta = await interesse(
        req("POST", `${BASE}/${ID}/interesse`, undefined, headersSemCorpo),
        context,
      )
      expect(resposta.status).toBe(403)
      const corpo = await json(resposta)
      expect(corpo).toEqual({
        erro: "recusado",
        mensagem: "Não é possível abrir conversa com esta pessoa.",
      })
      expect(JSON.stringify(corpo)).not.toContain("rls")
    })

    it("argumento inválido da RPC é 400, sem ecoar o Postgres", async () => {
      const mock = mockClient({ rpcError: { code: "22023", message: "invalid parameter" } })
      authenticate(mock)
      const resposta = await interesse(
        req("POST", `${BASE}/${ID}/interesse`, undefined, headersSemCorpo),
        context,
      )
      expect(resposta.status).toBe(400)
      expect(await json(resposta)).toEqual({
        erro: "dados-invalidos",
        mensagem: "Revise os dados do anúncio: algo não é aceito.",
      })
    })

    it("anúncio inexistente é 404", async () => {
      const mock = mockClient({ listing: null })
      authenticate(mock)
      expect(
        (
          await interesse(
            req("POST", `${BASE}/${ID}/interesse`, undefined, headersSemCorpo),
            context,
          )
        ).status,
      ).toBe(404)
    })

    it("id fora do formato é 404, sem consultar o banco", async () => {
      const mock = mockClient()
      authenticate(mock)
      const invalido = { params: Promise.resolve({ id: "nao-e-uuid" }) }
      expect(
        (
          await interesse(
            req("POST", `${BASE}/nao-e-uuid/interesse`, undefined, headersSemCorpo),
            invalido,
          )
        ).status,
      ).toBe(404)
      expect(mock.from).not.toHaveBeenCalled()
    })

    it("content-type que não é JSON é 400", async () => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await interesse(
        req("POST", `${BASE}/${ID}/interesse`, "corpo", {
          origin: "http://localhost:3000",
          "x-bivaque-app": "bivaque-spa",
          "content-type": "text/plain",
        }),
        context,
      )
      expect(resposta.status).toBe(400)
      expect(mock.rpcCalls).toHaveLength(0)
    })

    it("corpo JSON inválido é 400", async () => {
      const mock = mockClient()
      authenticate(mock)
      const resposta = await interesse(req("POST", `${BASE}/${ID}/interesse`, "não json"), context)
      expect(resposta.status).toBe(400)
      expect(mock.rpcCalls).toHaveLength(0)
    })

    it("falha de leitura do anúncio é 503", async () => {
      const mock = mockClient({ errorTable: "listings" })
      authenticate(mock)
      const resposta = await interesse(
        req("POST", `${BASE}/${ID}/interesse`, undefined, headersSemCorpo),
        context,
      )
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "escrita-indisponivel" })
    })

    it("falha genérica da RPC é 503", async () => {
      const mock = mockClient({ rpcError: { code: "XX000", message: "boom" } })
      authenticate(mock)
      const resposta = await interesse(
        req("POST", `${BASE}/${ID}/interesse`, undefined, headersSemCorpo),
        context,
      )
      expect(resposta.status).toBe(503)
      expect(await json(resposta)).toEqual({ erro: "escrita-indisponivel" })
    })
  })
})
