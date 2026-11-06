import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

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

import { GET as meus, OPTIONS } from "web/app/api/app/mercado/meus/route"
import { POST as anuncio } from "web/app/api/app/mercado/route"
import { POST as pergunta } from "web/app/api/app/perguntas/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { enviarFotoDoAnuncio, FalhaDaFoto } from "web/lib/storage/listing-photo"

const USER = "20000000-0000-4000-8000-000000000001"
const CIDADE = "00000000-0000-4000-8000-000000000001"
const ID = "b1000000-0000-4000-8000-000000000099"
const BASE = "http://localhost:3000/api/app"
const headers = {
  origin: "http://localhost:3000",
  "x-bivaque-app": "bivaque-spa",
  "content-type": "application/json",
}
const resolver = vi.mocked(resolverSessaoDaRequisicao)
const item = {
  chave: ID,
  titulo: "Mesa de jantar",
  bairro: "Flores",
  preco: "750,50",
  descricao: "Mesa de madeira em bom estado",
  categoria: "casa_moveis",
  condicao: "used",
  foto: null,
}
const linha = {
  id: ID,
  kind: "item",
  title: "Mesa gravada",
  description: "Descrição",
  price_cents: 75050,
  neighborhood: "Flores",
  condition: "used",
  category: "casa_moveis",
  status: "active",
  created_at: "2026-11-06T12:00:00Z",
  owner_user_id: USER,
  address: null,
  localities: { city_name: "Manaus" },
  property_details: null,
  listing_photos: [],
}

type Opcoes = {
  semCidade?: boolean
  erroTabela?: string
  erroEscrita?: string
  existente?: { id: string; status: string; locality_id: string; kind: string } | null
  linhas?: (typeof linha)[]
  erroRpc?: boolean
  erroPublicacao?: boolean
  semResultado?: boolean
}

function cliente(opcoes: Opcoes = {}) {
  const filtros: { tabela: string; campo: string; valor: unknown }[] = []
  const escritas: { tabela: string; valor: Record<string, unknown> }[] = []
  const from = vi.fn((tabela: string) => {
    let operacao = "select"
    const resultado = (single: boolean) => {
      if (opcoes.erroTabela === tabela) {
        return { data: null, error: { code: "XX000", message: "segredo do Postgres" } }
      }
      if (operacao !== "select") {
        if (opcoes.erroEscrita)
          return { data: null, error: { code: opcoes.erroEscrita, message: "segredo do Postgres" } }
        return { data: opcoes.semResultado ? null : { id: ID }, error: null }
      }
      if (tabela === "locality_memberships")
        return {
          data: opcoes.semCidade
            ? null
            : {
                locality_id: CIDADE,
                localities: { city_name: "Manaus" },
              },
          error: null,
        }
      return { data: single ? (opcoes.existente ?? null) : (opcoes.linhas ?? []), error: null }
    }
    const query: Record<string, unknown> = {}
    query["select"] = () => query
    for (const metodo of ["eq", "lt"])
      query[metodo] = (campo: string, valor: unknown) => {
        filtros.push({ tabela, campo, valor })
        return query
      }
    for (const metodo of ["order", "limit"]) query[metodo] = () => query
    query["delete"] = () => {
      operacao = "delete"
      return query
    }
    for (const metodo of ["insert", "update"])
      query[metodo] = (valor: Record<string, unknown>) => {
        operacao = metodo
        escritas.push({ tabela, valor })
        return query
      }
    query["single"] = async () => resultado(true)
    query["maybeSingle"] = async () => resultado(true)
    // biome-ignore lint/suspicious/noThenProperty: builder awaitable do Supabase
    query["then"] = (resolve: (valor: unknown) => unknown) =>
      Promise.resolve(resultado(false)).then(resolve)
    return query
  })
  const rpc = vi.fn(async (funcao: string) => ({
    data: [],
    error:
      (funcao === "replace_listing_photo" && opcoes.erroRpc) ||
      (funcao === "transition_listing" && opcoes.erroPublicacao)
        ? { message: "segredo do Postgres" }
        : null,
  }))
  const client = { from, rpc, storage: { from: vi.fn(() => ({ createSignedUrl: vi.fn() })) } }
  resolver.mockResolvedValue({
    estado: "autenticada",
    usuario: { id: USER },
    via: "cookie",
    cliente: client,
  } as never)
  return { filtros, escritas, from, rpc }
}

function post(caminho: string, corpo: unknown, cabecalhos = headers) {
  return new NextRequest(`${BASE}/${caminho}`, {
    method: "POST",
    headers: cabecalhos,
    body: JSON.stringify(corpo),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  cliente()
  vi.mocked(enviarFotoDoAnuncio).mockResolvedValue(`${ID}/foto.jpg`)
})

describe("F03 — fronteira de criação", () => {
  for (const [nome, rota, caminho, corpo] of [
    ["pergunta", pergunta, "perguntas", { titulo: "Alguém indica pediatra?" }],
    ["anúncio", anuncio, "mercado", item],
  ] as const) {
    it(`${nome}: sem sessão dá 401`, async () => {
      resolver.mockResolvedValue({ estado: "recusada", sessao: { motivo: "ausente" } } as never)
      expect((await rota(post(caminho, corpo))).status).toBe(401)
    })
    it.each([
      { ...headers, origin: "https://invasor.invalid" },
      { ...headers, "x-bivaque-app": "errado" },
    ])(`${nome}: recusa origem/cabeçalho`, async (cabecalhos) => {
      const mock = cliente()
      expect((await rota(post(caminho, corpo, cabecalhos))).status).toBe(403)
      expect(mock.from).not.toHaveBeenCalled()
    })
    it(`${nome}: sem cidade não grava`, async () => {
      const mock = cliente({ semCidade: true })
      expect((await rota(post(caminho, corpo))).status).toBe(403)
      expect(mock.escritas).toEqual([])
    })
    it(`${nome}: corpo e MIME inválidos dão 400`, async () => {
      expect((await rota(post(caminho, {}))).status).toBe(400)
      expect(
        (await rota(post(caminho, corpo, { ...headers, "content-type": "text/plain" }))).status,
      ).toBe(400)
      expect(
        (await rota(new NextRequest(`${BASE}/${caminho}`, { method: "POST", headers, body: "{" })))
          .status,
      ).toBe(400)
    })
    it(`${nome}: banco fora dá 503 sem eco técnico`, async () => {
      cliente({ erroTabela: "locality_memberships" })
      const result = await rota(post(caminho, corpo))
      expect(result.status).toBe(503)
      expect(await result.text()).not.toContain("Postgres")
    })
    it.each([
      ["42501", 403],
      ["22023", 400],
      ["XX000", 503],
    ] as const)(`${nome}: SQLSTATE %s vira %s`, async (codigo, status) => {
      cliente({ erroEscrita: codigo })
      const result = await rota(post(caminho, corpo))
      expect(result.status).toBe(status)
      expect(await result.text()).not.toContain("Postgres")
    })
  }

  it("pergunta: autoria e cidade vêm da sessão e retorna o id gravado", async () => {
    const mock = cliente()
    const result = await pergunta(
      post("perguntas", {
        titulo: " Alguém indica pediatra? ",
        assunto: "Saúde",
        author_id: "forjado",
        locality_id: "forjada",
      }),
    )
    expect(result.status).toBe(201)
    expect(await result.json()).toEqual({ pergunta: { id: ID } })
    expect(mock.escritas[0]?.valor).toMatchObject({
      author_id: USER,
      locality_id: CIDADE,
      title: "Alguém indica pediatra?",
      category: "saude_bem_estar",
    })
    expect(mock.filtros).toContainEqual({
      tabela: "locality_memberships",
      campo: "kind",
      valor: "current",
    })
  })

  it("anúncio: grava sob a sessão, registra foto e só depois publica", async () => {
    const mock = cliente()
    const result = await anuncio(
      post("mercado", {
        ...item,
        owner_user_id: "forjado",
        locality_id: "forjada",
        foto: { tipo: "image/jpeg", conteudo: "YWJj" },
      }),
    )
    expect(result.status).toBe(201)
    expect(await result.json()).toEqual({ anuncio: { id: ID } })
    expect(mock.escritas[0]?.valor).toMatchObject({
      owner_user_id: USER,
      locality_id: CIDADE,
      price_cents: 75050,
      status: "draft",
    })
    expect(enviarFotoDoAnuncio).toHaveBeenCalledWith(
      expect.anything(),
      USER,
      ID,
      0,
      expect.any(File),
    )
    expect(mock.rpc).toHaveBeenCalledWith("replace_listing_photo", {
      p_listing_id: ID,
      p_path: `${ID}/foto.jpg`,
      p_position: 0,
    })
    expect(mock.rpc).toHaveBeenCalledWith("transition_listing", {
      p_listing_id: ID,
      p_action: "publish",
    })
  })

  it("anúncio: repetir chave publicada devolve o resultado sem duplicar", async () => {
    const mock = cliente({
      existente: { id: ID, status: "active", locality_id: CIDADE, kind: "item" },
    })
    expect((await anuncio(post("mercado", item))).status).toBe(200)
    expect(mock.escritas).toEqual([])
  })
  it("anúncio: retoma rascunho sem outro insert", async () => {
    const mock = cliente({
      existente: { id: ID, status: "draft", locality_id: CIDADE, kind: "item" },
    })
    expect((await anuncio(post("mercado", item))).status).toBe(201)
    expect(mock.escritas).toHaveLength(1)
    expect(mock.escritas[0]?.valor).not.toHaveProperty("owner_user_id")
  })
  it("anúncio: chave de outra pessoa dá 404", async () => {
    cliente({ erroEscrita: "23505" })
    expect((await anuncio(post("mercado", item))).status).toBe(404)
  })
  it("anúncio: chave de imóvel ou de outra cidade não é retomada", async () => {
    for (const existente of [
      { id: ID, status: "draft", locality_id: CIDADE, kind: "property" },
      { id: ID, status: "draft", locality_id: "outra", kind: "item" },
    ]) {
      const mock = cliente({ existente })
      expect((await anuncio(post("mercado", item))).status).toBe(404)
      expect(mock.escritas).toEqual([])
    }
  })
  it("anúncio: foto inválida ou falha de upload não publica o rascunho", async () => {
    expect(
      (
        await anuncio(
          post("mercado", { ...item, foto: { tipo: "image/svg+xml", conteudo: "YWJj" } }),
        )
      ).status,
    ).toBe(400)
    for (const status of [400, 404, 503] as const) {
      const mock = cliente()
      vi.mocked(enviarFotoDoAnuncio).mockRejectedValue(new FalhaDaFoto(status, "Foto recusada."))
      expect(
        (
          await anuncio(
            post("mercado", { ...item, foto: { tipo: "image/jpeg", conteudo: "YWJj" } }),
          )
        ).status,
      ).toBe(status)
      expect(mock.rpc).not.toHaveBeenCalled()
    }
  })
  it("anúncio: falha no registro da foto e na publicação dão 503", async () => {
    cliente({ erroRpc: true })
    expect(
      (await anuncio(post("mercado", { ...item, foto: { tipo: "image/jpeg", conteudo: "YWJj" } })))
        .status,
    ).toBe(503)
    cliente({ erroPublicacao: true })
    expect((await anuncio(post("mercado", item))).status).toBe(503)
  })
  it("meus anúncios: filtra pelo titular e entrega todos os estados", async () => {
    const mock = cliente({ linhas: [linha] })
    const result = await meus(new NextRequest(`${BASE}/mercado/meus?user_id=forjado`))
    expect(result.status).toBe(200)
    expect((await result.json()).anuncios[0]).toMatchObject({
      id: ID,
      titulo: "Mesa gravada",
      status: "active",
    })
    expect(mock.filtros).toEqual([{ tabela: "listings", campo: "owner_user_id", valor: USER }])
  })
  it("meus anúncios: vazio honesto e cursor validado", async () => {
    expect((await (await meus(new NextRequest(`${BASE}/mercado/meus`))).json()).anuncios).toEqual(
      [],
    )
    expect((await meus(new NextRequest(`${BASE}/mercado/meus?depois=invalido`))).status).toBe(400)
    const mock = cliente()
    await meus(new NextRequest(`${BASE}/mercado/meus?depois=${ID}`))
    expect(mock.filtros).toContainEqual({ tabela: "listings", campo: "id", valor: ID })
  })
  it("meus anúncios: sessão ausente e banco fora são falhas, nunca lista vazia", async () => {
    cliente({ erroTabela: "listings" })
    const result = await meus(new NextRequest(`${BASE}/mercado/meus`))
    expect(result.status).toBe(503)
    expect(await result.text()).not.toContain("Postgres")
    resolver.mockResolvedValue({ estado: "recusada", sessao: { motivo: "ausente" } } as never)
    expect((await meus(new NextRequest(`${BASE}/mercado/meus`))).status).toBe(401)
  })
  it("preflight só permite origem aprovada", () => {
    expect(
      OPTIONS(
        new NextRequest(`${BASE}/mercado/meus`, {
          method: "OPTIONS",
          headers: { origin: headers.origin },
        }),
      ).status,
    ).toBe(204)
    expect(
      OPTIONS(
        new NextRequest(`${BASE}/mercado/meus`, {
          method: "OPTIONS",
          headers: { origin: "https://invasor.invalid" },
        }),
      ).status,
    ).toBe(403)
  })
})
