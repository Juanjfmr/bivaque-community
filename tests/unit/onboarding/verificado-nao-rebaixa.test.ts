import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

// SEC-007: quem já está verificado não é rebaixado pela consulta de CPF, nas
// DUAS portas — `/api/onboarding` (web) e `/api/app/entry/cpf` (app) —, porque as
// duas passam pelo mesmo módulo (`verifyEligibility`). Aqui o módulo é o real; só
// o banco (cliente de serviço), a sessão e o Portal são trocados.

vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))
vi.mock("web/lib/app-api/sessao-do-next", () => ({ resolverSessaoDaRequisicao: vi.fn() }))

import { POST as ROTA_DO_APP } from "web/app/api/app/entry/cpf/route"
import { POST as ROTA_DA_WEB } from "web/app/api/onboarding/route"
import { resolverSessaoDaRequisicao } from "web/lib/app-api/sessao-do-next"
import { createServerClient } from "web/lib/supabase/server"

const criarCliente = vi.mocked(createServerClient)
const resolver = vi.mocked(resolverSessaoDaRequisicao)

const PESSOA = { id: "10000000-0000-4000-8000-000000000001", email: "pessoa@example.invalid" }
const CPF_VALIDO = "52998224725"
const ORIGEM = "http://localhost:3000"

const mockRpc = vi.fn()
const mockPortal = vi.fn()

function banco(status: string, classe: string | null) {
  mockRpc.mockImplementation(async (nome: string) => {
    if (nome === "has_accepted_consent") return { data: true, error: null }
    if (nome === "read_verification_status") {
      return {
        data: [{ status, eligibility_class: classe, checked_at: null, updated_at: null }],
        error: null,
      }
    }
    if (nome === "consume_verification_attempt") return { data: true, error: null }
    return { data: null, error: null }
  })
}

function gravacoes() {
  return mockRpc.mock.calls.filter(
    ([nome]) => nome === "upsert_verification_outcome" || nome === "consume_verification_attempt",
  )
}

function viaWeb() {
  return ROTA_DA_WEB(
    new Request(`${ORIGEM}/api/onboarding`, {
      method: "POST",
      headers: { authorization: "Bearer token-valido", "content-type": "application/json" },
      body: JSON.stringify({ action: "verify-cpf", cpf: CPF_VALIDO }),
    }),
  )
}

function viaApp() {
  return ROTA_DO_APP(
    new NextRequest(`${ORIGEM}/app/api/app/entry/cpf`, {
      method: "POST",
      headers: {
        origin: ORIGEM,
        "x-bivaque-app": "bivaque-spa",
        "content-type": "application/json",
      },
      body: JSON.stringify({ cpf: CPF_VALIDO }),
    }),
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("BIVAQUE_APP_ORIGINS", "")
  vi.stubEnv("PORTAL_DADOS_API_KEY", "chave-valida")
  vi.stubGlobal("fetch", mockPortal)
  mockPortal.mockResolvedValue(new Response("[]", { status: 200 }))
  criarCliente.mockReturnValue({
    rpc: mockRpc,
    from: vi.fn(),
    auth: { getUser: async () => ({ data: { user: { id: PESSOA.id } }, error: null }) },
  } as never)
  resolver.mockResolvedValue({
    estado: "autenticada",
    via: "cookie",
    usuario: PESSOA,
    cliente: {},
    cabecalhos: {},
  } as never)
})

describe.each([
  ["rota da web (/api/onboarding)", viaWeb],
  ["rota do app (/api/app/entry/cpf)", viaApp],
])("verificado não é rebaixado — %s", (_nome, consultar) => {
  it("devolve verificado, sem Portal, sem tentativa e sem regravar", async () => {
    banco("verified", "veteran")

    const resposta = await consultar()

    expect(resposta.status).toBe(200)
    expect(await resposta.json()).toEqual({
      outcome: { status: "verified", eligibilityClass: "veteran" },
    })
    expect(mockPortal).not.toHaveBeenCalled()
    expect(gravacoes()).toEqual([])
  })

  it("sem a chave do Portal o verificado continua verificado", async () => {
    vi.stubEnv("PORTAL_DADOS_API_KEY", "")
    banco("verified", "military_pensioner")

    const corpo = (await (await consultar()).json()) as { outcome: { status: string } }

    expect(corpo.outcome.status).toBe("verified")
    expect(gravacoes()).toEqual([])
  })

  it("quem não está verificado ainda consulta e grava (o caminho normal não mudou)", async () => {
    banco("rejected", null)

    const resposta = await consultar()

    expect(resposta.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledWith("consume_verification_attempt", { p_user_id: PESSOA.id })
    expect(mockRpc).toHaveBeenCalledWith(
      "upsert_verification_outcome",
      expect.objectContaining({ p_user_id: PESSOA.id }),
    )
  })
})
