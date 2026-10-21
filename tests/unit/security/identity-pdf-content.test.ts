import { beforeEach, describe, expect, it, vi } from "vitest"
import { uploadVerificationDocumentAction } from "web/app/(preauth)/onboarding/document-actions"
import { sanitizeImage } from "web/lib/storage/sanitize-image"
import { locationImage } from "../../fixtures/location-image"

// SEC-AUD-001 (MEDIUM, 2026-10-19) — a exceção de PDF só vale para bytes de PDF.
// O MIME é controlado pelo cliente: um JPEG/PNG com GPS rotulado
// `application/pdf` não pode ser persistido byte a byte. PDF verdadeiro continua
// intacto; não há parser de assinatura nem checagem de emissor.

const mocks = vi.hoisted(() => {
  const upload = vi.fn()
  const remove = vi.fn()
  const rpc = vi.fn()
  const getUser = vi.fn()

  function chain(name: string) {
    const result = () =>
      name === "locality_memberships" ? { data: null, error: null } : { data: null, error: null }
    const builder = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      maybeSingle: async () => result(),
      single: async () => result(),
      // biome-ignore lint/suspicious/noThenProperty: PostgREST query builders are intentionally thenable.
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    }
    return builder
  }

  const auth = { auth: { getUser } }
  const service = {
    rpc,
    from: vi.fn((name: string) => chain(name)),
    storage: {
      from: vi.fn(() => ({
        upload,
        remove,
        list: vi.fn(async () => ({ data: [], error: null })),
      })),
    },
  }
  return { upload, remove, rpc, getUser, auth, service }
})

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("@supabase/ssr", () => ({ createServerClient: () => mocks.auth }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => mocks.service }))
vi.mock("web/lib/onboarding/document-status", () => ({
  readDocumentPaths: async () => [],
}))
vi.mock("web/lib/storage/sanitize-image", async (importOriginal) => {
  const actual = await importOriginal<typeof import("web/lib/storage/sanitize-image")>()
  return { sanitizeImage: vi.fn(actual.sanitizeImage) }
})

function form(file: File): FormData {
  const data = new FormData()
  data.set("document", file)
  return data
}

// PDF mínimo real: header, objeto de catálogo, trailer e EOF. Não é documento
// de governo nem prova de assinatura; é só conteúdo PDF válido o bastante para
// a exceção byte a byte.
const REAL_PDF = `%PDF-1.7
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [] /Count 0 >>
endobj
trailer
<< /Root 1 0 R >>
%%EOF
`

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-anon-key")
  mocks.getUser.mockResolvedValue({ data: { user: { id: "fixture-user" } }, error: null })
  mocks.rpc.mockImplementation(async (name: string) => {
    if (name === "has_accepted_consent") return { data: true, error: null }
    return { data: null, error: null }
  })
  mocks.upload.mockResolvedValue({ error: null })
  mocks.remove.mockResolvedValue({ error: null })
})

describe("SEC-AUD-001 conteúdo real do documento de identidade", () => {
  it.each(["jpeg", "png"] as const)(
    "recusa %s com GPS rotulado como application/pdf sem tocar no Storage",
    async (format) => {
      const image = await locationImage(format)
      const disguised = new File([await image.arrayBuffer()], "identidade.pdf", {
        type: "application/pdf",
      })

      const result = await uploadVerificationDocumentAction(form(disguised))

      expect(result).toMatchObject({ ok: false })
      expect(sanitizeImage).not.toHaveBeenCalled()
      expect(mocks.upload).not.toHaveBeenCalled()
    },
  )

  it("mantém PDF verdadeiro byte a byte, sem reencodar", async () => {
    const pdf = new File([REAL_PDF], "identidade.pdf", { type: "application/pdf" })

    const result = await uploadVerificationDocumentAction(form(pdf))

    expect(result).toEqual({ ok: true })
    expect(sanitizeImage).not.toHaveBeenCalled()
    expect(mocks.upload).toHaveBeenCalledOnce()
    const [, body, options] = mocks.upload.mock.calls[0] as [
      string,
      Uint8Array,
      { contentType: string },
    ]
    expect(Buffer.from(body)).toEqual(Buffer.from(REAL_PDF))
    expect(options.contentType).toBe("application/pdf")
  })

  it("recusa arquivo sem header PDF mesmo com MIME application/pdf", async () => {
    const fake = new File(["isto nao e um pdf"], "identidade.pdf", {
      type: "application/pdf",
    })

    const result = await uploadVerificationDocumentAction(form(fake))

    expect(result).toMatchObject({ ok: false })
    expect(mocks.upload).not.toHaveBeenCalled()
  })
})
