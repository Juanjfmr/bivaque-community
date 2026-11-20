import { createHash } from "node:crypto"
import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { POST as criar } from "web/app/api/app/comunidades/[id]/convites/route"
import { POST as aceitar } from "web/app/api/app/convites/[token]/aceitar/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const rpc = vi.fn()
const id = "60000000-0000-4000-8000-000000000001"
const token = "ab".repeat(32)
const digest = `\\x${createHash("sha256").update(Buffer.from(token, "hex")).digest("hex")}`
const criarContexto = { params: Promise.resolve({ id }) }
const aceitarContexto = { params: Promise.resolve({ token }) }
function pedido(origem = "http://localhost:3000", cabecalho = true) {
  return new NextRequest("http://localhost:3000/api/app/convites", {
    method: "POST",
    headers: { origin: origem, ...(cabecalho ? { "x-bivaque-app": "bivaque-spa" } : {}) },
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: { id },
    cliente: { rpc },
    cabecalhos: {},
  } as never)
  rpc.mockResolvedValue({ data: id, error: null })
})
describe("convites do app", () => {
  it("cria com digest e devolve link e expiração", async () => {
    const resposta = await criar(pedido(), criarContexto)
    expect(resposta.status).toBe(201)
    const corpo = await resposta.json()
    const gerado = corpo.link.replace("/invite/", "")
    expect(gerado).toMatch(/^[0-9a-f]{64}$/)
    expect(Date.parse(corpo.expiraEm)).toBeGreaterThan(Date.now())
    expect(rpc).toHaveBeenCalledWith("create_community_invitation_for_app", {
      p_community_id: id,
      p_token_digest: `\\x${createHash("sha256").update(Buffer.from(gerado, "hex")).digest("hex")}`,
      p_expires_at: corpo.expiraEm,
    })
  })
  it("aceita pelo digest", async () => {
    const resposta = await aceitar(pedido(), aceitarContexto)
    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ communityId: id })
    expect(rpc).toHaveBeenCalledWith("accept_community_invitation_for_app", {
      p_token_digest: digest,
    })
  })
  for (const rota of [
    () => criar(pedido(), criarContexto),
    () => aceitar(pedido(), aceitarContexto),
  ]) {
    it("recusa sessão ausente", async () => {
      resolver.mockResolvedValue({
        estado: "recusada",
        sessao: { motivo: "sem-credencial" },
      } as never)
      const resposta = await rota()
      expect(resposta.status).toBe(401)
      expect(await resposta.json()).toMatchObject({
        erro: expect.any(String),
        mensagem: expect.any(String),
      })
      expect(rpc).not.toHaveBeenCalled()
    })
  }
  for (const [nome, rota] of [
    ["criação", (req: NextRequest) => criar(req, criarContexto)],
    ["aceite", (req: NextRequest) => aceitar(req, aceitarContexto)],
  ] as const) {
    it.each([
      ["cabeçalho ausente", pedido("http://localhost:3000", false)],
      ["origem recusada", pedido("https://malicioso.invalid")],
    ])("%s bloqueia %s", async (_caso, req) => {
      const resposta = await rota(req)
      expect(resposta.status).toBe(403)
      expect(await resposta.json()).toMatchObject({
        erro: expect.any(String),
        mensagem: expect.any(String),
      })
      expect(rpc).not.toHaveBeenCalled()
    })
    it.each([
      ["42501", 403],
      ["P0002", 404],
      ["P0003", 409],
      ["P0004", 410],
      ["P0005", 429],
      ["XX000", 503],
    ])(`${nome} mapeia %s`, async (code, status) => {
      rpc.mockResolvedValue({ data: null, error: { code, message: "detalhe privado" } })
      const resposta = await rota(pedido())
      expect(resposta.status).toBe(status)
      expect(await resposta.json()).toMatchObject({
        erro: expect.any(String),
        mensagem: expect.any(String),
      })
    })
  }
  it("recusa token malformado sem consultar o banco", async () => {
    const resposta = await aceitar(pedido(), { params: Promise.resolve({ token: "abzz" }) })
    expect(resposta.status).toBe(404)
    expect(rpc).not.toHaveBeenCalled()
  })
})
