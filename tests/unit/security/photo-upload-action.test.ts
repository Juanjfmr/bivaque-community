import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { setCommunityImageAction } from "web/app/(owner)/communities/actions"
import { uploadVerificationDocumentAction } from "web/app/(preauth)/onboarding/document-actions"
import { addPortfolioPhotoAction } from "web/app/(provider)/prestador/actions"
import { uploadPostPhotoAction } from "web/app/(shell)/events/upload-photo-action"
import { submitServiceRequest } from "web/app/(shell)/pedidos/novo/actions"
import { uploadAvatarAction } from "web/app/(shell)/profile/avatar-actions"
import { createPropertyAction, updatePropertyAction } from "web/lib/listings/actions"
import { hasExifGps, imageMetadata, locationImage } from "../../fixtures/location-image"

const mocks = vi.hoisted(() => {
  const upload = vi.fn()
  const member = vi.fn()
  const getUser = vi.fn()
  const storageFrom = vi.fn(() => ({ upload, list: async () => ({ data: [] }) }))
  const rpc = vi.fn()
  const eq = vi.fn()
  function table(name: string, privileged = false) {
    const result = {
      data:
        name === "communities"
          ? { owner_user_id: "fixture-user", banner_path: null, thumbnail_path: null }
          : { id: "fixture-resource" },
      error: null,
      count: 0,
    }
    const chain = {
      select: vi.fn(() => chain),
      insert: vi.fn(() => chain),
      update: vi.fn(() => chain),
      upsert: vi.fn(() => chain),
      eq: vi.fn((...args: unknown[]) => {
        eq(...args)
        return chain
      }),
      limit: vi.fn(() => chain),
      single: async () => result,
      maybeSingle: () =>
        name === "locality_memberships"
          ? privileged
            ? Promise.resolve({ data: null, error: null })
            : member()
          : Promise.resolve(result),
      // biome-ignore lint/suspicious/noThenProperty: PostgREST query builders are intentionally thenable.
      then: Promise.resolve(result).then.bind(Promise.resolve(result)),
    }
    return chain
  }
  const client = {
    auth: { getUser },
    from: vi.fn((name: string) => table(name)),
    rpc,
    storage: { from: storageFrom },
  }
  const service = { ...client, from: vi.fn((name: string) => table(name, true)) }
  return { upload, member, getUser, storageFrom, rpc, client, service, eq }
})

vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: () => mocks.client }))
vi.mock("web/lib/listings/ssr-client", () => ({ createListingClient: () => mocks.client }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => mocks.service }))
vi.mock("web/lib/onboarding/document-status", () => ({ readDocumentPaths: async () => [] }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-anon-key")
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null })
  mocks.member.mockResolvedValue({ data: { locality_id: "fixture-locality" }, error: null })
  mocks.upload.mockResolvedValue({ error: null })
  mocks.rpc.mockImplementation(async (name: string) => ({
    data: name === "create_service_request" ? "fixture-request" : true,
    error: null,
  }))
})

afterEach(() => vi.unstubAllEnvs())

const formats = ["jpeg", "png", "webp"] as const
const paths = [
  { name: "moradia criar", field: "photos", bucket: "listing-photos", maxMB: 10 },
  { name: "moradia editar", field: "photos", bucket: "listing-photos", maxMB: 10 },
  { name: "avatar", field: "avatar", bucket: "avatars", maxMB: 5 },
  { name: "comunidade faixa", field: "image", bucket: "community-images", maxMB: 10 },
  { name: "comunidade miniatura", field: "image", bucket: "community-images", maxMB: 10 },
  { name: "portfolio", field: "file", bucket: "provider-photos", maxMB: 5 },
  { name: "pedido", field: "photos", bucket: "service-request-photos", maxMB: 10 },
  { name: "identidade", field: "document", bucket: "verification-documents", maxMB: 10 },
  { name: "evento", field: "photo", bucket: "event-photos", maxMB: 5 },
] as const

type UploadPath = (typeof paths)[number]

function formFor(path: UploadPath, file: File) {
  const form = new FormData()
  form.set(path.field, file)
  form.set("title", "Imovel sintetico")
  form.set("deal", "rent")
  form.set("propertyType", "house")
  form.set("listingId", "fixture-resource")
  form.set("communityId", "fixture-community")
  form.set("kind", path.name === "comunidade faixa" ? "banner" : "thumbnail")
  form.set("providerId", "fixture-provider")
  form.set("description", "Descricao sintetica do pedido")
  return form
}

async function send(path: UploadPath, file: File) {
  const form = formFor(path, file)
  switch (path.name) {
    case "moradia criar":
      return createPropertyAction(form)
    case "moradia editar":
      return updatePropertyAction(form)
    case "avatar":
      return uploadAvatarAction(form)
    case "comunidade faixa":
    case "comunidade miniatura":
      return setCommunityImageAction(form)
    case "portfolio":
      return addPortfolioPhotoAction(form)
    case "pedido":
      return submitServiceRequest(form)
    case "identidade":
      return uploadVerificationDocumentAction(form)
    case "evento":
      return uploadPostPhotoAction(form)
  }
}

describe.each(paths)("SEC-004 $name", (path) => {
  const accepted = path.name === "identidade" ? (["jpeg", "png"] as const) : formats
  for (const orientation of [1, 6]) {
    it.each(accepted)(
      `strips EXIF/GPS/XMP and preserves format and orientation ${orientation}: %s`,
      async (format) => {
        const file = await locationImage(format, orientation)
        const original = await imageMetadata(file)
        expect(original.exif).toBeDefined()
        expect(hasExifGps(original.exif)).toBe(true)
        expect(original.xmp?.toString()).toContain("GPSLatitude")
        expect(original.orientation).toBe(orientation)
        await send(path, file)
        expect(mocks.upload).toHaveBeenCalledOnce()
        expect(mocks.storageFrom).toHaveBeenCalledWith(path.bucket)
        const stored = await imageMetadata(mocks.upload.mock.calls[0]?.[1])
        expect(stored.exif === undefined, "EXIF/GPS must be discarded").toBe(true)
        expect(stored.xmp === undefined, "XMP must be discarded").toBe(true)
        expect(stored.iptc).toBeUndefined()
        expect(stored.orientation).toBeUndefined()
        expect(stored.format).toBe(format)
        expect(stored.width).toBe(orientation === 6 ? 3 : 4)
        expect(stored.height).toBe(orientation === 6 ? 4 : 3)
        expect(mocks.upload.mock.calls[0]?.[2].contentType).toBe(file.type)
      },
    )
  }

  it.each(["unsupported", "oversized", "corrupt"] as const)(
    "does not store %s input",
    async (kind) => {
      const file = new File(
        [kind === "oversized" ? new Uint8Array(path.maxMB * 1024 * 1024 + 1) : "not an image"],
        "invalid.jpg",
        { type: kind === "unsupported" ? "image/gif" : "image/jpeg" },
      )
      // Actions either throw or return their existing error-state contract.
      await send(path, file).catch(() => undefined)
      expect(mocks.upload).not.toHaveBeenCalled()
    },
  )
})

describe("SEC-004 event authorization", () => {
  it.each(["missing", "query error", "session"])(
    "refuses %s before privileged upload",
    async (reason) => {
      if (reason === "session")
        mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
      else
        mocks.member.mockResolvedValue({
          data: null,
          error: reason === "query error" ? { message: "unavailable" } : null,
        })
      const form = new FormData()
      form.set("photo", await locationImage("jpeg"))
      await expect(uploadPostPhotoAction(form)).rejects.toThrow()
      expect(mocks.upload).not.toHaveBeenCalled()
    },
  )

  it("checks the authenticated user's membership, ignoring a user id from the form", async () => {
    const form = new FormData()
    form.set("photo", await locationImage("jpeg"))
    form.set("userId", "someone-else")
    await uploadPostPhotoAction(form)
    expect(mocks.client.from).toHaveBeenCalledWith("locality_memberships")
    expect(mocks.eq).toHaveBeenCalledWith("user_id", "fixture-user")
    expect(mocks.upload.mock.calls[0]?.[0]).toMatch(/^fixture-user\//)
  })
})

it("keeps the identity PDF path byte-for-byte", async () => {
  const file = new File(["%PDF-1.7 synthetic fixture"], "identity.pdf", { type: "application/pdf" })
  expect(await send(paths[7], file)).toEqual({ ok: true })
  expect(Buffer.from(mocks.upload.mock.calls[0]?.[1])).toEqual(
    Buffer.from(await file.arrayBuffer()),
  )
})
