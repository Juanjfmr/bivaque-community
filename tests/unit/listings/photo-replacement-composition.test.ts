import { beforeEach, describe, expect, it, vi } from "vitest"
import { replaceListingPhotoAction, uploadListingPhotoAction } from "web/lib/listings/actions"
import { replaceListingPhoto } from "web/lib/listings/photo-replacement"
import { runWithPending } from "web/lib/storage/photo-upload-sequence"

// SEC-006 (reparo 2026-10-19, tentativa 2) — composição REAL da edição do
// Mercado: helper de troca + Server Actions de upload/troca. Reproduz o achado
// do auditor: a RPC comita a foto nova e a resposta se perde. A action não pode
// apagar o objeto referenciado; o helper não pode transformar erro genérico em
// "a anterior continua aqui"; o pending precisa encerrar; o retry deve funcionar.

const mocks = vi.hoisted(() => {
  const state = {
    committedPath: null as string | null,
    rpcCalls: 0,
    rpcThrowsAfterCommit: true,
  }
  const upload = vi.fn()
  const remove = vi.fn()
  const rpc = vi.fn()
  const getUser = vi.fn()

  function chain(name: string) {
    const result = () =>
      name === "listings"
        ? { data: { id: "fixture-listing" }, error: null }
        : { data: null, error: null }
    const builder = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      maybeSingle: async () => result(),
      single: async () => result(),
      // biome-ignore lint/suspicious/noThenProperty: PostgREST query builders are intentionally thenable.
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    }
    return builder
  }

  const user = { auth: { getUser }, rpc, from: vi.fn((name: string) => chain(name)) }
  const service = {
    from: vi.fn((name: string) => chain(name)),
    storage: { from: vi.fn(() => ({ upload, remove })) },
  }
  return { state, upload, remove, rpc, getUser, user, service }
})

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("web/lib/listings/ssr-client", () => ({ createListingClient: async () => mocks.user }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => mocks.service }))
vi.mock("web/lib/storage/sanitize-image", () => ({
  sanitizeImage: vi.fn(async () => Buffer.from("sanitized")),
}))

function photo(name: string): File {
  return new File([new Uint8Array(32)], name, { type: "image/jpeg" })
}

function uploadForm(): FormData {
  const data = new FormData()
  data.set("listingId", "fixture-listing")
  data.set("position", "0")
  data.set("photo", photo("foto.jpg"))
  return data
}

function swapForm(path: string): FormData {
  const data = new FormData()
  data.set("listingId", "fixture-listing")
  data.set("path", path)
  data.set("position", "0")
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.state.committedPath = null
  mocks.state.rpcCalls = 0
  mocks.state.rpcThrowsAfterCommit = true
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null })
  mocks.upload.mockResolvedValue({ error: null })
  mocks.remove.mockResolvedValue({ error: null })
  mocks.rpc.mockImplementation(async (_name: string, args: { p_path: string }) => {
    mocks.state.rpcCalls += 1
    if (mocks.state.rpcThrowsAfterCommit && mocks.state.rpcCalls === 1) {
      mocks.state.committedPath = args.p_path
      throw new Error("resposta perdida")
    }
    const previous = mocks.state.committedPath
    mocks.state.committedPath = args.p_path
    return { data: previous === null ? [] : [previous], error: null }
  })
})

describe("SEC-006 composição Mercado: commit atrasado/resposta perdida", () => {
  it("preserva a foto referenciada, encerra o pending e permite retry", async () => {
    const pending: boolean[] = []
    const first = await runWithPending(
      (value) => pending.push(value),
      () =>
        replaceListingPhoto(null, {
          uploadNewPhoto: async () => uploadListingPhotoAction(uploadForm()),
          commitReplacement: async (path) => {
            const result = await replaceListingPhotoAction(swapForm(path))
            if ("error" in result) {
              return {
                error: result.error,
                definite: result.definite,
                cleanupFailed: result.cleanupFailed,
              }
            }
            return {
              error: null,
              previousPaths: result.previousPaths,
              cleanupFailed: result.previousCleanupFailed,
            }
          },
        }),
      "Não foi possível trocar a foto.",
    )

    const firstPath = mocks.state.committedPath
    expect(firstPath).not.toBeNull()
    expect(pending).toEqual([true, false])
    expect(first.ok).toBe(true)
    if (!first.ok) throw new Error("unreachable")
    expect(first.value).toMatchObject({ ok: false, indeterminate: true })
    if (!first.value.ok) {
      expect(first.value.message).not.toContain("anterior continua aqui")
      expect(first.value.message).toContain("recarregue")
    }

    // O objeto que o banco já referencia não foi apagado.
    expect(mocks.remove).not.toHaveBeenCalledWith([firstPath])
    expect(mocks.state.committedPath).toBe(firstPath)

    // Retry: a troca seguinte devolve a linha antiga e só então limpa o objeto.
    mocks.state.rpcThrowsAfterCommit = false
    const retry = await runWithPending(
      (value) => pending.push(value),
      () =>
        replaceListingPhoto(firstPath, {
          uploadNewPhoto: async () => uploadListingPhotoAction(uploadForm()),
          commitReplacement: async (path) => {
            const result = await replaceListingPhotoAction(swapForm(path))
            if ("error" in result) {
              return {
                error: result.error,
                definite: result.definite,
                cleanupFailed: result.cleanupFailed,
              }
            }
            return {
              error: null,
              previousPaths: result.previousPaths,
              cleanupFailed: result.previousCleanupFailed,
            }
          },
        }),
      "Não foi possível trocar a foto.",
    )

    expect(pending).toEqual([true, false, true, false])
    expect(retry.ok).toBe(true)
    if (!retry.ok) throw new Error("unreachable")
    expect(retry.value.ok).toBe(true)
    if (retry.value.ok) {
      expect(retry.value.path).not.toBe(firstPath)
    }
    expect(mocks.remove).toHaveBeenCalledWith([firstPath])
  })
})
