import { beforeEach, describe, expect, it, vi } from "vitest"
import { replaceListingPhotoAction } from "web/lib/listings/actions"

// SEC-006 (reparo 2026-10-19, tentativa 2) — a Server Action é a única
// responsável pela limpeza do objeto novo. Ela só limpa quando há recusa SQL
// definitiva (erro estruturado do PostgREST, com código). Exceção de transporte
// e erro sem código são ambíguos: o commit pode ter acontecido depois, então os
// bytes ficam preservados. Não há SELECT imediato para "provar" rollback.

const mocks = vi.hoisted(() => {
  const state = {
    ownsListing: true,
    rpcError: null as null | { message: string; code?: string },
    rpcThrows: false,
    commitBeforeThrow: false,
    committedPath: null as string | null,
    rpcPaths: [] as string[],
    removeError: null as null | { message: string },
    removeThrows: false,
  }
  const rpc = vi.fn()
  const remove = vi.fn()
  const getUser = vi.fn()
  const from = vi.fn()

  function chain(name: string) {
    const result = () =>
      name === "listings"
        ? { data: state.ownsListing ? { id: "fixture-listing" } : null, error: null }
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

  const user = {
    auth: { getUser },
    rpc,
    from: vi.fn((name: string) => {
      from(name)
      return chain(name)
    }),
  }
  const service = {
    from: vi.fn((name: string) => {
      from(name)
      return chain(name)
    }),
    storage: { from: vi.fn(() => ({ remove })) },
  }
  return { state, rpc, remove, getUser, from, user, service }
})

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("web/lib/listings/ssr-client", () => ({ createListingClient: async () => mocks.user }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => mocks.service }))

function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  data.set("listingId", "fixture-listing")
  data.set("path", "fixture-listing/0-new.jpg")
  data.set("position", "0")
  for (const [key, value] of Object.entries(overrides)) data.set(key, value)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.state.ownsListing = true
  mocks.state.rpcError = null
  mocks.state.rpcThrows = false
  mocks.state.commitBeforeThrow = false
  mocks.state.committedPath = null
  mocks.state.rpcPaths = []
  mocks.state.removeError = null
  mocks.state.removeThrows = false
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null })
  mocks.rpc.mockImplementation(async (_name: string, args: { p_path: string }) => {
    if (mocks.state.rpcThrows) {
      if (mocks.state.commitBeforeThrow) mocks.state.committedPath = args.p_path
      throw new Error("resposta perdida")
    }
    return { data: mocks.state.rpcPaths, error: mocks.state.rpcError }
  })
  mocks.remove.mockImplementation(async () => {
    if (mocks.state.removeThrows) throw new Error("storage indisponível")
    return { error: mocks.state.removeError }
  })
})

describe("SEC-006 ação de troca transacional da foto do Mercado", () => {
  it("chama a RPC e remove os objetos antigos depois do commit", async () => {
    mocks.state.rpcPaths = ["fixture-listing/0-old.jpg", "fixture-listing/1-old.jpg"]

    const result = await replaceListingPhotoAction(form())

    expect(mocks.rpc).toHaveBeenCalledWith("replace_listing_photo", {
      p_listing_id: "fixture-listing",
      p_path: "fixture-listing/0-new.jpg",
      p_position: 0,
    })
    expect(mocks.remove).toHaveBeenCalledWith([
      "fixture-listing/0-old.jpg",
      "fixture-listing/1-old.jpg",
    ])
    expect(result).toEqual({
      ok: true,
      previousPaths: ["fixture-listing/0-old.jpg", "fixture-listing/1-old.jpg"],
      previousCleanupFailed: false,
    })
  })

  it("recusa outro dono antes da RPC", async () => {
    mocks.state.ownsListing = false

    const result = await replaceListingPhotoAction(form())

    expect(result).toMatchObject({ error: "Este anúncio não existe ou não é seu." })
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it("recusa caminho fora da pasta antes de tocar no banco", async () => {
    const result = await replaceListingPhotoAction(
      form({ path: "fixture-listing-other/0-new.jpg" }),
    )

    expect(result).toMatchObject({ error: "A foto não pertence a este anúncio." })
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it("recusa SQL definitiva limpa apenas o objeto novo", async () => {
    mocks.state.rpcError = { message: "colisão", code: "23505" }

    const result = await replaceListingPhotoAction(form())

    expect(result).toEqual({
      ok: false,
      definite: true,
      cleanupFailed: false,
      error: "colisão",
    })
    expect(mocks.remove).toHaveBeenCalledWith(["fixture-listing/0-new.jpg"])
  })

  it("commit atrasado com resposta perdida é inconclusivo e preserva os bytes", async () => {
    mocks.state.rpcThrows = true
    mocks.state.commitBeforeThrow = true

    const result = await replaceListingPhotoAction(form())

    expect(mocks.state.committedPath).toBe("fixture-listing/0-new.jpg")
    expect(result).toMatchObject({ ok: false, definite: false })
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it("erro sem código SQL também é inconclusivo, sem SELECT imediato", async () => {
    mocks.state.rpcError = { message: "gateway timeout" }

    const result = await replaceListingPhotoAction(form())

    expect(result).toMatchObject({ ok: false, definite: false })
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(mocks.from).not.toHaveBeenCalledWith("listing_photos")
  })

  it("registra falha de limpeza da recusa definitiva", async () => {
    mocks.state.rpcError = { message: "posição inválida", code: "22023" }
    mocks.state.removeError = { message: "storage indisponível" }

    const result = await replaceListingPhotoAction(form())

    expect(result).toEqual({
      ok: false,
      definite: true,
      cleanupFailed: true,
      error: "posição inválida",
    })
  })

  it("não transforma falha de limpeza das antigas em falha da troca", async () => {
    mocks.state.rpcPaths = ["fixture-listing/0-old.jpg"]
    mocks.state.removeError = { message: "storage indisponível" }

    const result = await replaceListingPhotoAction(form())

    expect(result).toEqual({
      ok: true,
      previousPaths: ["fixture-listing/0-old.jpg"],
      previousCleanupFailed: true,
    })
  })
})
