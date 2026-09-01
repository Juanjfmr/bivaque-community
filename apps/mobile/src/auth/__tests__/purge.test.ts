// Testes do purge (apps/mobile/src/auth/purge.ts).
//
// Cobre:
//   - positivo: apaga todas as DRAFT_KEYS e remove uploads dir
//   - negativo (resiliencia): uploads dir ausente -> no-op (nao lanca)
//   - positivo: AsyncStorage.removeItem que falha -> outros ainda apagam

import { beforeEach, describe, expect, it, vi } from "vitest"

const ASYNC_STORE = new Map<string, string>()
let UPLOADS_DIR_EXISTS = true
let DELETE_CALLED = false
const FAILS_FOR_KEY = new Set<string>()

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    removeItem: async (key: string) => {
      if (FAILS_FOR_KEY.has(key)) {
        throw new Error("io error")
      }
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
    constructor(_parent: unknown, _name: string) {}
    get exists() {
      return UPLOADS_DIR_EXISTS
    }
    delete() {
      DELETE_CALLED = true
      UPLOADS_DIR_EXISTS = false
    }
  },
}))

import { purge } from "../purge"

beforeEach(() => {
  ASYNC_STORE.clear()
  UPLOADS_DIR_EXISTS = true
  DELETE_CALLED = false
  FAILS_FOR_KEY.clear()
  ASYNC_STORE.set("bivaque.draft.post.v1", "post body")
  ASYNC_STORE.set("bivaque.draft.poll.v1", "poll body")
})

describe("purge", () => {
  it("positivo: apaga todos os rascunhos e uploads", async () => {
    await purge()
    expect(ASYNC_STORE.has("bivaque.draft.post.v1")).toBe(false)
    expect(ASYNC_STORE.has("bivaque.draft.poll.v1")).toBe(false)
    expect(DELETE_CALLED).toBe(true)
  })

  it("negativo: uploads dir ausente -> no-op sem erro", async () => {
    UPLOADS_DIR_EXISTS = false
    await expect(purge()).resolves.toBeUndefined()
    expect(DELETE_CALLED).toBe(false)
  })

  it("positivo: AsyncStorage.removeItem que falha em uma chave nao impede as outras nem uploads.delete()", async () => {
    FAILS_FOR_KEY.add("bivaque.draft.post.v1")
    await purge()
    // post.v1 nao foi apagado (throws), poll.v1 foi.
    expect(ASYNC_STORE.has("bivaque.draft.post.v1")).toBe(true)
    expect(ASYNC_STORE.has("bivaque.draft.poll.v1")).toBe(false)
    // uploads.delete() DEVE rodar mesmo com falha em AsyncStorage.
    expect(DELETE_CALLED).toBe(true)
  })
})
