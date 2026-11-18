import { beforeEach, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST } from "web/app/api/app/grupos/route"
import { autenticar, BASE, CITY, headers, mockClient, req, semSessao, USER } from "./apoio"

const corpo = {
  nome: "Famílias do Norte",
  descricao: "Encontros da família",
  regras: "Respeito entre os membros.",
  fechado: false,
}

beforeEach(() => {
  vi.clearAllMocks()
  semSessao()
})

it("exige sessão", async () => {
  expect((await POST(req("POST", BASE, corpo))).status).toBe(401)
})
it("recusa origem e cabeçalho do app antes do banco", async () => {
  const mock = mockClient({ grupos: [] })
  autenticar(mock)
  for (const h of [
    { ...headers, origin: "https://fora.example.invalid" },
    { origin: headers.origin, "content-type": headers["content-type"] },
  ]) {
    expect((await POST(req("POST", BASE, corpo, h))).status).toBe(403)
  }
  expect(mock.from).not.toHaveBeenCalled()
  expect(mock.rpc).not.toHaveBeenCalled()
})
it.each([
  { ...corpo, nome: "ab" },
  { ...corpo, nome: "x".repeat(81) },
  { ...corpo, descricao: "x".repeat(501) },
  { ...corpo, regras: "x".repeat(601) },
  { ...corpo, nome: 1 },
  { ...corpo, fechado: "sim" },
  {},
])("dados inválidos são 400 antes do banco", async (invalido) => {
  const mock = mockClient({ grupos: [] })
  autenticar(mock)
  const r = await POST(req("POST", BASE, invalido))
  expect(r.status).toBe(400)
  expect(typeof (await r.json()).mensagem).toBe("string")
  expect(mock.from).not.toHaveBeenCalled()
  expect(mock.rpc).not.toHaveBeenCalled()
})
it("corpo sem JSON é 400", async () => {
  const mock = mockClient({ grupos: [] })
  autenticar(mock)
  const semTipo = req("POST", BASE, corpo, {
    origin: headers.origin,
    "x-bivaque-app": headers["x-bivaque-app"],
  })
  expect((await POST(semTipo)).status).toBe(400)
  expect(mock.from).not.toHaveBeenCalled()
})
it("sem cidade é 403 e não chega à RPC", async () => {
  const mock = mockClient({ cidade: false })
  autenticar(mock)
  const r = await POST(req("POST", BASE, corpo))
  expect(r.status).toBe(403)
  expect(await r.json()).toEqual({ erro: "sem-cidade" })
  expect(mock.rpc).not.toHaveBeenCalled()
})
it("nome já usado na cidade é 409 sem criar, sem acento nem caixa", async () => {
  const mock = mockClient({ grupos: [{ name: "familias do norte" }] })
  autenticar(mock)
  const r = await POST(req("POST", BASE, corpo))
  expect(r.status).toBe(409)
  expect(await r.json()).toMatchObject({ erro: "nome-em-uso" })
  expect(mock.rpc).not.toHaveBeenCalled()
  // A comparação é a da cidade da sessão, nunca uma cidade vinda do corpo.
  expect(mock.chamadas).toContainEqual({
    tabela: "groups",
    metodo: "eq",
    args: ["locality_id", CITY],
  })
})
it("cria na cidade da sessão e devolve o grupo com quem criou como dono", async () => {
  const mock = mockClient({ grupos: [] })
  autenticar(mock)
  const r = await POST(req("POST", BASE, { ...corpo, cidade: "forjada", admin: true }))
  expect(r.status).toBe(201)
  expect((await r.json()).grupo).toMatchObject({
    id: expect.any(String),
    membro: true,
    admin: true,
    fechado: false,
    membros: 1,
  })
  expect(mock.rpc).toHaveBeenCalledWith("create_group", {
    p_name: "Famílias do Norte",
    p_visibility: "public",
    p_locality_id: CITY,
    p_description: "Encontros da família",
    p_rules: "Respeito entre os membros.",
  })
  expect(mock.chamadas).toContainEqual({
    tabela: "group_memberships",
    metodo: "eq",
    args: ["user_id", USER],
  })
})
it("grupo fechado e campos opcionais vazios não viram string vazia no banco", async () => {
  const mock = mockClient({ grupos: [] })
  autenticar(mock)
  const r = await POST(
    req("POST", BASE, { nome: "  Famílias  ", descricao: "", regras: "", fechado: true }),
  )
  expect(r.status).toBe(201)
  expect(mock.rpc).toHaveBeenCalledWith("create_group", {
    p_name: "Famílias",
    p_visibility: "private",
    p_locality_id: CITY,
  })
})
it("recusa da RPC é 403 com frase para a pessoa, sem eco do banco", async () => {
  const mock = mockClient({ grupos: [], rpcErro: "create_group", codigo: "P0001" })
  autenticar(mock)
  const r = await POST(req("POST", BASE, corpo))
  expect(r.status).toBe(403)
  const texto = JSON.stringify(await r.json())
  expect(texto).toContain("não pode criar grupos")
  expect(texto).not.toContain("segredo")
})
it("falha da RPC é 503 sem eco", async () => {
  const mock = mockClient({ grupos: [], rpcErro: "create_group" })
  autenticar(mock)
  const r = await POST(req("POST", BASE, corpo))
  expect(r.status).toBe(503)
  expect(await r.json()).toEqual({ erro: "escrita-indisponivel" })
})
it("grupo criado que não volta na leitura é 503, não sucesso vazio", async () => {
  const mock = mockClient({ grupos: [], grupo: null })
  autenticar(mock)
  expect((await POST(req("POST", BASE, corpo))).status).toBe(503)
})
