import { beforeEach, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { PUT } from "web/app/api/app/grupos/publicacoes/[id]/acoes/route"
import { GET } from "web/app/api/app/grupos/publicacoes/[id]/route"
import {
  autenticar,
  BASE,
  COMMENT,
  grupo,
  headers,
  ID,
  mockClient,
  POST,
  postContext,
  req,
  semSessao,
  USER,
} from "./apoio"

const url = `${BASE}/publicacoes/${POST}/acoes`
const acoes = ["util", "salvar", "fixar", "ocultar"] as const
beforeEach(() => {
  vi.clearAllMocks()
  semSessao()
})

it("exige sessão", async () => {
  expect((await PUT(req("PUT", url, { acao: "util", valor: true }), postContext)).status).toBe(401)
})
it.each(acoes)("%s recusa origem e cabeçalho antes do banco", async (acao) => {
  const mock = mockClient()
  autenticar(mock)
  for (const h of [
    { ...headers, origin: "https://fora.example.invalid" },
    { origin: headers.origin },
  ]) {
    expect((await PUT(req("PUT", url, { acao, valor: true }, h), postContext)).status).toBe(403)
  }
  expect(mock.from).not.toHaveBeenCalled()
})
it.each(acoes)("%s exige membro aprovado, inclusive em grupo aberto", async (acao) => {
  for (const membro of [null, { group_id: ID, status: "pending", role: "owner" }]) {
    const mock = mockClient({ membro })
    autenticar(mock)
    expect((await PUT(req("PUT", url, { acao, valor: true }), postContext)).status).toBe(403)
    expect(
      mock.chamadas.some((c) => ["upsert", "delete", "update", "rpc"].includes(c.metodo)),
    ).toBe(false)
  }
})
it.each(acoes)("%s recusa inexistente", async (acao) => {
  autenticar(mockClient({ posts: [] }))
  expect((await PUT(req("PUT", url, { acao, valor: true }), postContext)).status).toBe(404)
})
it.each([
  {},
  { acao: "inventar", valor: true },
  { acao: "util", valor: 1 },
  { acao: "salvar", valor: true, comentarioId: COMMENT },
  { acao: "util", valor: true, comentarioId: "inválido" },
])("corpo inválido é 400 antes do banco", async (corpo) => {
  const mock = mockClient()
  autenticar(mock)
  expect((await PUT(req("PUT", url, corpo), postContext)).status).toBe(400)
  expect(mock.from).not.toHaveBeenCalled()
})
it.each([
  ["util", "post_reactions", "post_id"],
  ["salvar", "post_saves", "post_id"],
  ["ocultar", "hidden_posts", "post_id"],
])(
  "%s grava e desfaz só para a sessão, sem aceitar autoria do corpo",
  async (acao, tabela, campo) => {
    const mock = mockClient({ salvas: true, ocultas: true })
    autenticar(mock)
    const r = await PUT(req("PUT", url, { acao, valor: true, user_id: "outra" }), postContext)
    expect(r.status).toBe(200)
    expect((await r.json()).publicacao).toMatchObject({ salva: true, oculta: true })
    expect(mock.chamadas).toContainEqual({
      tabela,
      metodo: "upsert",
      args: [{ user_id: USER, [campo]: POST }, expect.objectContaining({ ignoreDuplicates: true })],
    })
    expect((await PUT(req("PUT", url, { acao, valor: false }), postContext)).status).toBe(200)
    expect(mock.chamadas).toContainEqual({ tabela, metodo: "eq", args: ["user_id", USER] })
    expect(mock.chamadas).toContainEqual({ tabela, metodo: "eq", args: [campo, POST] })
  },
)
it("só o administrador fixa e desfaz a fixação da publicação certa", async () => {
  const mock = mockClient()
  autenticar(mock)
  expect((await PUT(req("PUT", url, { acao: "fixar", valor: true }), postContext)).status).toBe(200)
  expect(mock.rpc).toHaveBeenCalledWith("pin_group_post", { p_group_id: ID, p_post_id: POST })
  expect((await PUT(req("PUT", url, { acao: "fixar", valor: false }), postContext)).status).toBe(
    200,
  )
  expect(mock.chamadas).toContainEqual({
    tabela: "groups",
    metodo: "eq",
    args: ["pinned_post_id", POST],
  })
  const comum = mockClient({ grupo: { ...grupo, owner_user_id: "outro" } })
  autenticar(comum)
  expect(
    (await PUT(req("PUT", url, { acao: "fixar", valor: true, admin: true }), postContext)).status,
  ).toBe(403)
  expect(comum.rpc).not.toHaveBeenCalled()
})
it("Útil no comentário confere alvo na publicação e devolve resultado gravado", async () => {
  const mock = mockClient()
  autenticar(mock)
  const r = await PUT(
    req("PUT", url, { acao: "util", valor: true, comentarioId: COMMENT }),
    postContext,
  )
  expect(r.status).toBe(200)
  expect(await r.json()).toEqual({ comentario: { id: COMMENT, uteis: 1, util: true } })
  expect(mock.chamadas).toContainEqual({
    tabela: "comments",
    metodo: "eq",
    args: ["post_id", POST],
  })
  expect(
    (await PUT(req("PUT", url, { acao: "util", valor: false, comentarioId: COMMENT }), postContext))
      .status,
  ).toBe(200)
  expect(mock.chamadas).toContainEqual({ tabela: "comment_reactions", metodo: "delete", args: [] })
})
it("comentário de outra publicação ou invisível não recebe Útil", async () => {
  const mock = mockClient({ comentarios: [] })
  autenticar(mock)
  expect(
    (await PUT(req("PUT", url, { acao: "util", valor: true, comentarioId: COMMENT }), postContext))
      .status,
  ).toBe(404)
  expect(mock.chamadas.some((c) => c.metodo === "upsert")).toBe(false)
})
it("desfazer Útil retorna o estado relido, inclusive contagem zero", async () => {
  autenticar(mockClient({ reacoesComentarios: [] }))
  const r = await PUT(
    req("PUT", url, { acao: "util", valor: false, comentarioId: COMMENT }),
    postContext,
  )
  expect(r.status).toBe(200)
  expect(await r.json()).toEqual({ comentario: { id: COMMENT, uteis: 0, util: false } })
})
it("detalhe conta reações de outras pessoas sem marcá-las como minhas", async () => {
  autenticar(
    mockClient({
      reacoesComentarios: [
        { comment_id: COMMENT, user_id: "outra" },
        { comment_id: COMMENT, user_id: "terceira" },
      ],
    }),
  )
  const r = await GET(req(), postContext)
  expect(r.status).toBe(200)
  expect((await r.json()).comentarios[0]).toMatchObject({ uteis: 2, util: false })
})
it.each([
  ["salvas", "saved"],
  ["ocultadas", "hidden"],
])("filtro %s é aplicado no feed antes do range", async (ordem, esperado) => {
  const { GET: grupoGET } = await import("web/app/api/app/grupos/[id]/route")
  const mock = mockClient()
  autenticar(mock)
  expect(
    (
      await grupoGET(req("GET", `${BASE}/${ID}?ordem=${ordem}&depois=20`), {
        params: Promise.resolve({ id: ID }),
      })
    ).status,
  ).toBe(200)
  expect(mock.rpc).toHaveBeenCalledWith("feed_group", { p_group_id: ID, p_order: esperado })
  expect(mock.chamadas).toContainEqual({ tabela: "feed_group", metodo: "range", args: [20, 39] })
})
it.each(["post_reactions", "post_saves", "hidden_posts", "comment_reactions"])(
  "falha de %s é 503 sem eco",
  async (tabela) => {
    const mock = mockClient({ erroEscrita: tabela })
    autenticar(mock)
    const acao = tabela === "post_saves" ? "salvar" : tabela === "hidden_posts" ? "ocultar" : "util"
    const r = await PUT(
      req("PUT", url, {
        acao,
        valor: true,
        ...(tabela === "comment_reactions" ? { comentarioId: COMMENT } : {}),
      }),
      postContext,
    )
    expect(r.status).toBe(503)
    expect(JSON.stringify(await r.json())).not.toContain("segredo")
  },
)
it("falha da RPC de fixar é 503", async () => {
  autenticar(mockClient({ rpcErro: "pin_group_post" }))
  expect((await PUT(req("PUT", url, { acao: "fixar", valor: true }), postContext)).status).toBe(503)
})
it("detalhe relê salvos, ocultados e Útil dos comentários sem estado local", async () => {
  autenticar(mockClient({ salvas: true, ocultas: true }))
  const r = await GET(req(), postContext)
  expect(r.status).toBe(200)
  const corpo = await r.json()
  expect(corpo.publicacao).toMatchObject({ salva: true, oculta: true })
  expect(corpo.comentarios[0]).toMatchObject({ uteis: 1, util: true })
})
it.each(["post_saves", "hidden_posts", "comment_reactions"])(
  "falha ao reler %s não inventa estado",
  async (erro) => {
    autenticar(mockClient({ erro }))
    expect((await GET(req(), postContext)).status).toBe(503)
  },
)
