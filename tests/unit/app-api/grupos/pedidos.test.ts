import { beforeEach, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { GET } from "web/app/api/app/grupos/[id]/pedidos/route"
import { autenticar, context, grupo, mockClient, req, semSessao } from "./apoio"

beforeEach(() => {
  vi.clearAllMocks()
  semSessao()
})
it("pedidos exigem sessão", async () => {
  expect((await GET(req(), context)).status).toBe(401)
})
it("administrador lê apenas os pedidos do próprio grupo", async () => {
  const mock = mockClient()
  autenticar(mock)
  const r = await GET(req(), context)
  expect(r.status).toBe(200)
  expect((await r.json()).pedidos).toBeInstanceOf(Array)
  expect(mock.chamadas).toContainEqual({
    tabela: "group_memberships",
    metodo: "eq",
    args: ["status", "pending"],
  })
})
it("membro comum não lê os motivos", async () => {
  const mock = mockClient({ grupo: { ...grupo, owner_user_id: "outro" } })
  autenticar(mock)
  expect((await GET(req(), context)).status).toBe(403)
  expect(mock.chamadas.some((c) => c.tabela === "group_join_reasons")).toBe(false)
})
it("não membro não lê pedidos", async () => {
  const mock = mockClient({ membro: null })
  autenticar(mock)
  expect((await GET(req(), context)).status).toBe(403)
})
it("inexistente é 404", async () => {
  const mock = mockClient({ grupo: null })
  autenticar(mock)
  expect((await GET(req(), context)).status).toBe(404)
})
it("página inválida é 400", async () => {
  const mock = mockClient()
  autenticar(mock)
  expect(
    (await GET(req("GET", "http://localhost:3000/api/app/grupos/x/pedidos?depois=-1"), context))
      .status,
  ).toBe(400)
})
it("falha de leitura é 503", async () => {
  const mock = mockClient({ erro: "group_memberships" })
  autenticar(mock)
  const r = await GET(req(), context)
  expect(r.status).toBe(503)
  expect(JSON.stringify(await r.json())).not.toContain("segredo")
})
it.each(["group_join_reasons", "profiles"])("erro em %s não vira motivo vazio", async (erro) => {
  const mock = mockClient({ erro })
  autenticar(mock)
  const r = await GET(req(), context)
  expect(r.status).toBe(503)
  expect(await r.json()).toEqual({ erro: "leitura-indisponivel" })
})
