import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET as detalhe } from "web/app/api/app/grupos/[id]/route"
import { GET as listar, OPTIONS } from "web/app/api/app/grupos/route"
import {
  autenticar,
  BASE,
  CITY,
  context,
  grupo,
  ID,
  mockClient,
  post,
  req,
  semSessao,
  USER,
} from "./apoio"

describe("grupos — diretório e detalhe sob RLS", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    semSessao()
  })
  it.each([
    ["lista", () => listar(req())],
    ["detalhe", () => detalhe(req(), context)],
  ])("%s exige sessão", async (_, chamar) => {
    expect((await chamar()).status).toBe(401)
  })
  it("o diretório usa a cidade current da sessão e ignora cidade, usuário e papel forjados", async () => {
    const mock = mockClient()
    autenticar(mock)
    const r = await listar(req("GET", BASE + "?cidade=outra&user_id=outro&role=owner"))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({
      cidade: "Manaus",
      proximo: null,
      grupos: [{ id: ID, nome: "Famílias", membro: true, admin: true }],
    })
    expect(mock.chamadas).toContainEqual({
      tabela: "locality_memberships",
      metodo: "eq",
      args: ["kind", "current"],
    })
    expect(mock.chamadas).toContainEqual({
      tabela: "groups",
      metodo: "eq",
      args: ["locality_id", CITY],
    })
    expect(mock.chamadas).toContainEqual({
      tabela: "group_memberships",
      metodo: "eq",
      args: ["user_id", USER],
    })
  })
  it("sem cidade retorna vazio honesto", async () => {
    const mock = mockClient({ cidade: false })
    autenticar(mock)
    expect(await (await listar(req())).json()).toEqual({ grupos: [], cidade: "", proximo: null })
  })
  it.each(["-1", "abc", "1.2", "100001"])("recusa página inválida %s", async (valor) => {
    const mock = mockClient()
    autenticar(mock)
    expect((await listar(req("GET", BASE + "?depois=" + valor))).status).toBe(400)
    expect((await detalhe(req("GET", BASE + "/" + ID + "?depois=" + valor), context)).status).toBe(
      400,
    )
    expect(mock.from).not.toHaveBeenCalled()
  })
  it("página cheia oferece continuação", async () => {
    const mock = mockClient({ grupos: Array.from({ length: 20 }, () => grupo) })
    autenticar(mock)
    expect((await (await listar(req())).json()).proximo).toBe("20")
  })
  it("detalhe devolve somente publicações visíveis e URLs assinadas, sem caminho bruto", async () => {
    const mock = mockClient({ posts: [{ ...post, photo_path: USER + "/foto.jpg" }] })
    autenticar(mock)
    const r = await detalhe(req("GET", BASE + "/" + ID), context)
    expect(r.status).toBe(200)
    const corpo = await r.json()
    expect(corpo.publicacoes[0]).toMatchObject({
      texto: post.content,
      autor: "Ana",
      util: true,
      uteis: 3,
      fotos: ["https://storage.example.invalid/assinada"],
    })
    expect(JSON.stringify(corpo)).not.toContain("foto.jpg")
    expect(mock.chamadas).toContainEqual({ tabela: "feed_group", metodo: "range", args: [0, 19] })
  })
  it("fechado sem participação não consulta nem retorna conteúdo ou contagem de membros", async () => {
    const mock = mockClient({ grupo: { ...grupo, visibility: "private" }, membro: null })
    autenticar(mock)
    expect(await (await detalhe(req(), context)).json()).toMatchObject({
      grupo: { fechado: true, membros: null },
      publicacoes: [],
      proximo: null,
    })
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it("pedido pendente também não libera conteúdo fechado", async () => {
    const mock = mockClient({
      grupo: { ...grupo, visibility: "private" },
      membro: { group_id: ID, role: "member", status: "pending" },
    })
    autenticar(mock)
    expect(await (await detalhe(req(), context)).json()).toMatchObject({
      grupo: { pendente: true, membro: false },
      publicacoes: [],
    })
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it("grupo ausente ou id inválido é 404", async () => {
    const mock = mockClient({ grupo: null })
    autenticar(mock)
    expect((await detalhe(req(), context)).status).toBe(404)
    expect((await detalhe(req(), { params: Promise.resolve({ id: "invalido" }) })).status).toBe(404)
  })
  it.each(["groups", "group_memberships", "posts", "profiles", "post_reactions"])(
    "falha em %s vira 503 sem eco",
    async (tabela) => {
      const mock = mockClient({ erro: tabela })
      autenticar(mock)
      const r = await detalhe(req(), context)
      expect(r.status).toBe(503)
      expect(await r.json()).toEqual({ erro: "leitura-indisponivel" })
    },
  )
  it("falha no diretório não vira lista vazia", async () => {
    const mock = mockClient({ erro: "locality_memberships" })
    autenticar(mock)
    expect((await listar(req())).status).toBe(503)
  })
  it("preflight aceita a origem local e recusa outra", () => {
    expect(OPTIONS(req("OPTIONS")).status).toBe(204)
    expect(
      OPTIONS(req("OPTIONS", BASE, undefined, { origin: "https://fora.example.invalid" })).status,
    ).toBe(403)
  })
})
