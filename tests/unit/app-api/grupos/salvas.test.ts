import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { OPTIONS, GET as salvas } from "web/app/api/app/grupos/salvas/route"
import { autenticar, BASE, mockClient, post, req, semSessao, USER } from "./apoio"

const URL_DAS_SALVAS = `${BASE}/salvas`

describe("grupos — publicações salvas sob RLS", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    semSessao()
  })
  it("exige sessão", async () => {
    expect((await salvas(req("GET", URL_DAS_SALVAS))).status).toBe(401)
  })
  it("lista os salvos do próprio membro e devolve o apresentado para a tela", async () => {
    const mock = mockClient({ salvas: true })
    autenticar(mock)
    const r = await salvas(req("GET", URL_DAS_SALVAS))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({
      publicacoes: [{ id: post.id, texto: post.content, autor: "Ana", salva: true }],
    })
    expect(mock.chamadas).toContainEqual({
      tabela: "post_saves",
      metodo: "eq",
      args: ["user_id", USER],
    })
  })
  it("sem salvos devolve vazio sem consultar publicações", async () => {
    const mock = mockClient()
    autenticar(mock)
    const r = await salvas(req("GET", URL_DAS_SALVAS))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ publicacoes: [] })
    expect(mock.chamadas.some((chamada) => chamada.tabela === "posts")).toBe(false)
  })
  it("publicação que a sessão não pode mais ler sai da lista, sem derrubar a leitura", async () => {
    const mock = mockClient({ salvas: true, posts: [] })
    autenticar(mock)
    const r = await salvas(req("GET", URL_DAS_SALVAS))
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ publicacoes: [] })
  })
  it("falha de leitura é 503 sem vazar detalhe do banco", async () => {
    const mock = mockClient({ salvas: true, erro: "post_saves" })
    autenticar(mock)
    const r = await salvas(req("GET", URL_DAS_SALVAS))
    expect(r.status).toBe(503)
    expect(JSON.stringify(await r.json())).not.toContain("segredo-do-banco")
  })
  it("responde ao preflight do app", () => {
    expect(OPTIONS(req("OPTIONS", URL_DAS_SALVAS)).status).toBe(204)
  })
})
