import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  addPortfolioPhotoAction,
  deletePortfolioPhotoAction,
} from "web/app/(provider)/prestador/actions"
import { uploadServiceRequestPhotoAction } from "web/app/(shell)/pedidos/novo/actions"
import {
  deleteListingPhotoObjectAction,
  removeListingPhotoAction,
  uploadListingPhotoAction,
  uploadPropertyPhotoAction,
} from "web/lib/listings/actions"
import { hasExifGps, imageMetadata, locationImage } from "../../fixtures/location-image"

// SEC-006 — o navegador não escreve mais nos buckets de imagem. Estes testes
// provam duas coisas por caminho:
//   1. a gravação acontece com o cliente service_role, nunca com o do usuário;
//   2. a autorização que a policy do Storage exigia é reconferida antes do
//      upload — uma conta sem posse é recusada sem gravar nada.
//
// Revisão L3: o mock registra os filtros recebidos e só devolve o recurso quando
// o id E o dono conferem. Antes ele decidia o resultado antes dos filtros, com
// `.eq()` ignorando os argumentos: remover o filtro `owner_user_id` ou trocar o
// id consultado continuava passando.

type Filter = { scope: "user" | "service"; table: string; column: string; value: unknown }

const mocks = vi.hoisted(() => {
  const state = {
    listingOwned: true,
    listingOwner: "fixture-user",
    profileOwned: true,
    profileOwner: "fixture-user",
    canManageProfile: true,
    requestOwned: true,
    requestOwner: "fixture-user",
    portfolioRow: null as null | { photo_path: string; provider_id: string },
    ownershipError: null as null | { message: string },
    rpcError: null as null | { message: string },
    filters: [] as Filter[],
  }

  const userUpload = vi.fn()
  const serviceUpload = vi.fn()
  const userRemove = vi.fn()
  const serviceRemove = vi.fn()
  const userStorageFrom = vi.fn(() => ({ upload: userUpload, remove: userRemove }))
  const serviceStorageFrom = vi.fn(() => ({ upload: serviceUpload, remove: serviceRemove }))
  const getUser = vi.fn()

  function filterValue(filters: Array<[string, unknown]>, column: string): unknown {
    return filters.find(([name]) => name === column)?.[1]
  }

  function resolve(scope: "user" | "service", name: string, filters: Array<[string, unknown]>) {
    if (name === "listings") {
      if (scope === "user") {
        // O cliente do usuário não faz a reconferência; o service_role faz.
        return { data: { id: "fixture-listing" }, error: null, count: 0 }
      }
      const id = filterValue(filters, "id")
      const owner = filterValue(filters, "owner_user_id")
      const found = state.listingOwned && id === "fixture-listing" && owner === state.listingOwner
      return {
        data: found ? { id: "fixture-listing" } : null,
        error: state.ownershipError,
        count: 0,
      }
    }
    if (name === "provider_profiles") {
      const owner = filterValue(filters, "owner_user_id")
      const found = state.profileOwned && owner === state.profileOwner
      return { data: found ? { id: "fixture-provider" } : null, error: null, count: 0 }
    }
    if (name === "service_requests") {
      const id = filterValue(filters, "id")
      const requester = filterValue(filters, "requester_user_id")
      const found =
        state.requestOwned && id === "fixture-request" && requester === state.requestOwner
      return {
        data: found ? { id: "fixture-request" } : null,
        error: state.ownershipError,
        count: 0,
      }
    }
    if (name === "provider_portfolio_photos") {
      const id = filterValue(filters, "id")
      return {
        data: state.portfolioRow !== null && id === "fixture-photo" ? state.portfolioRow : null,
        error: null,
        count: 0,
      }
    }
    return { data: { id: "fixture-listing" }, error: null, count: 0 }
  }

  function table(scope: "user" | "service", name: string) {
    const filters: Array<[string, unknown]> = []
    const outcome = () => resolve(scope, name, filters)
    const chain = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      upsert: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      eq: vi.fn((column: string, value: unknown) => {
        filters.push([column, value])
        state.filters.push({ scope, table: name, column, value })
        return chain
      }),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: async () => outcome(),
      maybeSingle: async () => outcome(),
      // biome-ignore lint/suspicious/noThenProperty: PostgREST query builders are intentionally thenable.
      then: (onFulfilled: (value: unknown) => unknown) =>
        Promise.resolve(outcome()).then(onFulfilled),
    }
    return chain
  }

  const rpc = vi.fn(async (name: string) => {
    if (state.rpcError) return { data: null, error: state.rpcError }
    if (name === "can_manage_provider_profile") return { data: state.canManageProfile, error: null }
    if (name === "create_service_request") return { data: "fixture-request", error: null }
    return { data: true, error: null }
  })

  const user = {
    auth: { getUser },
    from: vi.fn((name: string) => table("user", name)),
    rpc,
    storage: { from: userStorageFrom },
  }
  const service = {
    from: vi.fn((name: string) => table("service", name)),
    storage: { from: serviceStorageFrom },
  }

  return {
    state,
    userUpload,
    serviceUpload,
    userRemove,
    serviceRemove,
    userStorageFrom,
    serviceStorageFrom,
    getUser,
    user,
    service,
    rpc,
  }
})

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: () => mocks.user }))
vi.mock("web/lib/listings/ssr-client", () => ({ createListingClient: async () => mocks.user }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => mocks.service }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-anon-key")
  mocks.state.listingOwned = true
  mocks.state.listingOwner = "fixture-user"
  mocks.state.profileOwned = true
  mocks.state.profileOwner = "fixture-user"
  mocks.state.canManageProfile = true
  mocks.state.requestOwned = true
  mocks.state.requestOwner = "fixture-user"
  mocks.state.portfolioRow = null
  mocks.state.ownershipError = null
  mocks.state.rpcError = null
  mocks.state.filters = []
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null })
  mocks.userUpload.mockResolvedValue({ error: null })
  mocks.serviceUpload.mockResolvedValue({ error: null })
  mocks.userRemove.mockResolvedValue({ error: null })
  mocks.serviceRemove.mockResolvedValue({ error: null })
})

function photoForm(file: File, overrides: Record<string, string> = {}): FormData {
  const form = new FormData()
  form.set("listingId", "fixture-listing")
  form.set("position", "0")
  form.set("photo", file)
  for (const [key, value] of Object.entries(overrides)) form.set(key, value)
  return form
}

describe("SEC-006 moradia", () => {
  it("uploads with service_role after confirming the listing is the caller's", async () => {
    const file = await locationImage("jpeg", 6)
    await uploadPropertyPhotoAction(photoForm(file))

    expect(mocks.userUpload).not.toHaveBeenCalled()
    expect(mocks.serviceUpload).toHaveBeenCalledOnce()
    expect(mocks.serviceStorageFrom).toHaveBeenCalledWith("listing-photos")

    const stored = await imageMetadata(mocks.serviceUpload.mock.calls[0]?.[1])
    expect(stored.exif).toBeUndefined()
    expect(stored.xmp).toBeUndefined()
    expect(stored.orientation).toBeUndefined()
  })

  it("checks the listing id and the caller's owner_user_id before uploading", async () => {
    await uploadPropertyPhotoAction(photoForm(await locationImage("jpeg")))

    expect(mocks.state.filters).toContainEqual({
      scope: "service",
      table: "listings",
      column: "id",
      value: "fixture-listing",
    })
    expect(mocks.state.filters).toContainEqual({
      scope: "service",
      table: "listings",
      column: "owner_user_id",
      value: "fixture-user",
    })
  })

  it("refuses a listing that is not the caller's without uploading", async () => {
    mocks.state.listingOwner = "another-user"
    const result = await uploadPropertyPhotoAction(photoForm(await locationImage("jpeg")))

    expect(result).toEqual({ error: "Este anúncio não existe ou não é seu." })
    expect(mocks.userUpload).not.toHaveBeenCalled()
    expect(mocks.serviceUpload).not.toHaveBeenCalled()
  })

  it("refuses a listing that does not exist without uploading", async () => {
    mocks.state.listingOwned = false
    const result = await uploadPropertyPhotoAction(photoForm(await locationImage("jpeg")))

    expect(result).toEqual({ error: "Este anúncio não existe ou não é seu." })
    expect(mocks.serviceUpload).not.toHaveBeenCalled()
  })
})

describe("SEC-006 portfólio", () => {
  it("uploads with service_role after can_manage_provider_profile authorizes", async () => {
    const file = await locationImage("png")
    const form = new FormData()
    form.set("file", file)
    await addPortfolioPhotoAction(form)

    expect(mocks.userUpload).not.toHaveBeenCalled()
    expect(mocks.serviceUpload).toHaveBeenCalledOnce()
    expect(mocks.serviceStorageFrom).toHaveBeenCalledWith("provider-photos")
    const stored = await imageMetadata(mocks.serviceUpload.mock.calls[0]?.[1])
    expect(stored.exif).toBeUndefined()
    expect(stored.xmp).toBeUndefined()
  })

  it("queries the profile by the caller's owner_user_id", async () => {
    const form = new FormData()
    form.set("file", await locationImage("jpeg"))
    await addPortfolioPhotoAction(form)

    expect(mocks.state.filters).toContainEqual({
      scope: "user",
      table: "provider_profiles",
      column: "owner_user_id",
      value: "fixture-user",
    })
  })

  it.each([
    ["denied", () => (mocks.state.canManageProfile = false)],
    ["query error", () => (mocks.state.rpcError = { message: "unavailable" })],
  ])("refuses when authorization is %s, without uploading", async (_reason, arrange) => {
    arrange()
    const form = new FormData()
    form.set("file", await locationImage("jpeg"))
    await expect(addPortfolioPhotoAction(form)).rejects.toThrow()
    expect(mocks.userUpload).not.toHaveBeenCalled()
    expect(mocks.serviceUpload).not.toHaveBeenCalled()
  })

  it("refuses a profile owned by another person without uploading", async () => {
    mocks.state.profileOwner = "another-user"
    const form = new FormData()
    form.set("file", await locationImage("jpeg"))

    await expect(addPortfolioPhotoAction(form)).rejects.toThrow()
    expect(mocks.serviceUpload).not.toHaveBeenCalled()
  })
})

describe("SEC-006 pedido", () => {
  function requestPhotoForm(file: File): FormData {
    const form = new FormData()
    form.set("requestId", "fixture-request")
    form.set("position", "0")
    form.set("photo", file)
    return form
  }

  it("uploads with service_role after confirming the request belongs to the caller", async () => {
    const file = await locationImage("webp")
    const result = await uploadServiceRequestPhotoAction(requestPhotoForm(file))

    expect(result).toEqual({ ok: true })
    expect(mocks.userUpload).not.toHaveBeenCalled()
    expect(mocks.serviceUpload).toHaveBeenCalledOnce()
    expect(mocks.serviceStorageFrom).toHaveBeenCalledWith("service-request-photos")
    const stored = await imageMetadata(mocks.serviceUpload.mock.calls[0]?.[1])
    expect(stored.exif).toBeUndefined()
    expect(stored.xmp).toBeUndefined()
  })

  it("checks the request id and the caller's requester_user_id before uploading", async () => {
    await uploadServiceRequestPhotoAction(requestPhotoForm(await locationImage("jpeg")))

    expect(mocks.state.filters).toContainEqual({
      scope: "service",
      table: "service_requests",
      column: "id",
      value: "fixture-request",
    })
    expect(mocks.state.filters).toContainEqual({
      scope: "service",
      table: "service_requests",
      column: "requester_user_id",
      value: "fixture-user",
    })
  })

  it("refuses a request that belongs to another person without uploading", async () => {
    mocks.state.requestOwner = "another-user"
    const result = await uploadServiceRequestPhotoAction(
      requestPhotoForm(await locationImage("jpeg")),
    )

    expect(result).toEqual({ error: "O pedido não existe ou não é seu." })
    expect(mocks.userUpload).not.toHaveBeenCalled()
    expect(mocks.serviceUpload).not.toHaveBeenCalled()
  })

  it("refuses a request that does not exist without uploading", async () => {
    mocks.state.requestOwned = false
    const result = await uploadServiceRequestPhotoAction(
      requestPhotoForm(await locationImage("jpeg")),
    )

    expect(result).toEqual({ error: "O pedido não existe ou não é seu." })
    expect(mocks.serviceUpload).not.toHaveBeenCalled()
  })
})

describe("SEC-006 mercado", () => {
  it.each(["jpeg", "png", "webp"] as const)(
    "stores %s via service_role with EXIF, GPS and XMP removed",
    async (format) => {
      const file = await locationImage(format, 6)
      const original = await imageMetadata(file)
      expect(original.exif).toBeDefined()
      expect(hasExifGps(original.exif)).toBe(true)

      const result = await uploadListingPhotoAction(photoForm(file))

      expect(result).toMatchObject({ path: expect.stringMatching(/^fixture-listing\/0-/) })
      expect(mocks.userUpload).not.toHaveBeenCalled()
      expect(mocks.serviceUpload).toHaveBeenCalledOnce()
      expect(mocks.serviceStorageFrom).toHaveBeenCalledWith("listing-photos")

      const stored = await imageMetadata(mocks.serviceUpload.mock.calls[0]?.[1])
      expect(stored.exif).toBeUndefined()
      expect(stored.xmp).toBeUndefined()
      expect(stored.iptc).toBeUndefined()
      expect(stored.orientation).toBeUndefined()
      expect(stored.format).toBe(format)
    },
  )

  it("checks the listing id and the caller's owner_user_id before uploading", async () => {
    await uploadListingPhotoAction(photoForm(await locationImage("jpeg")))

    expect(mocks.state.filters).toContainEqual({
      scope: "service",
      table: "listings",
      column: "id",
      value: "fixture-listing",
    })
    expect(mocks.state.filters).toContainEqual({
      scope: "service",
      table: "listings",
      column: "owner_user_id",
      value: "fixture-user",
    })
  })

  it("refuses a listing that belongs to another person without uploading", async () => {
    mocks.state.listingOwner = "another-user"
    const result = await uploadListingPhotoAction(photoForm(await locationImage("jpeg")))

    expect(result).toEqual({ error: "Este anúncio não existe ou não é seu." })
    expect(mocks.userUpload).not.toHaveBeenCalled()
    expect(mocks.serviceUpload).not.toHaveBeenCalled()
  })

  it("keeps the same format and size limits, without touching storage", async () => {
    const gif = new File(["not an image"], "photo.gif", { type: "image/gif" })
    expect(await uploadListingPhotoAction(photoForm(gif))).toEqual({
      error: "Use uma imagem JPEG, PNG ou WebP.",
    })

    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.jpg", {
      type: "image/jpeg",
    })
    expect(await uploadListingPhotoAction(photoForm(oversized))).toEqual({
      error: "A imagem deve ter até 10 MB.",
    })

    const corrupt = new File(["not an image"], "broken.jpg", { type: "image/jpeg" })
    expect(await uploadListingPhotoAction(photoForm(corrupt))).toMatchObject({
      error: expect.stringContaining("Não foi possível ler a imagem"),
    })

    expect(mocks.userUpload).not.toHaveBeenCalled()
    expect(mocks.serviceUpload).not.toHaveBeenCalled()
  })

  it("refuses an invalid position without uploading", async () => {
    const result = await uploadListingPhotoAction(
      photoForm(await locationImage("jpeg"), { position: "-1" }),
    )
    expect(result).toEqual({ error: "Posição de foto inválida." })
    expect(mocks.serviceUpload).not.toHaveBeenCalled()
  })
})

describe("SEC-006 remoção de fotos", () => {
  function removalForm(listingId: string, path: string): FormData {
    const form = new FormData()
    form.set("listingId", listingId)
    form.set("path", path)
    return form
  }

  it("removes a marketplace object with service_role after confirming ownership", async () => {
    const result = await deleteListingPhotoObjectAction(
      removalForm("fixture-listing", "fixture-listing/0-photo.jpg"),
    )

    expect(result).toEqual({ ok: true })
    expect(mocks.userRemove).not.toHaveBeenCalled()
    expect(mocks.serviceRemove).toHaveBeenCalledWith(["fixture-listing/0-photo.jpg"])
  })

  it("refuses to remove a path outside the listing folder", async () => {
    const result = await deleteListingPhotoObjectAction(
      removalForm("fixture-listing", "another-listing/0-photo.jpg"),
    )

    expect(result).toMatchObject({ ok: false })
    expect(mocks.serviceRemove).not.toHaveBeenCalled()
  })

  it("refuses to remove an object of a listing that is not the caller's", async () => {
    mocks.state.listingOwner = "another-user"
    const result = await deleteListingPhotoObjectAction(
      removalForm("fixture-listing", "fixture-listing/0-photo.jpg"),
    )

    expect(result).toMatchObject({ ok: false })
    expect(mocks.serviceRemove).not.toHaveBeenCalled()
  })

  it("moradia removes with service_role as well", async () => {
    const result = await removeListingPhotoAction(
      removalForm("fixture-listing", "fixture-listing/0-photo.jpg"),
    )

    expect(result).toEqual({ ok: true })
    expect(mocks.userRemove).not.toHaveBeenCalled()
    expect(mocks.serviceRemove).toHaveBeenCalledWith(["fixture-listing/0-photo.jpg"])
  })

  it("portfolio removes with service_role after can_manage_provider_profile authorizes", async () => {
    mocks.state.portfolioRow = {
      photo_path: "fixture-provider/portfolio/photo.webp",
      provider_id: "fixture-provider",
    }
    const form = new FormData()
    form.set("photoId", "fixture-photo")
    await deletePortfolioPhotoAction(form)

    expect(mocks.userRemove).not.toHaveBeenCalled()
    expect(mocks.serviceRemove).toHaveBeenCalledWith(["fixture-provider/portfolio/photo.webp"])
  })

  it("portfolio refuses removal when authorization is denied", async () => {
    mocks.state.portfolioRow = {
      photo_path: "fixture-provider/portfolio/photo.webp",
      provider_id: "fixture-provider",
    }
    mocks.state.canManageProfile = false
    const form = new FormData()
    form.set("photoId", "fixture-photo")

    await expect(deletePortfolioPhotoAction(form)).rejects.toThrow("Só o dono da ficha")
    expect(mocks.serviceRemove).not.toHaveBeenCalled()
  })
})
