import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET as perfilDeMembro } from "web/app/api/app/membros/[id]/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const USER = "20000000-0000-4000-8000-000000000001"
const ALVO = "30000000-0000-4000-8000-000000000002"
const BASE = "http://localhost:3000/api/app/membros"
const DATA = "2026-11-01T12:00:00.000Z"
const headers = { origin: "http://localhost:3000", "x-bivaque-app": "bivaque-spa" }
const context = { params: Promise.resolve({ id: ALVO }) }

type Opcoes = {
  visivel?: boolean
  bio?: string | null
  publicacoes?: unknown[]
  eventos?: unknown[]
  nome?: string | null
  falha?: "visibilidade" | "perfil" | "bio" | "publicacoes" | "eventos"
}

function mockClient(opcoes: Opcoes = {}) {
  const chamadas: Array<{ nome: string; args: Record<string, unknown> }> = []
  const tabelas: string[] = []
  const falhaDaRpc: Readonly<Record<string, string>> = {
    visibilidade: "profile_is_visible_to_viewer",
    bio: "get_profile_bio",
    publicacoes: "profile_posts_for",
    eventos: "profile_events_for",
  }
  const rpc = vi.fn(async (nome: string, args: Record<string, unknown> = {}) => {
    chamadas.push({ nome, args })
    if (opcoes.falha !== undefined && falhaDaRpc[opcoes.falha] === nome) {
      return { data: null, error: { message: "segredo do banco" } }
    }
    if (nome === "profile_is_visible_to_viewer")
      return { data: opcoes.visivel ?? true, error: null }
    if (nome === "get_profile_bio")
      return { data: opcoes.bio === undefined ? "Apresentação pública" : opcoes.bio, error: null }
    if (nome === "profile_posts_for") return { data: opcoes.publicacoes ?? [], error: null }
    if (nome === "profile_events_for") return { data: opcoes.eventos ?? [], error: null }
    return { data: null, error: null }
  })
  const from = vi.fn((tabela: string) => {
    tabelas.push(tabela)
    const query: Record<string, unknown> = {}
    query["select"] = () => query
    query["eq"] = () => query
    query["maybeSingle"] = async () =>
      opcoes.falha === "perfil"
        ? { data: null, error: { message: "segredo do banco" } }
        : { data: { display_name: opcoes.nome === undefined ? "Carla Almeida" : opcoes.nome } }
    return query
  })
  return { client: { from, rpc } as never, chamadas, tabelas }
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

function req(url = `${BASE}/${ALVO}`) {
  return new NextRequest(url, { method: "GET", headers })
}

async function json(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

describe("GET /api/app/membros/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)
  })

  it("GET /api/app/membros/[id] recusa ausência de sessão", async () => {
    expect((await perfilDeMembro(req(), context)).status).toBe(401)
  })

  it("id fora do formato é 404, sem consultar o banco", async () => {
    const mock = mockClient()
    authenticate(mock)
    const invalido = { params: Promise.resolve({ id: "nao-e-uuid" }) }
    expect((await perfilDeMembro(req(), invalido)).status).toBe(404)
    expect(mock.chamadas).toEqual([])
    expect(mock.tabelas).toEqual([])
  })

  it("mesma cidade devolve nome, apresentação, publicações e eventos", async () => {
    const mock = mockClient({
      publicacoes: [{ id: "p1", content: "Chegamos em Manaus no mês passado.", created_at: DATA }],
      eventos: [{ id: "e1", title: "Piquenique das famílias", starts_at: DATA }],
    })
    authenticate(mock)

    const resposta = await perfilDeMembro(req(), context)
    expect(resposta.status).toBe(200)
    expect(await json(resposta)).toEqual({
      membro: {
        id: ALVO,
        nome: "Carla Almeida",
        bio: "Apresentação pública",
        publicacoes: [{ id: "p1", texto: "Chegamos em Manaus no mês passado.", criadaEm: DATA }],
        eventos: [{ id: "e1", titulo: "Piquenique das famílias", comecaEm: DATA }],
      },
    })
  })

  it("o viewer é o da sessão, nunca um id vindo do pedido", async () => {
    const mock = mockClient()
    authenticate(mock)
    await perfilDeMembro(req(`${BASE}/${ALVO}?p_viewer_user_id=outra-pessoa`), context)

    for (const chamada of mock.chamadas) {
      if (chamada.nome === "get_profile_bio") {
        // A bio segue a visibilidade da RLS: só o alvo vai no argumento.
        expect(chamada.args["p_user_id"]).toBe(ALVO)
        continue
      }
      expect(chamada.args["p_viewer_user_id"], chamada.nome).toBe(USER)
      expect(chamada.args["p_target_user_id"], chamada.nome).toBe(ALVO)
    }
    expect(mock.chamadas.map((chamada) => chamada.nome)).toEqual([
      "profile_is_visible_to_viewer",
      "get_profile_bio",
      "profile_posts_for",
      "profile_events_for",
    ])
  })

  it("alvo de outra cidade é 404 e não lê o perfil", async () => {
    const mock = mockClient({ visivel: false })
    authenticate(mock)

    const resposta = await perfilDeMembro(req(), context)
    expect(resposta.status).toBe(404)
    expect(await json(resposta)).toEqual({ erro: "membro-nao-encontrado" })
    expect(mock.tabelas).toEqual([])
  })

  it("não devolve afiliação, cidade, contadores nem selos do alvo", async () => {
    const mock = mockClient()
    authenticate(mock)

    const corpo = await json(await perfilDeMembro(req(), context))
    const membro = corpo["membro"] as Record<string, unknown>
    expect(Object.keys(membro).sort()).toEqual(["bio", "eventos", "id", "nome", "publicacoes"])
    expect(mock.chamadas.map((chamada) => chamada.nome)).not.toContain("profile_affiliations_for")
    for (const proibida of [
      "afiliacao",
      "forca",
      "om",
      "posto",
      "unidade",
      "cidade",
      "localidade",
      "contadores",
      "selo",
      "verificado",
    ]) {
      expect(Object.hasOwn(membro, proibida), proibida).toBe(false)
    }
  })

  it("perfil sem nome devolve nome vazio, não inventa identidade", async () => {
    const mock = mockClient({ nome: null })
    authenticate(mock)
    const corpo = await json(await perfilDeMembro(req(), context))
    expect((corpo["membro"] as Record<string, unknown>)["nome"]).toBe("")
  })

  it.each([
    ["visibilidade", "visibilidade"],
    ["perfil", "perfil"],
    ["bio", "bio"],
    ["publicações", "publicacoes"],
    ["eventos", "eventos"],
  ])("falha de leitura em %s vira 503, sem eco do banco", async (_rotulo, falha) => {
    const mock = mockClient({ falha: falha as Opcoes["falha"] })
    authenticate(mock)

    const resposta = await perfilDeMembro(req(), context)
    expect(resposta.status).toBe(503)
    expect(await json(resposta)).toEqual({ erro: "leitura-indisponivel" })
  })
})
