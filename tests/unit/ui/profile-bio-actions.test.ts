// Prova da face de escrita da bio: a validação corre antes de qualquer
// escrita, esvaziar grava nulo (D3), e o erro do banco nunca vira sucesso
// silencioso. Convenção de mock de cliente: profile-affiliation-actions.test.ts.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], setAll: () => {} })),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { saveBioAction } from "web/app/(shell)/profile/bio-actions"

const USER_ID = "10000000-0000-4000-8000-000000000001"

const results = vi.hoisted(() => ({
  rpc: { data: null as unknown, error: null as unknown },
  getUser: { data: { user: { id: "10000000-0000-4000-8000-000000000001" } } },
}))
const calls = vi.hoisted(() => ({
  rpc: [] as Array<{ name: string; args: unknown }>,
}))

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  results.rpc = { data: null, error: null }
  results.getUser = { data: { user: { id: USER_ID } } }
  calls.rpc = []

  const client = {
    auth: { getUser: vi.fn(async () => results.getUser) },
    rpc: vi.fn(async (name: string, args: unknown) => {
      calls.rpc.push({ name, args })
      return results.rpc
    }),
  }

  ;(createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(client)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe("salvar — texto aparado vai para a RPC, esvaziar grava nulo", () => {
  it("grava o texto aparado e revalida o perfil (positivo)", async () => {
    await saveBioAction("  Apaixonado por trilhas.  ")
    expect(calls.rpc).toEqual([
      { name: "set_profile_bio", args: { p_bio: "Apaixonado por trilhas." } },
    ])
    expect(revalidatePath).toHaveBeenCalledWith("/profile")
  })

  it("esvaziar manda nulo — apagar apaga (D3)", async () => {
    await saveBioAction("   ")
    expect(calls.rpc).toEqual([{ name: "set_profile_bio", args: { p_bio: null } }])
  })
})

describe("validação antes da escrita — nada toca o banco quando recusa", () => {
  it("acima de 300 caracteres recusa (negativo)", async () => {
    await expect(saveBioAction("a".repeat(301))).rejects.toThrow(/no máximo 300 caracteres/)
    expect(calls.rpc).toEqual([])
  })

  it("CPF recusa (negativo)", async () => {
    await expect(saveBioAction("Meu CPF é 529.982.247-25")).rejects.toThrow(/CPF/)
    expect(calls.rpc).toEqual([])
  })
})

describe("sessão e erro do banco nunca viram sucesso silencioso", () => {
  it("sem usuário na sessão: erro recuperável, nenhuma escrita", async () => {
    results.getUser = { data: { user: null } }
    await expect(saveBioAction("texto")).rejects.toThrow(/sessão/i)
    expect(calls.rpc).toEqual([])
  })

  it("check do banco (23514) vira mensagem recuperável, não sucesso", async () => {
    results.rpc = { data: null, error: { code: "23514", message: "check constraint failed" } }
    await expect(saveBioAction("texto")).rejects.toThrow(/não podemos publicar/)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("perfil ausente (P0002) tem mensagem própria — não é silêncio", async () => {
    results.rpc = { data: null, error: { code: "P0002", message: "profile not found" } }
    await expect(saveBioAction("texto")).rejects.toThrow(/não encontramos seu perfil/i)
  })

  it("erro desconhecido aparece como falha genérica, nunca silêncio", async () => {
    results.rpc = { data: null, error: { code: "99999", message: "connection reset" } }
    await expect(saveBioAction("texto")).rejects.toThrow(
      "Não foi possível salvar a apresentação. Tente novamente.",
    )
  })
})
