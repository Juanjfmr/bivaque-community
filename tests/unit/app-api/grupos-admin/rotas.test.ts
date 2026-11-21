import { beforeEach, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as transferir } from "web/app/api/app/grupos/[id]/administracao/route"
import { PUT as aviso } from "web/app/api/app/grupos/[id]/aviso/route"
import { DELETE as remover } from "web/app/api/app/grupos/[id]/membros/[usuario]/route"
import { GET as membros } from "web/app/api/app/grupos/[id]/membros/route"
import { POST as decidir } from "web/app/api/app/grupos/[id]/pedidos/[usuario]/route"
import { PUT as regras } from "web/app/api/app/grupos/[id]/regras/route"
import { DELETE as apagar } from "web/app/api/app/grupos/[id]/route"
import { autenticar, context, ID, mockClient, req, semSessao, USER } from "../grupos/apoio"

const outro = "20000000-0000-4000-8000-000000000002"
const alvo = { params: Promise.resolve({ id: ID, usuario: outro }) }
const casos = [
  {
    fn: regras,
    metodo: "PUT",
    corpo: { regras: "Respeito" },
    rpc: "set_group_rules",
    args: { p_group_id: ID, p_rules: "Respeito" },
  },
  {
    fn: aviso,
    metodo: "PUT",
    corpo: { nivel: "all" },
    rpc: "set_group_notify_level",
    args: { p_group_id: ID, p_level: "all" },
  },
  {
    fn: transferir,
    metodo: "POST",
    corpo: { para: outro },
    rpc: "transfer_group_ownership",
    args: { p_group_id: ID, p_new_owner_user_id: outro },
  },
  {
    fn: decidir,
    metodo: "POST",
    corpo: { decisao: "aprovar" },
    rpc: "approve_group_member",
    args: { p_group_id: ID, p_user_id: outro },
  },
  { fn: apagar, metodo: "DELETE", corpo: undefined, rpc: "delete_group", args: { p_group_id: ID } },
]
beforeEach(() => {
  vi.clearAllMocks()
  semSessao()
})
for (const caso of casos) {
  it(`${caso.rpc}: sessão, CSRF, entrada, autorização e sucesso`, async () => {
    expect((await caso.fn(req(caso.metodo, undefined, caso.corpo), alvo)).status).toBe(401)
    autenticar(mockClient())
    expect((await caso.fn(req(caso.metodo, undefined, caso.corpo, {}), alvo)).status).toBe(403)
    expect(
      (
        await caso.fn(req(caso.metodo, undefined, caso.corpo), {
          params: Promise.resolve({ id: "inválido", usuario: outro }),
        })
      ).status,
    ).toBe(400)
    autenticar(mockClient({ rpcErro: caso.rpc, codigo: "42501" }))
    expect((await caso.fn(req(caso.metodo, undefined, caso.corpo), alvo)).status).toBe(403)
    const mock = mockClient()
    autenticar(mock)
    expect((await caso.fn(req(caso.metodo, undefined, caso.corpo), alvo)).status).toBe(204)
    expect(mock.rpc).toHaveBeenCalledWith(caso.rpc, caso.args)
  })
}
it("remoção e recusa filtram o estado", async () => {
  for (const [fn, metodo, corpo, status] of [
    [remover, "DELETE", undefined, "approved"],
    [decidir, "POST", { decisao: "recusar" }, "pending"],
  ] as const) {
    semSessao()
    expect((await fn(req(metodo, undefined, corpo), alvo)).status).toBe(401)
    const mock = mockClient()
    autenticar(mock)
    expect((await fn(req(metodo, undefined, corpo, {}), alvo)).status).toBe(403)
    expect(
      (
        await fn(req(metodo, undefined, corpo), {
          params: Promise.resolve({ id: ID, usuario: "inválido" }),
        })
      ).status,
    ).toBe(400)
    expect((await fn(req(metodo, undefined, corpo), alvo)).status).toBe(204)
    expect(mock.chamadas).toContainEqual({
      tabela: "group_memberships",
      metodo: "eq",
      args: ["status", status],
    })
    autenticar(mockClient({ erroEscrita: "group_memberships", codigo: "42501" }))
    expect((await fn(req(metodo, undefined, corpo), alvo)).status).toBe(403)
  }
  expect(
    (await remover(req("DELETE"), { params: Promise.resolve({ id: ID, usuario: USER }) })).status,
  ).toBe(400)
})
it("lista membros apenas para administrador aprovado", async () => {
  expect((await membros(req(), context)).status).toBe(401)
  autenticar(mockClient())
  expect((await membros(req(), context)).status).toBe(403)
  expect((await membros(req(), { params: Promise.resolve({ id: "inválido" }) })).status).toBe(400)
  autenticar(mockClient({ membro: { user_id: USER, role: "moderator", status: "approved" } }))
  const resposta = await membros(req(), context)
  expect(await resposta.json()).toEqual({
    membros: [{ id: USER, nome: "Ana", papel: "moderator" }],
  })
})
it("valida corpos e traduz erros sem divulgar detalhes", async () => {
  autenticar(mockClient())
  for (const [fn, corpo] of [
    [regras, { regras: "a".repeat(601) }],
    [aviso, { nivel: "outro" }],
    [transferir, { para: "inválido" }],
    [decidir, { decisao: "talvez" }],
  ] as const) {
    expect((await fn(req("PUT", undefined, corpo), alvo)).status).toBe(400)
  }
  for (const [codigo, status] of [
    ["P0002", 404],
    ["23505", 409],
    ["XX000", 503],
  ] as const) {
    autenticar(mockClient({ rpcErro: "set_group_rules", codigo }))
    const resposta = await regras(req("PUT", undefined, { regras: "a" }), context)
    expect(resposta.status).toBe(status)
    expect(JSON.stringify(await resposta.json())).not.toContain("segredo-do-banco")
  }
})
