import { NextRequest } from "next/server"
import { afterAll, beforeAll, expect, it, vi } from "vitest"

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }))
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({ auth: { getUser } }),
}))

beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:54321")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-placeholder")
  vi.stubEnv("BIVAQUE_AUTH_BYPASS", "true")
})
afterAll(() => vi.unstubAllEnvs())

it("rejects an anonymous protected request even with the retired bypass enabled", async () => {
  const { proxy } = await import("web/proxy")
  getUser.mockResolvedValue({ data: { user: null } })
  const response = await proxy(new NextRequest("http://localhost/inicio"))
  expect(response.headers.get("location")).toBe("http://localhost/login?redirect=%2Finicio")
})

it("allows an authenticated user to continue onboarding", async () => {
  const { proxy } = await import("web/proxy")
  getUser.mockResolvedValue({ data: { user: { id: "test-member" } } })
  const response = await proxy(new NextRequest("http://localhost/onboarding"))
  expect(response.headers.get("x-middleware-next")).toBe("1")
})
