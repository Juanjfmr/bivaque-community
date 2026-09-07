// Testes do signOut (apps/mobile/src/auth/signOut.ts).
//
// Cobre o que o ADR-20260901-mobile-session §Acceptance exige:
//   - sucesso: 200 do servidor + storage limpo + purge zera rascunhos
//   - servidor 401 (refresh_token ja revogado): prossegue para cleanup local
//   - servidor 500 (falha de transporte): ainda assim limpa local
//     (membro não consegue mais agir sem token local; revogação
//     efetiva acontece na próxima vez que o refresh_token expirar)
//   - servidor inacessivel (fetch throws): idem, limpa local
//   - ENVs faltando: erro de transporte (anti-configuração)
//   - storage falhando: SignOutError("storage")
//   - accessToken=null: pula chamada ao servidor, ainda limpa local

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const SECURE_STORE = new Map<string, string>()
const ASYNC_STORE = new Map<string, string>()
let UPLOADS_DIR_EXISTS = false

vi.mock("expo-secure-store", () => ({
  getItemAsync: async (key: string) => SECURE_STORE.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => {
    SECURE_STORE.set(key, value)
  },
  deleteItemAsync: async (key: string) => {
    SECURE_STORE.delete(key)
  },
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 0,
}))

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    removeItem: async (key: string) => {
      ASYNC_STORE.delete(key)
    },
    setItem: async (key: string, value: string) => {
      ASYNC_STORE.set(key, value)
    },
    getItem: async (key: string) => ASYNC_STORE.get(key) ?? null,
  },
}))

vi.mock("expo-file-system", () => ({
  Paths: { document: { uri: "file:///data/user/0/com.bivaque/files/" } },
  Directory: class {
    get exists() {
      return UPLOADS_DIR_EXISTS
    }
    delete() {
      UPLOADS_DIR_EXISTS = false
    }
  },
}))

const fetchMock = vi.fn()
globalThis.fetch = fetchMock as unknown as typeof fetch

import { SignOutError, signOut } from "../signOut"

const VALID_SESSION = {
  access_token: "eyJ.fake",
  refresh_token: "v1.fake",
  expires_at: 1_900_000_000,
  user_id: "u1",
  locality_id: "l1",
}

describe("signOut", () => {
  beforeEach(() => {
    SECURE_STORE.clear()
    ASYNC_STORE.clear()
    UPLOADS_DIR_EXISTS = false
    fetchMock.mockReset()
    process.env["EXPO_PUBLIC_SUPABASE_URL"] = "http://localhost:55321"
    process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"] = "anon-key"
    SECURE_STORE.set("bivaque.session.v1", JSON.stringify(VALID_SESSION))
    ASYNC_STORE.set("bivaque.draft.post.v1", "rascunho")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("positivo: servidor 200, storage limpo, rascunhos apagados", async () => {
    UPLOADS_DIR_EXISTS = true
    fetchMock.mockResolvedValueOnce({ ok: true, status: 200 })

    await signOut(VALID_SESSION.access_token)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/auth/v1/logout")
    expect(SECURE_STORE.has("bivaque.session.v1")).toBe(false)
    expect(ASYNC_STORE.has("bivaque.draft.post.v1")).toBe(false)
  })

  it("negativo: servidor 401 (refresh_token ja revogado) ainda limpa local", async () => {
    UPLOADS_DIR_EXISTS = true
    fetchMock.mockResolvedValueOnce({ ok: false, status: 401 })

    await signOut(VALID_SESSION.access_token)

    expect(SECURE_STORE.has("bivaque.session.v1")).toBe(false)
    expect(ASYNC_STORE.has("bivaque.draft.post.v1")).toBe(false)
  })

  it("negativo: servidor 500 (falha de transporte) ainda limpa local", async () => {
    UPLOADS_DIR_EXISTS = true
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500 })

    await signOut(VALID_SESSION.access_token)

    expect(SECURE_STORE.has("bivaque.session.v1")).toBe(false)
    expect(ASYNC_STORE.has("bivaque.draft.post.v1")).toBe(false)
  })

  it("negativo: fetch rejeita (rede offline) ainda limpa local", async () => {
    UPLOADS_DIR_EXISTS = true
    fetchMock.mockRejectedValueOnce(new Error("network unreachable"))

    await signOut(VALID_SESSION.access_token)

    expect(SECURE_STORE.has("bivaque.session.v1")).toBe(false)
    expect(ASYNC_STORE.has("bivaque.draft.post.v1")).toBe(false)
  })

  it("positivo: accessToken=null pula chamada ao servidor", async () => {
    UPLOADS_DIR_EXISTS = true
    await signOut(null)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(SECURE_STORE.has("bivaque.session.v1")).toBe(false)
  })

  it("negativo: ENVs faltando lanca SignOutError(transport)", async () => {
    delete process.env["EXPO_PUBLIC_SUPABASE_URL"]
    delete process.env["EXPO_PUBLIC_SUPABASE_ANON_KEY"]

    await expect(signOut(VALID_SESSION.access_token)).rejects.toThrow(SignOutError)
  })
})
