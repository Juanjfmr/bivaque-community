import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// RUN-020 (2), rodada de correção: o reenvio da tela antiga emitia token novo e
// enfileirava outro e-mail sem passar por barreira nenhuma — criar, revogar e
// reenviar furava o teto pelo mesmo buraco que o envio furava. Agora ele chama a
// mesma checagem do módulo: a janela atômica e a contagem do outbox valem para
// as duas portas.

const USER = "20000000-0000-4000-8000-000000000001"

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], setAll: () => {} })),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "20000000-0000-4000-8000-000000000001" } } }),
    },
  })),
}))

const estado = vi.hoisted(() => ({ recusando: false, enviadosRecentes: 0 }))

vi.mock("web/lib/limits", () => ({
  createLimiterStore: () => ({ record: async () => (estado.recusando ? 11 : 1) }),
}))

const banco = vi.hoisted(() => ({
  rpcs: [] as string[],
  enfileirados: [] as Record<string, unknown>[],
}))

vi.mock("web/lib/supabase/server", () => {
  // A contagem do limite consulta o outbox do titular.
  const consulta = {
    eq: () => consulta,
    contains: () => consulta,
    gte: async () => ({ count: estado.enviadosRecentes, error: null }),
  }
  return {
    createServerClient: vi.fn(() => ({
      rpc: async (nome: string) => {
        banco.rpcs.push(nome)
        return { data: null, error: null }
      },
      from: () => ({
        select: () => consulta,
        insert: async (valor: Record<string, unknown>) => {
          banco.enfileirados.push(valor)
          return { error: null }
        },
      }),
    })),
  }
})

import { resendFamilyInviteAction } from "web/app/(shell)/profile/family-invite-section-actions"
import { FalhaDeConvite } from "web/lib/convite/familia"

const CONVITE = "70000000-0000-4000-8000-000000000001"

function formulario() {
  const formData = new FormData()
  formData.set("invitationId", CONVITE)
  formData.set("email", "familiar@example.invalid")
  return formData
}

describe("reenvio do convite de família", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-de-teste")
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.invalid")
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token-de-teste")
    estado.recusando = false
    estado.enviadosRecentes = 0
    banco.rpcs = []
    banco.enfileirados = []
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("janela atômica cheia recusa antes de reemitir e enfileirar", async () => {
    estado.recusando = true
    const falha = await resendFamilyInviteAction(formulario()).catch((erro: unknown) => erro)
    expect(falha).toBeInstanceOf(FalhaDeConvite)
    expect((falha as FalhaDeConvite).motivo).toBe("limite")
    expect(banco.rpcs).not.toContain("resend_family_invitation")
    expect(banco.enfileirados).toHaveLength(0)
  })

  it("contagem do outbox em 10 também recusa o reenvio", async () => {
    estado.enviadosRecentes = 10
    const falha = await resendFamilyInviteAction(formulario()).catch((erro: unknown) => erro)
    expect(falha).toBeInstanceOf(FalhaDeConvite)
    expect((falha as FalhaDeConvite).motivo).toBe("limite")
    expect(banco.rpcs).not.toContain("resend_family_invitation")
    expect(banco.enfileirados).toHaveLength(0)
  })

  it("dentro do limite reemite e enfileira o mesmo tipo de envio", async () => {
    const resultado = await resendFamilyInviteAction(formulario())
    expect(resultado?.token).toHaveLength(64)
    expect(banco.rpcs).toContain("resend_family_invitation")
    expect(banco.enfileirados).toHaveLength(1)
    expect(banco.enfileirados[0]).toMatchObject({
      recipient: "familiar@example.invalid",
      type: "family_invite",
      payload: { user_id: USER, invitation_id: CONVITE, resent: true },
    })
  })
})
