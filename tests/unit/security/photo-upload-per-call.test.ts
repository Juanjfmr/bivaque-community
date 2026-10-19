import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  submitServiceRequest,
  uploadServiceRequestPhotoAction,
} from "web/app/(shell)/pedidos/novo/actions"
import { uploadPropertyPhotoAction } from "web/lib/listings/actions"

// SEC-006 (revisão M2) — Moradia e Pedido enviam uma foto por chamada. Estes
// testes exercitam a borda real (as Server Actions) com arquivos que, somados,
// passam dos 12 MB do `bodySizeLimit`, mas cada chamada leva menos que isso.

const mocks = vi.hoisted(() => {
  const serviceUpload = vi.fn()
  const serviceRemove = vi.fn()
  const getUser = vi.fn()
  const rpc = vi.fn()

  function table(name: string) {
    const chain = {
      select: vi.fn(() => chain),
      insert: vi.fn(async () => ({ data: { id: "fixture-listing" }, error: null })),
      upsert: vi.fn(async () => ({ data: null, error: null })),
      update: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: async () => ({
        data: { id: name === "listings" ? "fixture-listing" : "x" },
        error: null,
      }),
      maybeSingle: async () => ({
        data: name === "listings" ? { id: "fixture-listing" } : { id: "fixture-request" },
        error: null,
      }),
      // biome-ignore lint/suspicious/noThenProperty: PostgREST query builders are intentionally thenable.
      then: Promise.resolve({ data: null, error: null }).then.bind(
        Promise.resolve({ data: null, error: null }),
      ),
    }
    return chain
  }

  const user = {
    auth: { getUser },
    from: vi.fn((name: string) => table(name)),
    rpc,
  }
  const service = {
    from: vi.fn((name: string) => table(name)),
    storage: { from: vi.fn(() => ({ upload: serviceUpload, remove: serviceRemove })) },
  }

  return { serviceUpload, serviceRemove, getUser, rpc, user, service }
})

vi.mock("server-only", () => ({}))
vi.mock("web/lib/storage/sanitize-image", () => ({
  sanitizeImage: vi.fn(async () => Buffer.from("sanitized-image")),
}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: () => mocks.user }))
vi.mock("web/lib/listings/ssr-client", () => ({ createListingClient: async () => mocks.user }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => mocks.service }))

const MB = 1024 * 1024

function jpeg(bytes: number): File {
  return new File([new Uint8Array(bytes)], "foto.jpg", { type: "image/jpeg" })
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-anon-key")
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null })
  mocks.rpc.mockResolvedValue({ data: "fixture-request", error: null })
  mocks.serviceUpload.mockResolvedValue({ error: null })
  mocks.serviceRemove.mockResolvedValue({ error: null })
})

describe("SEC-006 M2 Moradia", () => {
  it("envia 14 MB no total em duas chamadas de 7 MB", async () => {
    const files = [jpeg(7 * MB), jpeg(7 * MB)]

    for (const [index, file] of files.entries()) {
      const form = new FormData()
      form.set("listingId", "fixture-listing")
      form.set("position", String(index))
      form.set("photo", file)
      await expect(uploadPropertyPhotoAction(form)).resolves.toMatchObject({
        path: expect.stringMatching(/^fixture-listing\//),
      })
    }

    expect(files.reduce((total, file) => total + file.size, 0)).toBeGreaterThan(12 * MB)
    expect(mocks.serviceUpload).toHaveBeenCalledTimes(2)
  })
})

describe("SEC-006 M2 Pedido", () => {
  function requestForm(): FormData {
    const form = new FormData()
    form.set("providerId", "fixture-provider")
    form.set("description", "Descricao sintetica do pedido")
    form.set("idempotencyKey", "fixture-key")
    return form
  }

  it("cria o pedido e envia 14 MB em duas chamadas de 7 MB", async () => {
    const created = await submitServiceRequest(requestForm())
    expect(created).toEqual({ status: "success", requestId: "fixture-request" })

    const files = [jpeg(7 * MB), jpeg(7 * MB)]
    for (const [index, file] of files.entries()) {
      const form = new FormData()
      form.set("requestId", "fixture-request")
      form.set("position", String(index))
      form.set("photo", file)
      await expect(uploadServiceRequestPhotoAction(form)).resolves.toEqual({ ok: true })
    }

    expect(files.reduce((total, file) => total + file.size, 0)).toBeGreaterThan(12 * MB)
    expect(mocks.serviceUpload).toHaveBeenCalledTimes(2)
  })
})
