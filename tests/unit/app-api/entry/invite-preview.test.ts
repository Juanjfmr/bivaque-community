import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// RUN-135, achado (c): a prévia do convite devolvia o destinatário completo do
// outbox para qualquer pessoa que soubesse o código. O código é credencial, mas
// não prova ser o destinatário — e o endereço pode ser de outra pessoa. Agora:
//
// - sem sessão: só `inviterName` e `emailHint` (mascarado); `email` é `null`;
// - com sessão: `email` é o endereço da SESSÃO, nunca o do corpo nem o do
//   outbox.
//
// Este arquivo prova os dois caminhos de resposta; o teste legado
// (`entrada-convite-preview.test.ts`) guarda os caminhos de erro.

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
const CODIGO = "BVQ7K2MA"
const DICA = "f***a@example.invalid"

function requisicao(corpo: Record<string, unknown> = { codigo: CODIGO }) {
  return new NextRequest(URL_DA_ROTA, {
    method: "POST",
    headers: {
      origin: ORIGEM,
      "content-type": "application/json",
      "x-bivaque-app": "bivaque-spa",
    },
    body: JSON.stringify(corpo),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  criarCliente.mockReturnValue({
    from: () => {
      throw new Error("a prévia não deve ler o outbox para descobrir o endereço")
    },
  } as never)
  resolver.mockResolvedValue({
    estado: "recusada",
    sessao: { estado: "recusada", motivo: "sem-credencial" },
  } as never)
  prever.mockResolvedValue({
    status: "ok",
    expiresAt: "2026-11-20T12:00:00.000Z",
    inviteeEmailHint: DICA,
    inviterName: "Maria Souza",
  })
})

describe("prévia do convite — o endereço nunca vem do outbox", () => {
  it("sem sessão devolve só o nome e a dica; email é null", async () => {
    const resposta = await POST(requisicao({ codigo: CODIGO, email: "declarado@example.invalid" }))

    expect(resposta.status).toBe(200)
    const corpo = (await resposta.json()) as Record<string, unknown>
    expect(corpo).toEqual({
      inviterName: "Maria Souza",
      email: null,
      emailHint: DICA,
    })
    expect(JSON.stringify(corpo)).not.toContain("declarado@example.invalid")
  })

  it("com sessão devolve o e-mail DA SESSÃO, não o do corpo", async () => {
    resolver.mockResolvedValue({
      estado: "autenticada",
      via: "cookie",
      usuario: { id: "pessoa", email: "Pessoa@Example.INVALID", appMetadata: {} },
      cliente: {},
      cabecalhos: {},
    } as never)

    const resposta = await POST(requisicao({ codigo: CODIGO, email: "outra@example.invalid" }))

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      inviterName: "Maria Souza",
      email: "pessoa@example.invalid",
      emailHint: DICA,
    })
  })

  it("sessão indisponível não vira 503: a prévia segue como visitante", async () => {
    resolver.mockResolvedValue({ estado: "indisponivel" } as never)

    const resposta = await POST(requisicao())

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      inviterName: "Maria Souza",
      email: null,
      emailHint: DICA,
    })
  })
})
