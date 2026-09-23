// ADR-20260923-teto-de-pedidos-por-par: create_service_request recusa o sexto
// pedido em aberto do par com 54000. A action precisa traduzir esse código numa
// frase que diga a saída — sem isso a pessoa recebe o erro genérico "tente
// novamente" e reenvia o mesmo pedido, que será recusado de novo.
// Convenção de mock: interest-options-require-verification.test.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], setAll: () => {} })),
}))

const state = vi.hoisted(() => ({
  error: null as { code: string; message: string } | null,
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: async () => ({ data: { user: { id: "10000000-0000-4000-8000-000000000001" } } }),
    },
    rpc: async () =>
      state.error === null
        ? { data: "40000000-0000-4000-8000-000000000001", error: null }
        : { data: null, error: state.error },
  })),
}))

import { submitServiceRequest } from "web/app/(shell)/pedidos/novo/actions"

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
})

afterEach(() => {
  vi.unstubAllEnvs()
  state.error = null
})

function form(): FormData {
  const data = new FormData()
  data.set("providerId", "30000000-0000-4000-8000-000000000028")
  data.set("description", "Trocar a tomada da cozinha")
  data.set("when", "A combinar")
  data.set("idempotencyKey", "k-1")
  return data
}

describe("teto de pedidos em aberto por par", () => {
  it("o 54000 vira a frase com a saída, não o erro genérico", async () => {
    state.error = { code: "54000", message: "maximum 5 open service requests" }
    const result = await submitServiceRequest(form())
    expect(result).toEqual({
      status: "error",
      message:
        "Você já tem cinco pedidos em aberto com este prestador. Feche ou cancele um para enviar outro.",
    })
  })

  it("outra falha do banco continua no aviso genérico, que preserva o texto", async () => {
    state.error = { code: "42501", message: "blocked" }
    const result = await submitServiceRequest(form())
    expect(result.status).toBe("error")
    expect(result).toMatchObject({
      message: expect.stringContaining("Seu texto continua aqui"),
    })
  })

  it("sem erro, o pedido criado é devolvido", async () => {
    const result = await submitServiceRequest(form())
    expect(result).toEqual({
      status: "success",
      requestId: "40000000-0000-4000-8000-000000000001",
    })
  })
})
