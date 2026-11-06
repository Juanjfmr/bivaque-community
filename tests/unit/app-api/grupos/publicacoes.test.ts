import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/storage/sanitize-image", () => ({ sanitizeImage: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { POST as foto } from "web/app/api/app/grupos/[id]/fotos/route"
import { POST as publicar } from "web/app/api/app/grupos/[id]/publicacoes/route"
import { POST as comentar } from "web/app/api/app/grupos/publicacoes/[id]/comentarios/route"
import { GET as detalhe } from "web/app/api/app/grupos/publicacoes/[id]/route"
import { lerPublicacaoDoGrupo } from "web/lib/composer/post-attachment"
import { sanitizeImage } from "web/lib/storage/sanitize-image"
import { createServerClient } from "web/lib/supabase/server"
import {
  autenticar,
  BASE,
  CITY,
  COMMENT,
  comentario,
  context,
  grupo,
  headers,
  ID,
  mockClient,
  POST,
  post,
  postContext,
  req,
  semSessao,
  USER,
} from "./apoio"

const publicacoes = `${BASE}/${ID}/publicacoes`
const comentarios = `${BASE}/publicacoes/${POST}/comentarios`
const fotos = `${BASE}/${ID}/fotos`
const imagem = { tipo: "image/png", conteudo: Buffer.from("pixels originais").toString("base64") }
const escritas = [
  {
    nome: "publicar",
    chamar: publicar,
    context,
    url: publicacoes,
    corpo: { texto: "Olá, pessoal!", fotos: [] },
  },
  {
    nome: "comentar",
    chamar: comentar,
    context: postContext,
    url: comentarios,
    corpo: { texto: "Meu comentário" },
  },
  { nome: "foto", chamar: foto, context, url: fotos, corpo: imagem },
] as const

describe("publicar, ler e comentar em grupo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    semSessao()
    vi.mocked(sanitizeImage).mockResolvedValue(Buffer.from("pixels sem EXIF"))
    vi.mocked(createServerClient).mockReturnValue(mockClient().client)
  })
  it.each(escritas)("$nome exige sessão", async (c) => {
    expect((await c.chamar(req("POST", c.url, c.corpo), c.context)).status).toBe(401)
  })
  it("detalhe exige sessão", async () => {
    expect((await detalhe(req(), postContext)).status).toBe(401)
  })
  it.each(escritas)("$nome protege origem e cabeçalho antes do banco", async (c) => {
    const mock = mockClient()
    autenticar(mock)
    for (const cabecalhos of [
      { ...headers, origin: "https://fora.example.invalid" },
      { origin: headers.origin, "content-type": "application/json" },
    ]) {
      expect((await c.chamar(req("POST", c.url, c.corpo, cabecalhos), c.context)).status).toBe(403)
    }
    expect(mock.from).not.toHaveBeenCalled()
  })
  it.each(escritas)("$nome recusa não membro mesmo no grupo aberto", async (c) => {
    const mock = mockClient({ membro: null })
    autenticar(mock)
    expect((await c.chamar(req("POST", c.url, c.corpo), c.context)).status).toBe(403)
    expect(mock.chamadas.some((chamada) => chamada.metodo === "insert")).toBe(false)
    expect(sanitizeImage).not.toHaveBeenCalled()
    expect(createServerClient).not.toHaveBeenCalled()
  })
  it.each(escritas)("$nome não revela grupo/publicação inexistente", async (c) => {
    const mock = mockClient({ grupo: null, posts: [] })
    autenticar(mock)
    expect((await c.chamar(req("POST", c.url, c.corpo), c.context)).status).toBe(404)
  })
  it.each(escritas)("$nome valida o content-type", async (c) => {
    const mock = mockClient()
    autenticar(mock)
    expect(
      (
        await c.chamar(
          req("POST", c.url, c.corpo, { ...headers, "content-type": "text/plain" }),
          c.context,
        )
      ).status,
    ).toBe(400)
    expect(mock.from).not.toHaveBeenCalled()
  })
  it("publica texto e quatro fotos com autoria/cidade/grupo da sessão e do banco", async () => {
    const mock = mockClient()
    autenticar(mock)
    const caminhos = Array.from({ length: 4 }, (_, i) => `${USER}/grupos/${ID}/foto-${i}.png`)
    const r = await publicar(
      req("POST", publicacoes, {
        texto: "  Uma publicação real.  ",
        fotos: caminhos,
        user_id: "outra",
        locality_id: "outra",
        group_id: "outro",
        role: "owner",
      }),
      context,
    )
    expect(r.status).toBe(201)
    expect(await r.json()).toEqual({ publicacao: { id: POST } })
    expect(mock.chamadas).toContainEqual({
      tabela: "posts",
      metodo: "insert",
      args: [
        {
          content: "Uma publicação real.",
          post_type: "photo",
          photo_path: caminhos[0],
          photo_paths: caminhos,
          user_id: USER,
          locality_id: CITY,
          group_id: ID,
          community_id: null,
        },
      ],
    })
  })
  it.each([
    { texto: "" },
    { texto: "a".repeat(2001) },
    { texto: 5 },
    { texto: "Texto", fotos: ["outro/foto.png"] },
    { texto: "Texto", fotos: [USER + "/../foto.png"] },
    { texto: "Texto", fotos: [USER + "/"] },
    { texto: "Texto", fotos: Array.from({ length: 5 }, (_, i) => USER + "/" + i) },
    { texto: "Texto", fotos: [USER + "/a", USER + "/a"] },
  ])("publicação inválida não toca no banco", async (corpo) => {
    const mock = mockClient()
    autenticar(mock)
    expect((await publicar(req("POST", publicacoes, corpo), context)).status).toBe(400)
    expect(mock.from).not.toHaveBeenCalled()
  })
  it("texto sem foto usa a derivação compartilhada com a web antiga", () => {
    expect(lerPublicacaoDoGrupo({ texto: "Olá" }, USER)).toEqual({
      content: "Olá",
      post_type: "text",
      photo_paths: [],
    })
  })
  it.each([
    ["42501", 403],
    ["23514", 400],
    ["XX000", 503],
  ])("recusa do banco ao publicar é %s → %s sem eco", async (codigo, status) => {
    const mock = mockClient({ erroEscrita: "posts", codigo })
    autenticar(mock)
    const r = await publicar(req("POST", publicacoes, { texto: "Texto" }), context)
    expect(r.status).toBe(status)
    expect(JSON.stringify(await r.json())).not.toContain("segredo")
  })
  it("foto é sanitizada; só o upload usa serviço, após conferir vínculo sob RLS", async () => {
    const mock = mockClient()
    const storage = mockClient()
    vi.mocked(createServerClient).mockReturnValue(storage.client)
    autenticar(mock)
    const r = await foto(req("POST", fotos, imagem), context)
    expect(r.status).toBe(201)
    const corpo = await r.json()
    expect(corpo.caminho).toMatch(new RegExp("^" + USER + "/grupos/" + ID + "/[0-9a-f-]+\\.png$"))
    expect(sanitizeImage).toHaveBeenCalledWith(expect.any(File), 5 * 1024 * 1024)
    expect(mock.upload).not.toHaveBeenCalled()
    expect(storage.upload).toHaveBeenCalledWith(corpo.caminho, Buffer.from("pixels sem EXIF"), {
      contentType: "image/png",
      upsert: false,
    })
  })
  it.each([
    { tipo: "image/svg+xml", conteudo: "YQ==" },
    { tipo: "image/png", conteudo: "" },
    { tipo: "image/png", conteudo: "!!!=" },
    { tipo: "image/png", conteudo: 5 },
  ])("foto inválida é recusada", async (corpo) => {
    const mock = mockClient()
    autenticar(mock)
    expect((await foto(req("POST", fotos, corpo), context)).status).toBe(400)
    expect(mock.upload).not.toHaveBeenCalled()
  })
  it("foto que não decodifica não é enviada", async () => {
    const mock = mockClient()
    autenticar(mock)
    vi.mocked(sanitizeImage).mockRejectedValue(new Error("detalhe interno"))
    expect((await foto(req("POST", fotos, imagem), context)).status).toBe(400)
    expect(mock.upload).not.toHaveBeenCalled()
    expect(createServerClient).not.toHaveBeenCalled()
  })
  it("erro do storage é 503 sem eco", async () => {
    const mock = mockClient()
    vi.mocked(createServerClient).mockReturnValue(mockClient({ storageErro: "upload" }).client)
    autenticar(mock)
    const r = await foto(req("POST", fotos, imagem), context)
    expect(r.status).toBe(503)
    expect(await r.json()).toEqual({ erro: "foto-indisponivel" })
  })
  it("detalhe devolve fotos assinadas e fio paginado", async () => {
    const mock = mockClient({
      posts: [{ ...post, photo_paths: [USER + "/a.png", USER + "/b.png"] }],
      comentarios: [
        comentario,
        {
          ...comentario,
          id: "90000000-0000-4000-8000-000000000004",
          parent_id: COMMENT,
          reply_to_id: COMMENT,
        },
      ],
    })
    autenticar(mock)
    const r = await detalhe(req("GET", BASE + "/publicacoes/" + POST), postContext)
    expect(r.status).toBe(200)
    const corpo = await r.json()
    expect(corpo.publicacao.fotos).toHaveLength(2)
    expect(corpo.comentarios[1]).toMatchObject({
      parentId: COMMENT,
      respondeA: COMMENT,
      para: "Ana",
    })
    expect(JSON.stringify(corpo)).not.toContain("/a.png")
    expect(mock.chamadas).toContainEqual({ tabela: "comments", metodo: "range", args: [0, 49] })
  })
  it("grupo fechado sem aprovação não libera publicação no detalhe", async () => {
    const mock = mockClient({ grupo: { ...grupo, visibility: "private" }, membro: null })
    autenticar(mock)
    expect((await detalhe(req(), postContext)).status).toBe(404)
    expect(mock.chamadas.some((c) => c.tabela === "comments")).toBe(false)
  })
  it("publicação inexistente é 404", async () => {
    const mock = mockClient({ posts: [] })
    autenticar(mock)
    expect((await detalhe(req(), postContext)).status).toBe(404)
  })
  it("comenta com autoria da sessão e devolve o comentário gravado", async () => {
    const mock = mockClient()
    autenticar(mock)
    const r = await comentar(
      req("POST", comentarios, { texto: "  Uma resposta  ", user_id: "outro", post_id: "outro" }),
      postContext,
    )
    expect(r.status).toBe(201)
    expect((await r.json()).comentario).toMatchObject({
      texto: "Uma resposta",
      propria: true,
      parentId: null,
    })
    expect(mock.chamadas).toContainEqual({
      tabela: "comments",
      metodo: "insert",
      args: [{ content: "Uma resposta", reply_to_id: null, post_id: POST, user_id: USER }],
    })
  })
  it("resposta aponta para comentário da mesma publicação; o banco fixa a raiz", async () => {
    const mock = mockClient()
    autenticar(mock)
    const r = await comentar(
      req("POST", comentarios, { texto: "Concordo", respondeA: COMMENT, parent_id: "forjado" }),
      postContext,
    )
    expect(r.status).toBe(201)
    expect((await r.json()).comentario).toMatchObject({ respondeA: COMMENT, parentId: COMMENT })
    expect(mock.chamadas).toContainEqual({
      tabela: "comments",
      metodo: "eq",
      args: ["post_id", POST],
    })
  })
  it("alvo inexistente ou de outra publicação é 404 sem gravar", async () => {
    const mock = mockClient({ comentarios: [] })
    autenticar(mock)
    expect(
      (
        await comentar(
          req("POST", comentarios, { texto: "Concordo", respondeA: COMMENT }),
          postContext,
        )
      ).status,
    ).toBe(404)
    expect(mock.chamadas.some((c) => c.metodo === "insert")).toBe(false)
  })
  it.each([
    { texto: "" },
    { texto: "a".repeat(1001) },
    { texto: "Bom", respondeA: "invalido" },
    { texto: 7 },
  ])("comentário inválido é 400", async (corpo) => {
    const mock = mockClient()
    autenticar(mock)
    expect((await comentar(req("POST", comentarios, corpo), postContext)).status).toBe(400)
    expect(mock.from).not.toHaveBeenCalled()
  })
  it.each([
    ["42501", 403],
    ["23514", 400],
    ["XX000", 503],
  ])("erro de comentário %s → %s", async (codigo, status) => {
    const mock = mockClient({ erroEscrita: "comments", codigo })
    autenticar(mock)
    const r = await comentar(req("POST", comentarios, { texto: "Concordo" }), postContext)
    expect(r.status).toBe(status)
    expect(JSON.stringify(await r.json())).not.toContain("segredo")
  })
  it.each(["posts", "comments", "profiles"])("falha de leitura de %s é 503", async (erro) => {
    const mock = mockClient({ erro })
    autenticar(mock)
    expect((await detalhe(req(), postContext)).status).toBe(503)
  })
})
