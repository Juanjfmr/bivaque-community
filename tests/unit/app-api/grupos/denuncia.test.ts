import { beforeEach, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as denunciar } from "web/app/api/app/grupos/publicacoes/[id]/denuncia/route"
import {
  autenticar,
  BASE,
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

const url = `${BASE}/publicacoes/${POST}/denuncia`
const corpo = { motivo: "spam", explicacao: "Oferta repetida" }
const outroPost = { ...post, user_id: "20000000-0000-4000-8000-000000000002" }
beforeEach(() => {
  vi.clearAllMocks()
  semSessao()
})
it("exige sessão", async () => {
  expect((await denunciar(req("POST", url, corpo), postContext)).status).toBe(401)
})
it("origem e cabeçalho são conferidos antes do banco", async () => {
  const mock = mockClient()
  autenticar(mock)
  for (const h of [
    { ...headers, origin: "https://fora.example.invalid" },
    { origin: headers.origin },
  ]) {
    expect((await denunciar(req("POST", url, corpo, h), postContext)).status).toBe(403)
  }
  expect(mock.from).not.toHaveBeenCalled()
})
it.each(["spam", "conteudo-inadequado", "informacao-enganosa", "outro"])(
  "registra %s sob RLS com alvo e autoria do servidor",
  async (motivo) => {
    const mock = mockClient({ posts: [outroPost] })
    autenticar(mock)
    const r = await denunciar(
      req("POST", url, {
        motivo,
        explicacao: "  Explicação  ",
        reporter_user_id: "outro",
        target_id: "outro",
        target_type: "message",
      }),
      postContext,
    )
    expect(r.status).toBe(201)
    expect(await r.json()).toMatchObject({ denuncia: { id: expect.any(String) } })
    expect(mock.chamadas).toContainEqual({
      tabela: "reports",
      metodo: "insert",
      args: [
        expect.objectContaining({
          reporter_user_id: USER,
          target_type: "post",
          target_id: POST,
          reason: expect.stringMatching(/: Explicação$/),
        }),
      ],
    })
  },
)
it("denunciar conteúdo próprio é recusado antes da escrita", async () => {
  const mock = mockClient()
  autenticar(mock)
  expect((await denunciar(req("POST", url, corpo), postContext)).status).toBe(403)
  expect(mock.chamadas.some((c) => c.metodo === "insert")).toBe(false)
})
it.each([null, { group_id: ID, status: "pending", role: "member" }])(
  "não membro e pendente não denunciam",
  async (membro) => {
    autenticar(mockClient({ posts: [outroPost], membro }))
    expect((await denunciar(req("POST", url, corpo), postContext)).status).toBe(403)
  },
)
it.each([
  { posts: [] },
  { grupo: null },
  { grupo: { ...grupo, visibility: "private" }, membro: null },
])("alvo inexistente ou fechado invisível é 404", async (opcoes) => {
  autenticar(mockClient({ posts: [outroPost], ...opcoes }))
  expect((await denunciar(req("POST", url, corpo), postContext)).status).toBe(404)
})
it.each([
  {},
  { motivo: "qualquer" },
  { motivo: 5 },
  { motivo: "spam", explicacao: false },
  { motivo: "outro", explicacao: "a".repeat(301) },
])("corpo inválido é 400", async (dados) => {
  const mock = mockClient()
  autenticar(mock)
  expect((await denunciar(req("POST", url, dados), postContext)).status).toBe(400)
  expect(mock.from).not.toHaveBeenCalled()
})
it("não aceita content-type fora de JSON", async () => {
  autenticar(mockClient())
  expect(
    (
      await denunciar(
        req("POST", url, corpo, { ...headers, "content-type": "text/plain" }),
        postContext,
      )
    ).status,
  ).toBe(400)
})
it.each([
  ["23505", 409],
  ["42501", 403],
  ["23514", 400],
  ["XX000", 503],
])("erro %s vira %s sem eco", async (codigo, status) => {
  autenticar(mockClient({ posts: [outroPost], erroEscrita: "reports", codigo }))
  const r = await denunciar(req("POST", url, corpo), postContext)
  expect(r.status).toBe(status)
  expect(JSON.stringify(await r.json())).not.toContain("segredo")
})
it.each(["posts", "groups", "group_memberships"])("erro de %s é 503", async (erro) => {
  autenticar(mockClient({ posts: [outroPost], erro }))
  expect((await denunciar(req("POST", url, corpo), postContext)).status).toBe(503)
})
