import { NextRequest } from "next/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// A prévia do convite valida o código antes de qualquer envio de e-mail (o envio
// cria conta) e devolve o nome de quem convidou e, no máximo, a dica mascarada
// do endereço. Quem chega sem sessão NUNCA recebe o destinatário completo — o
// endereço é da pessoa que está falando com a rota, não do convite (RUN-135).

vi.mock("web/lib/convite/provision", () => ({ previewFamilyInviteCode: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))
vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST } from "web/app/api/app/entry/invite/preview/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { previewFamilyInviteCode } from "web/lib/convite/provision"
import { createServerClient } from "web/lib/supabase/server"

const prever = vi.mocked(previewFamilyInviteCode)
const criarCliente = vi.mocked(createServerClient)
const resolver = vi.mocked(resolverSessaoDaRequisicao)

const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/app/api/app/entry/invite/preview`
const CABECALHO = "bivaque-spa"
const CODIGO = "BVQ7K2MA"

function clienteDeServico() {
  return {
    from: () => {
      // A prévia não consulta tabela nenhuma para achar o endereço: o
      // destinatário do outbox nunca é fonte da resposta.
      throw new Error("a prévia do convite não deve consultar tabelas")
    },
  }
}

function requisicao(opcoes: { cabecalho?: string; origem?: string; corpo?: unknown } = {}) {
  const headers: Record<string, string> = {
    origin: opcoes.origem ?? ORIGEM,
    "content-type": "application/json",
  }
  if (opcoes.cabecalho !== undefined) headers["x-bivaque-app"] = opcoes.cabecalho
  return new NextRequest(URL_DA_ROTA, {
    method: "POST",
    headers,
    body: JSON.stringify(opcoes.corpo ?? { codigo: CODIGO }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  criarCliente.mockReturnValue(clienteDeServico() as never)
  resolver.mockResolvedValue({
    estado: "recusada",
    sessao: { estado: "recusada", motivo: "sem-credencial" },
  } as never)
  prever.mockResolvedValue({
    status: "ok",
    expiresAt: "2026-11-20T12:00:00.000Z",
    inviteeEmailHint: "f***a@example.invalid",
    inviterName: "Maria Souza",
  })
})

afterEach(() => vi.unstubAllEnvs())

describe("POST /api/app/entry/invite/preview", () => {
  it("sem o cabeçalho do app ou com origem fora da lista não valida nada", async () => {
    const semCabecalho = await POST(requisicao())
    expect(semCabecalho.status).toBe(403)
    const origemRuim = await POST(
      requisicao({ cabecalho: CABECALHO, origem: "https://evil.example.invalid" }),
    )
    expect(origemRuim.status).toBe(403)
    expect(prever).not.toHaveBeenCalled()
  })

  it("sem o segredo do limitador responde 503, não 500", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("BIVAQUE_LIMITER_PEPPER", "")

    const resposta = await POST(requisicao({ cabecalho: CABECALHO }))

    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "indisponivel" })
    expect(prever).not.toHaveBeenCalled()
  })

  it("código fora da forma é 400 sem falar com o banco", async () => {
    const resposta = await POST(requisicao({ cabecalho: CABECALHO, corpo: { codigo: "ABC" } }))
    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "convite-invalido" })
    expect(prever).not.toHaveBeenCalled()
  })

  it("sem sessão devolve só a dica, nunca o destinatário completo", async () => {
    const resposta = await POST(requisicao({ cabecalho: CABECALHO }))
    expect(resposta.status).toBe(200)

    const corpo = await resposta.json()
    expect(corpo).toEqual({
      inviterName: "Maria Souza",
      email: null,
      emailHint: "f***a@example.invalid",
    })
    // Nem o endereço sintético do "outbox", nem qualquer endereço completo.
    expect(JSON.stringify(corpo)).not.toContain("familia@example.invalid")
  })

  it("com sessão devolve o e-mail da sessão, não o do corpo", async () => {
    resolver.mockResolvedValue({
      estado: "autenticada",
      via: "cookie",
      usuario: { id: "pessoa", email: "Pessoa@Example.INVALID", appMetadata: {} },
      cliente: {},
      cabecalhos: {},
    } as never)

    const resposta = await POST(
      requisicao({
        cabecalho: CABECALHO,
        corpo: { codigo: CODIGO, email: "outra@example.invalid" },
      }),
    )

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      inviterName: "Maria Souza",
      email: "pessoa@example.invalid",
      emailHint: "f***a@example.invalid",
    })
  })

  it("limite de tentativas vira 429 e indisponível vira 503, sem revelar endereço", async () => {
    prever.mockResolvedValueOnce({ status: "rate_limited" })
    expect((await POST(requisicao({ cabecalho: CABECALHO }))).status).toBe(429)

    prever.mockRejectedValueOnce(new Error("boom"))
    const indisponivel = await POST(requisicao({ cabecalho: CABECALHO }))
    expect(indisponivel.status).toBe(503)
    expect(await indisponivel.json()).toEqual({ erro: "convite-indisponivel" })
  })

  it("convite indisponível e e-mail de outro convite são 400 sem revelar endereço", async () => {
    prever.mockResolvedValueOnce({ status: "unavailable" })
    const invalido = await POST(requisicao({ cabecalho: CABECALHO }))
    expect(invalido.status).toBe(400)
    expect(await invalido.json()).toEqual({ erro: "convite-invalido" })

    prever.mockResolvedValueOnce({ status: "email_mismatch" })
    const outro = await POST(requisicao({ cabecalho: CABECALHO }))
    expect(outro.status).toBe(400)
    expect(await outro.json()).toEqual({ erro: "email-nao-confere" })
  })
})
