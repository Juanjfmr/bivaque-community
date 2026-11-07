import { beforeEach, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({ rpc: vi.fn(), sign: vi.fn(), user: vi.fn() }))
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser: mock.user } }),
}))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("web/lib/supabase/server", () => ({
  createServerClient: () => ({
    rpc: mock.rpc,
    storage: { from: () => ({ createSignedUrl: mock.sign }) },
  }),
}))

import { GET } from "web/app/(admin)/admissions/document/[documentId]/route"

const ID = "24000000-0000-4000-8000-000000000001"
const OP = "10000000-0000-4000-8000-000000000002"
const request = new Request("https://example.invalid")
const params = { params: Promise.resolve({ documentId: ID }) }

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-placeholder")
  mock.user.mockResolvedValue({ data: { user: { id: OP } } })
  mock.rpc.mockImplementation(async (name: string) => ({
    data:
      name === "is_current_user_operator"
        ? true
        : [{ storage_object_path: "private/document.pdf" }],
    error: null,
  }))
  mock.sign.mockResolvedValue({
    data: { signedUrl: "https://example.invalid/signed" },
    error: null,
  })
})
it("registra acesso antes de redirecionar para URL de 60s, sem cache", async () => {
  const response = await GET(request, params)
  expect(response.status).toBe(302)
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(mock.rpc).toHaveBeenCalledWith("read_operator_verification_document", {
    p_document_id: ID,
    p_operator_user_id: OP,
  })
  expect(mock.sign).toHaveBeenCalledWith("private/document.pdf", 60)
})
it("não operador recebe 403 e não obtém caminho nem assinatura", async () => {
  mock.rpc.mockResolvedValue({ data: false, error: null })
  expect((await GET(request, params)).status).toBe(403)
  expect(mock.rpc).toHaveBeenCalledTimes(1)
  expect(mock.sign).not.toHaveBeenCalled()
})
it("documento indisponível retorna 404 sem assinatura", async () => {
  mock.rpc.mockImplementation(async (name: string) => ({
    data: name === "is_current_user_operator" ? true : [],
    error: null,
  }))
  expect((await GET(request, params)).status).toBe(404)
  expect(mock.sign).not.toHaveBeenCalled()
})
it("falha de auditoria ou assinatura não entrega documento", async () => {
  mock.rpc.mockImplementation(async (name: string) => ({
    data: name === "is_current_user_operator" ? true : null,
    error: name === "is_current_user_operator" ? null : { message: "unavailable" },
  }))
  expect((await GET(request, params)).status).toBe(500)
  expect(mock.sign).not.toHaveBeenCalled()
})
