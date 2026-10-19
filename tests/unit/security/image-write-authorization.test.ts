import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  addPortfolioPhotoAction,
  deletePortfolioPhotoAction,
} from "web/app/(provider)/prestador/actions"
import { submitServiceRequest } from "web/app/(shell)/pedidos/novo/actions"
import {
  createPropertyAction,
  deleteListingPhotoObjectAction,
  removeListingPhotoAction,
  uploadListingPhotoAction,
} from "web/lib/listings/actions"
import { hasExifGps, imageMetadata, locationImage } from "../../fixtures/location-image"

// SEC-006 — o navegador não escreve mais nos buckets de imagem. Estes testes
// provam duas coisas por caminho:
//   1. a gravação acontece com o cliente service_role, nunca com o do usuário;
//   2. a autorização que a policy do Storage exigia é reconferida antes do
//      upload — uma conta sem posse é recusada sem gravar nada.

const mocks = vi.hoisted(() => {
  const state = {
    listingOwned: true,
    profileOwned: true,
    canManageProfile: true,
    requestOwned: true,
    portfolioRow: null as null | { photo_path: string; provider_id: string },
    ownershipError: null as null | { message: string },
    rpcError: null as null | { message: string },
  }

  const userUpload = vi.fn()
  const serviceUpload = vi.fn()
  const userRemove = vi.fn()
  const serviceRemove = vi.fn()
  const userStorageFrom = vi.fn(() => ({ upload: userUpload, remove: userRemove }))
  const serviceStorageFrom = vi.fn(() => ({ upload: serviceUpload, remove: serviceRemove }))
  const getUser = vi.fn()

  function resultFor(scope: "user" | "service", name: string) {
    if (name === "listings") {
      // O cliente do usuário faz o insert (RLS); o service_role faz a
      // reconferência de posse antes do upload.
      if (scope === "user") return { data: { id: "fixture-listing" }, error: null, count: 0 }
      return {
        data: state.listingOwned ? { id: "fixture-listing" } : null,
        error: state.ownershipError,
        count: 0,
      }
    }
    if (name === "provider_profiles") {
      return {
        data: state.profileOwned ? { id: "fixture-provider" } : null,
        error: null,
        count: 0,
      }
    }
    if (name === "service_requests") {
      return {
        data: state.requestOwned ? { id: "fixture-request" } : null,
        error: state.ownershipError,
        count: 0,
      }
    }
    if (name === "provider_portfolio_photos") {
      return { data: state.portfolioRow, error: null, count: 0 }
    }
    return { data: { id: "fixture-listing" }, error: null, count: 0 }
  }

  function table(scope: "user" | "service", name: string) {
    const outcome = resultFor(scope, name)
    const chain = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      upsert: vi.fn(() => chain),
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      single: async () => outcome,
      maybeSingle: async () => outcome,
      // biome-ignore lint/suspicious/noThenProperty: PostgREST query builders are intentionally thenable.
      then: Promise.resolve(outcome).then.bind(Promise.resolve(outcome)),
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
  mocks.state.profileOwned = true
  mocks.state.canManageProfile = true
  mocks.state.requestOwned = true
  mocks.state.portfolioRow = null
  mocks.state.ownershipError = null
  mocks.state.rpcError = null
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null })
  mocks.userUpload.mockResolvedValue({ error: null })
  mocks.serviceUpload.mockResolvedValue({ error: null })
  mocks.userRemove.mockResolvedValue({ error: null })
  mocks.serviceRemove.mockResolvedValue({ error: null })
})

function propertyForm(file: File): FormData {
  const form = new FormData()
  form.set("title", "Imovel sintetico")
  form.set("deal", "rent")
  form.set("propertyType", "house")
  form.set("photos", file)
  return form
}

describe("SEC-006 moradia", () => {
  it("uploads with service_role after confirming the listing is the caller's", async () => {
    const file = await locationImage("jpeg", 6)
    await createPropertyAction(propertyForm(file))

    expect(mocks.userUpload).not.toHaveBeenCalled()
    expect(mocks.serviceUpload).toHaveBeenCalledOnce()
    expect(mocks.serviceStorageFrom).toHaveBeenCalledWith("listing-photos")

    const stored = await imageMetadata(mocks.serviceUpload.mock.calls[0]?.[1])
    expect(stored.exif).toBeUndefined()
    expect(stored.xmp).toBeUndefined()
    expect(stored.orientation).toBeUndefined()
  })

  it("refuses a listing that is not the caller's without uploading", async () => {
    mocks.state.listingOwned = false
    const result = await createPropertyAction(propertyForm(await locationImage("jpeg")))

    expect(result).toEqual({ ok: false, message: "Este anúncio não existe ou não é seu." })
    expect(mocks.userUpload).not.toHaveBeenCalled()
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
})

describe("SEC-006 pedido", () => {
  function requestForm(file: File): FormData {
    const form = new FormData()
    form.set("providerId", "fixture-provider")
    form.set("description", "Descricao sintetica do pedido")
    form.set("photos", file)
    return form
  }

  it("uploads with service_role after confirming the request belongs to the caller", async () => {
    const file = await locationImage("webp")
    const result = await submitServiceRequest(requestForm(file))

    expect(result).toEqual({ status: "success", requestId: "fixture-request" })
    expect(mocks.userUpload).not.toHaveBeenCalled()
    expect(mocks.serviceUpload).toHaveBeenCalledOnce()
    expect(mocks.serviceStorageFrom).toHaveBeenCalledWith("service-request-photos")
    const stored = await imageMetadata(mocks.serviceUpload.mock.calls[0]?.[1])
    expect(stored.exif).toBeUndefined()
    expect(stored.xmp).toBeUndefined()
  })

  it("refuses a request that is not the caller's without uploading", async () => {
    mocks.state.requestOwned = false
    const result = await submitServiceRequest(requestForm(await locationImage("jpeg")))

    expect(result).toEqual({
      status: "error",
      message: "O pedido foi criado, mas o envio das fotos falhou. Tente novamente.",
    })
    expect(mocks.userUpload).not.toHaveBeenCalled()
    expect(mocks.serviceUpload).not.toHaveBeenCalled()
  })
})

describe("SEC-006 mercado", () => {
  function photoForm(file: File, overrides: Record<string, string> = {}): FormData {
    const form = new FormData()
    form.set("listingId", "fixture-listing")
    form.set("position", "0")
    form.set("photo", file)
    for (const [key, value] of Object.entries(overrides)) form.set(key, value)
    return form
  }

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

  it("refuses a listing that is not the caller's without uploading", async () => {
    mocks.state.listingOwned = false
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
    mocks.state.listingOwned = false
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
