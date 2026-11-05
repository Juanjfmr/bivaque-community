import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Aceite do convite familiar pelo app (RUN-002). A rota não cria conta: a
// sessão já nasceu no código de e-mail, o e-mail vem dela, e o banco confere o
// convite contra esse e-mail na mesma transação. O teste troca a sessão, o
// cliente de serviço e as funções de convite, e prova as recusas e o caminho
// feliz sem tocar em banco de verdade.

vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))
vi.mock("web/lib/convite/provision", () => ({
  previewFamilyInviteCode: vi.fn(),
  acceptFamilyInviteCode: vi.fn(),
}))

import { POST } from "web/app/api/app/entry/invite/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { acceptFamilyInviteCode, previewFamilyInviteCode } from "web/lib/convite/provision"
import { createServerClient } from "web/lib/supabase/server"

const resolver = vi.mocked(resolverSessaoDaRequisicao)
const criarCliente = vi.mocked(createServerClient)
const prever = vi.mocked(previewFamilyInviteCode)
const aceitar = vi.mocked(acceptFamilyInviteCode)

const PESSOA = {
  id: "10000000-0000-4000-8000-000000000001",
  email: "pessoa@example.invalid",
  appMetadata: {},
}
const ORIGEM = "http://localhost:3000"
const URL_DA_ROTA = `${ORIGEM}/app/api/app/entry/invite`
const CABECALHO = "bivaque-spa"

const consultarConsentimento = vi.fn()
const servico = {
  from: (tabela: string) => {
    if (tabela !== "consent_acceptances") throw new Error(`tabela inesperada: ${tabela}`)
    return { select: () => ({ eq: consultarConsentimento }) }
  },
  rpc: vi.fn(),
}

function sessaoAutenticada() {
  return {
    estado: "autenticada",
    via: "cookie",
    usuario: PESSOA,
    cliente: {},
    cabecalhos: {},
  }
}

function requisicao(opcoes: { origem?: string; cabecalho?: string; corpo?: unknown } = {}) {
  const headers: Record<string, string> = {
    origin: opcoes.origem ?? ORIGEM,
    "content-type": "application/json",
  }
  if (opcoes.cabecalho !== undefined) headers["x-bivaque-app"] = opcoes.cabecalho
  return new NextRequest(URL_DA_ROTA, {
    method: "POST",
    headers,
    body: JSON.stringify(opcoes.corpo ?? { codigo: "ABCD-EFGH", nome: "Ana Souza" }),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  consultarConsentimento.mockResolvedValue({ count: 1, error: null })
  criarCliente.mockReturnValue(servico as never)
  resolver.mockResolvedValue(sessaoAutenticada() as never)
  prever.mockResolvedValue({
    status: "ok",
    expiresAt: "2026-11-20T12:00:00.000Z",
    inviteeEmailHint: "p***a@example.invalid",
    inviterName: "Maria Souza",
  })
  aceitar.mockResolvedValue({
    status: "ok",
    linkId: "50000000-0000-4000-8000-000000000001",
    localityMember: true,
  })
})

describe("POST /api/app/entry/invite", () => {
  it("sem sessão responde 401 e não lê o corpo", async () => {
    resolver.mockResolvedValue({
      estado: "recusada",
      sessao: { estado: "recusada", motivo: "sem-credencial" },
    } as never)

    const resposta = await POST(requisicao({ cabecalho: CABECALHO }))

    expect(resposta.status).toBe(401)
    expect(await resposta.json()).toEqual({ autenticado: false, motivo: "sem-credencial" })
    expect(prever).not.toHaveBeenCalled()
  })

  it("recusa origem fora da lista", async () => {
    const resposta = await POST(requisicao({ origem: "https://mal.example", cabecalho: CABECALHO }))

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "origem-recusada" })
    expect(prever).not.toHaveBeenCalled()
  })

  it("recusa sem o cabeçalho do app", async () => {
    const resposta = await POST(requisicao({ cabecalho: undefined }))

    expect(resposta.status).toBe(403)
    expect(await resposta.json()).toEqual({ erro: "cabecalho-ausente" })
  })

  it("recusa código fora do formato antes de consultar o banco", async () => {
    const resposta = await POST(
      requisicao({ cabecalho: CABECALHO, corpo: { codigo: "ABC", nome: "Ana Souza" } }),
    )

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "convite-invalido" })
    expect(prever).not.toHaveBeenCalled()
  })

  it("recusa nome vazio ou de uma letra", async () => {
    const resposta = await POST(
      requisicao({ cabecalho: CABECALHO, corpo: { codigo: "ABCD-EFGH", nome: " A " } }),
    )

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "nome-invalido" })
  })

  it("exige o aceite dos textos antes de criar o vínculo", async () => {
    consultarConsentimento.mockResolvedValue({ count: 0, error: null })

    const resposta = await POST(requisicao({ cabecalho: CABECALHO }))

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "consentimento-pendente" })
    expect(prever).not.toHaveBeenCalled()
  })

  it("responde 429 quando o banco limita as tentativas", async () => {
    prever.mockResolvedValue({ status: "rate_limited" })

    const resposta = await POST(requisicao({ cabecalho: CABECALHO }))

    expect(resposta.status).toBe(429)
    expect(await resposta.json()).toEqual({ erro: "convite-limite" })
    expect(aceitar).not.toHaveBeenCalled()
  })

  it("responde a mesma mensagem para código vencido, usado ou de outro e-mail", async () => {
    prever.mockResolvedValue({ status: "unavailable" })

    const resposta = await POST(requisicao({ cabecalho: CABECALHO }))

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "convite-invalido" })
    expect(aceitar).not.toHaveBeenCalled()
  })

  it("responde 429 quando o limite aparece no aceite", async () => {
    aceitar.mockResolvedValue({ status: "rate_limited" })

    const resposta = await POST(requisicao({ cabecalho: CABECALHO }))

    expect(resposta.status).toBe(429)
    expect(await resposta.json()).toEqual({ erro: "convite-limite" })
  })

  it("aceita com o e-mail da sessão, o nome normalizado e os hashes do banco", async () => {
    const resposta = await POST(
      requisicao({
        cabecalho: CABECALHO,
        corpo: { codigo: "abcd efgh", nome: "  Ana   Souza  " },
      }),
    )

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({ localityMember: true })
    expect(prever).toHaveBeenCalledWith(
      servico,
      expect.objectContaining({
        codeHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        emailDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
        originDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    )
    expect(aceitar).toHaveBeenCalledWith(servico, {
      codeHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      displayName: "Ana Souza",
      originDigest: expect.stringMatching(/^[0-9a-f]{64}$/),
      userId: PESSOA.id,
    })
  })

  it("traduz o erro de nome do banco sem vazar detalhe", async () => {
    const erro = new Error("nome inválido") as Error & { code: string }
    erro.code = "22023"
    aceitar.mockRejectedValue(erro)

    const resposta = await POST(requisicao({ cabecalho: CABECALHO }))

    expect(resposta.status).toBe(400)
    expect(await resposta.json()).toEqual({ erro: "nome-invalido" })
  })

  it("responde 503 quando a infraestrutura falha", async () => {
    aceitar.mockRejectedValue(new Error("connection reset"))

    const resposta = await POST(requisicao({ cabecalho: CABECALHO }))

    expect(resposta.status).toBe(503)
    expect(await resposta.json()).toEqual({ erro: "convite-indisponivel" })
  })
})
