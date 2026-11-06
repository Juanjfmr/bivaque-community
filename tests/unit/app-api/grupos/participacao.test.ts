import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { PUT as entrar, DELETE as sair } from "web/app/api/app/grupos/[id]/participacao/route"
import { lerMotivo } from "web/lib/communities/grupos"
import { autenticar, BASE, context, grupo, headers, ID, mockClient, req, semSessao } from "./apoio"

const url = BASE + "/" + ID + "/participacao"

describe("participação de grupo", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    semSessao()
  })
  it.each([
    ["entrar", entrar],
    ["sair", sair],
  ])("%s exige sessão", async (_, chamar) => {
    expect((await chamar(req("PUT", url, {}), context)).status).toBe(401)
  })
  it.each([
    ["origem", { ...headers, origin: "https://fora.example.invalid" }],
    ["cabeçalho", { origin: headers.origin, "content-type": "application/json" }],
  ])("ambas as escritas recusam %s inválido", async (_, cabecalhos) => {
    const mock = mockClient()
    autenticar(mock)
    expect((await entrar(req("PUT", url, {}, cabecalhos), context)).status).toBe(403)
    expect((await sair(req("DELETE", url, undefined, cabecalhos), context)).status).toBe(403)
    expect(mock.from).not.toHaveBeenCalled()
  })
  it("entrar usa RPC atômica sem aceitar usuário, papel ou status do corpo", async () => {
    const mock = mockClient()
    autenticar(mock)
    const r = await entrar(
      req("PUT", url, {
        motivo: "  Moro com minha família na cidade.  ",
        user_id: "outra",
        role: "owner",
        status: "approved",
      }),
      context,
    )
    expect(r.status).toBe(200)
    expect(mock.rpc).toHaveBeenCalledWith("join_group", {
      p_group_id: ID,
      p_reason: "Moro com minha família na cidade.",
    })
    expect((await r.json()).grupo.membro).toBe(true)
  })
  it("pedido fechado retorna participação pendente gravada", async () => {
    const mock = mockClient({
      grupo: { ...grupo, visibility: "private" },
      membro: { group_id: ID, status: "pending", role: "member" },
    })
    autenticar(mock)
    const r = await entrar(req("PUT", url, { motivo: "Sou responsável por um aluno." }), context)
    expect(r.status).toBe(200)
    expect((await r.json()).grupo).toMatchObject({ pendente: true, membro: false })
  })
  it.each([5, null, "a".repeat(301)])("motivo inválido é 400", async (motivo) => {
    const mock = mockClient()
    autenticar(mock)
    expect((await entrar(req("PUT", url, { motivo }), context)).status).toBe(400)
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it("corpo não JSON é recusado", async () => {
    const mock = mockClient()
    autenticar(mock)
    expect(
      (await entrar(req("PUT", url, {}, { ...headers, "content-type": "text/plain" }), context))
        .status,
    ).toBe(400)
  })
  it("grupo inexistente é 404 em ambas as escritas", async () => {
    const mock = mockClient({ grupo: null })
    autenticar(mock)
    expect((await entrar(req("PUT", url, {}), context)).status).toBe(404)
    expect((await sair(req("DELETE", url), context)).status).toBe(404)
  })
  it("cidade do grupo diverge da sessão: recusa sem executar RPC", async () => {
    const mock = mockClient({ grupo: { ...grupo, locality_id: "outra-cidade" } })
    autenticar(mock)
    expect((await entrar(req("PUT", url, {}), context)).status).toBe(403)
    expect(mock.rpc).not.toHaveBeenCalled()
  })
  it.each([
    ["42501", 403],
    ["54000", 429],
    ["XX000", 503],
  ])("erro %s é traduzido para %s sem eco", async (codigo, status) => {
    const mock = mockClient({ rpcErro: "join_group", codigo })
    autenticar(mock)
    const r = await entrar(req("PUT", url, {}), context)
    expect(r.status).toBe(status)
    expect(JSON.stringify(await r.json())).not.toContain("segredo-do-banco")
  })
  it("cancelar ou sair só apaga a participação da sessão", async () => {
    const mock = mockClient({ grupo: { ...grupo, owner_user_id: "outro" }, membro: null })
    autenticar(mock)
    const r = await sair(req("DELETE", url), context)
    expect(r.status).toBe(200)
    expect(mock.chamadas).toContainEqual({
      tabela: "group_memberships",
      metodo: "delete",
      args: [],
    })
    expect(mock.chamadas).toContainEqual({
      tabela: "group_memberships",
      metodo: "eq",
      args: ["user_id", "20000000-0000-4000-8000-000000000001"],
    })
    expect((await r.json()).grupo).toMatchObject({ membro: false, pendente: false })
  })
  it("administrador precisa transferir antes de sair", async () => {
    const mock = mockClient()
    autenticar(mock)
    expect((await sair(req("DELETE", url), context)).status).toBe(409)
    expect(mock.chamadas.some((c) => c.metodo === "delete")).toBe(false)
  })
  it("falha do banco ao cancelar é 503", async () => {
    const mock = mockClient({
      grupo: { ...grupo, owner_user_id: "outro" },
      erro: "group_memberships",
    })
    autenticar(mock)
    expect((await sair(req("DELETE", url), context)).status).toBe(503)
  })
  it("validação compartilhada mantém motivo opcional, aparado e limitado", () => {
    expect(lerMotivo(undefined)).toBe("")
    expect(lerMotivo("  olá  ")).toBe("olá")
    expect(lerMotivo("a".repeat(301))).toBeNull()
    expect(lerMotivo(false)).toBeNull()
  })
})
