import { beforeEach, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({ cleanup: vi.fn() }))
vi.mock("web/lib/admin/document-removals", () => ({ removeReviewedDocuments: mock.cleanup }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => ({}) }))

import { POST } from "web/app/api/admin/document-removals/route"

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("OUTBOX_WORKER_SECRET", "test-placeholder")
  mock.cleanup.mockResolvedValue(true)
})
it("executa o job autenticado, sem carregar cookies ou dados de membro", async () => {
  const response = await POST(
    new Request("https://example.invalid", {
      method: "POST",
      headers: { "x-outbox-secret": "test-placeholder" },
    }),
  )
  expect(response.status).toBe(200)
  expect(mock.cleanup).toHaveBeenCalledWith({}, null)
})
it("recusa sessão de membro e segredo inválido", async () => {
  for (const secret of ["", "forged"]) {
    expect(
      (
        await POST(
          new Request("https://example.invalid", {
            method: "POST",
            headers: { "x-outbox-secret": secret },
          }),
        )
      ).status,
    ).toBe(403)
  }
  expect(mock.cleanup).not.toHaveBeenCalled()
})
it("falha fechado se não configurado ou se o descarte falha", async () => {
  mock.cleanup.mockResolvedValue(false)
  expect(
    (
      await POST(
        new Request("https://example.invalid", {
          method: "POST",
          headers: { "x-outbox-secret": "test-placeholder" },
        }),
      )
    ).status,
  ).toBe(503)
  vi.stubEnv("OUTBOX_WORKER_SECRET", "")
  expect((await POST(new Request("https://example.invalid", { method: "POST" }))).status).toBe(503)
})
