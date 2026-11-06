import { beforeEach, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("web/lib/storage/sanitize-image", () => ({ sanitizeImage: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: vi.fn() }))

import { enviarFotoDoAnuncio } from "web/lib/storage/listing-photo"
import { sanitizeImage } from "web/lib/storage/sanitize-image"
import { createServerClient } from "web/lib/supabase/server"

const upload = vi.fn()
const file = new File(["original com metadados"], "foto.jpg", { type: "image/jpeg" })
function cliente(data: unknown, error: unknown = null) {
  const eq = vi.fn()
  const query = { select: () => query, eq, maybeSingle: async () => ({ data, error }) }
  eq.mockReturnValue(query)
  return { valor: { from: () => query } as never, eq }
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(sanitizeImage).mockResolvedValue(Buffer.from("pixels sem metadados"))
  upload.mockResolvedValue({ error: null })
  vi.mocked(createServerClient).mockReturnValue({ storage: { from: () => ({ upload }) } } as never)
})
it("confere posse pela sessão e grava só os pixels sanitizados no bucket privado", async () => {
  const client = cliente({ id: "anuncio" })
  const path = await enviarFotoDoAnuncio(client.valor, "titular", "anuncio", 0, file)
  expect(client.eq).toHaveBeenCalledWith("owner_user_id", "titular")
  expect(sanitizeImage).toHaveBeenCalledWith(file, 10 * 1024 * 1024)
  expect(path).toMatch(/^anuncio\/0-.+\.jpeg$/)
  expect(upload).toHaveBeenCalledWith(path, Buffer.from("pixels sem metadados"), {
    contentType: "image/jpeg",
    upsert: false,
  })
})
it("inexistente/fora do alcance dá 404 e falha de leitura dá 503 antes do privilégio", async () => {
  await expect(
    enviarFotoDoAnuncio(cliente(null).valor, "titular", "outro", 0, file),
  ).rejects.toMatchObject({ status: 404 })
  await expect(
    enviarFotoDoAnuncio(cliente(null, { message: "Postgres" }).valor, "titular", "outro", 0, file),
  ).rejects.toMatchObject({ status: 503 })
  expect(createServerClient).not.toHaveBeenCalled()
})
it("arquivo inválido e slot inválido não chegam ao bucket", async () => {
  await expect(
    enviarFotoDoAnuncio(cliente({ id: "a" }).valor, "u", "a", -1, file),
  ).rejects.toMatchObject({ status: 400 })
  vi.mocked(sanitizeImage).mockRejectedValue(new Error("metadados e detalhes internos"))
  await expect(
    enviarFotoDoAnuncio(cliente({ id: "a" }).valor, "u", "a", 0, file),
  ).rejects.toMatchObject({ status: 400 })
  expect(upload).not.toHaveBeenCalled()
})
it("erro de storage dá 503 sem eco técnico", async () => {
  upload.mockResolvedValue({ error: { message: "segredo do storage" } })
  await expect(
    enviarFotoDoAnuncio(cliente({ id: "a" }).valor, "u", "a", 0, file),
  ).rejects.toMatchObject({ status: 503, message: "Não foi possível enviar a foto." })
})
