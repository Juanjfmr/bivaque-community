import { beforeEach, describe, expect, it, vi } from "vitest"
import { uploadPropertyPhotoAction } from "web/lib/listings/actions"

// SEC-006 (reconferência 2026-10-19) — o banco recusa posição repetida e fora da
// faixa. A action precisa propagar a recusa e remover o objeto recém-enviado,
// porque a linha é o que torna a foto alcançável.

const mocks = vi.hoisted(() => {
  const state = {
    ownsListing: true,
    insertError: null as null | { message: string; code?: string },
  }
  const upload = vi.fn()
  const remove = vi.fn()
  const insert = vi.fn()
  const getUser = vi.fn()

  function chain(name: string) {
    const result = () =>
      name === "listings"
        ? { data: state.ownsListing ? { id: "fixture-listing" } : null, error: null }
        : { data: null, error: null }
    const builder = {
      select: vi.fn(() => builder),
      insert: (...args: unknown[]) => {
        insert(...args)
        return builder
      },
      update: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      maybeSingle: async () => result(),
      single: async () => result(),
      // biome-ignore lint/suspicious/noThenProperty: PostgREST query builders are intentionally thenable.
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve(
          name === "listing_photos"
            ? { data: null, error: state.insertError }
            : { data: null, error: null },
        ).then(resolve),
    }
    return builder
  }

  const user = { auth: { getUser }, from: vi.fn((name: string) => chain(name)) }
  const service = {
    from: vi.fn((name: string) => chain(name)),
    storage: { from: vi.fn(() => ({ upload, remove })) },
  }
  return { state, upload, remove, insert, getUser, user, service }
})

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("web/lib/listings/ssr-client", () => ({ createListingClient: async () => mocks.user }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => mocks.service }))
vi.mock("web/lib/storage/sanitize-image", () => ({
  sanitizeImage: vi.fn(async () => Buffer.from("sanitized")),
}))

function form(position = "0"): FormData {
  const data = new FormData()
  data.set("listingId", "fixture-listing")
  data.set("position", position)
  data.set("photo", new File([new Uint8Array(16)], "foto.jpg", { type: "image/jpeg" }))
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.state.ownsListing = true
  mocks.state.insertError = null
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null })
  mocks.upload.mockResolvedValue({ error: null })
  mocks.remove.mockResolvedValue({ error: null })
})

describe("SEC-006 invariante de posição na action de Moradia", () => {
  it("grava a linha com a posição pedida", async () => {
    const result = await uploadPropertyPhotoAction(form("3"))

    expect(result).toMatchObject({ path: expect.stringMatching(/^fixture-listing\/3-/) })
    expect(mocks.insert).toHaveBeenCalledWith({
      listing_id: "fixture-listing",
      path: expect.stringMatching(/^fixture-listing\/3-/),
      position: 3,
    })
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it("propaga a recusa de posição repetida e remove o objeto sem linha", async () => {
    mocks.state.insertError = {
      code: "23505",
      message:
        'duplicate key value violates unique constraint "listing_photos_listing_position_unique"',
    }

    const result = await uploadPropertyPhotoAction(form("0"))

    const [uploadedPath] = mocks.upload.mock.calls[0] as [string]
    expect(result).toEqual({ error: mocks.state.insertError.message })
    expect(mocks.remove).toHaveBeenCalledWith([uploadedPath])
  })

  it("recusa posição acima do teto antes de qualquer upload", async () => {
    const result = await uploadPropertyPhotoAction(form("12"))

    expect(result).toEqual({ error: "Posição de foto inválida." })
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.insert).not.toHaveBeenCalled()
  })
})
