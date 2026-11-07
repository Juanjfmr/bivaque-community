import { beforeEach, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), user: vi.fn(), range: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: mock.user } }) }))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND")
  },
}))
vi.mock("web/lib/supabase/server", () => ({
  createServerClient: () => ({ rpc: mock.rpc, from: mock.from }),
}))

import OperatorActionsPage from "web/app/(admin)/operator-actions/page"

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-placeholder")
  mock.user.mockResolvedValue({ data: { user: { id: "operator" } } })
  mock.rpc.mockResolvedValue({ data: true, error: null })
  mock.range.mockResolvedValue({ data: [], error: null })
  mock.from.mockReturnValue({
    select: () => ({ order: () => ({ order: () => ({ range: mock.range }) }) }),
  })
})
it("registro tem página limitada e ordenação estável", async () => {
  await OperatorActionsPage({ searchParams: Promise.resolve({ pagina: "2" }) })
  expect(mock.from).toHaveBeenCalledWith("operator_actions")
  expect(mock.range).toHaveBeenCalledWith(50, 100)
})
it("não operador recebe 404 antes de qualquer leitura privilegiada", async () => {
  mock.rpc.mockResolvedValue({ data: false, error: null })
  await expect(OperatorActionsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
    "NOT_FOUND",
  )
  expect(mock.from).not.toHaveBeenCalled()
})
it("falha de consulta não vira histórico vazio", async () => {
  mock.range.mockResolvedValue({ data: null, error: { code: "unavailable" } })
  const page = await OperatorActionsPage({ searchParams: Promise.resolve({}) })
  expect(JSON.stringify(page)).toContain("Não foi possível carregar")
})
