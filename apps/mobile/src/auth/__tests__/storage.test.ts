// Testes do storage wrapper (apps/mobile/src/auth/storage.ts).
//
// Cobre o que o ADR-20260901-mobile-session §Acceptance exige:
//   - storage guarda (positivo)
//   - storage corrompido -> re-login (negativo)
//   - clear remove (positivo)
//   - shape de validacao: campos faltando -> null (negativo)

import { beforeEach, describe, expect, it, vi } from "vitest"

const STORE = new Map<string, string>()

vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => STORE.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    STORE.set(key, value)
  },
  deleteItemAsync: async (key: string) => {
    STORE.delete(key)
  },
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 0,
}))

import { clearSession, loadSession, type StoredSession, saveSession } from "../storage"

const validSession: StoredSession = {
  access_token: "eyJhbGciOiJIUzI1NiJ9.fake",
  refresh_token: "v1.fake-refresh",
  expires_at: 1_900_000_000,
  user_id: "00000000-0000-4000-8000-000000000001",
  locality_id: "00000000-0000-4000-8000-00000000000a",
}

describe("storage.saveSession", () => {
  beforeEach(() => STORE.clear())

  it("guarda uma sessao valida", async () => {
    await saveSession(validSession)
    const raw = STORE.get("bivaque.session.v1")
    expect(raw).toBeDefined()
    const parsed = JSON.parse(raw as string)
    expect(parsed.access_token).toBe("eyJhbGciOiJIUzI1NiJ9.fake")
  })
})

describe("storage.loadSession", () => {
  beforeEach(() => STORE.clear())

  it("retorna null quando nao ha sessao", async () => {
    const result = await loadSession()
    expect(result).toBeNull()
  })

  it("retorna sessao guardada", async () => {
    await saveSession(validSession)
    const result = await loadSession()
    expect(result).toEqual(validSession)
  })

  it("retorna null e limpa storage quando JSON e invalido", async () => {
    STORE.set("bivaque.session.v1", "not-json")
    const result = await loadSession()
    expect(result).toBeNull()
    expect(STORE.has("bivaque.session.v1")).toBe(false)
  })

  it("retorna null e limpa storage quando shape e invalido (campo faltando)", async () => {
    STORE.set("bivaque.session.v1", JSON.stringify({ access_token: "x", refresh_token: "y" }))
    const result = await loadSession()
    expect(result).toBeNull()
    expect(STORE.has("bivaque.session.v1")).toBe(false)
  })

  it("retorna null e limpa storage quando tipo de campo esta errado", async () => {
    STORE.set("bivaque.session.v1", JSON.stringify({ ...validSession, expires_at: "not-a-number" }))
    const result = await loadSession()
    expect(result).toBeNull()
    expect(STORE.has("bivaque.session.v1")).toBe(false)
  })
})

describe("storage.clearSession", () => {
  beforeEach(() => STORE.clear())

  it("remove sessao existente", async () => {
    await saveSession(validSession)
    expect(STORE.has("bivaque.session.v1")).toBe(true)
    await clearSession()
    expect(STORE.has("bivaque.session.v1")).toBe(false)
  })

  it("nao falha quando ja limpo", async () => {
    await clearSession()
    await clearSession()
    const result = await loadSession()
    expect(result).toBeNull()
  })
})
