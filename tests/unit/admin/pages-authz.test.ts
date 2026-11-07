import { beforeEach, describe, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), user: vi.fn() }))
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

import AdmissionPage from "web/app/(admin)/admissions/[id]/page"
import AdmissionsPage from "web/app/(admin)/admissions/page"
import ArrivalsPage from "web/app/(admin)/arrivals/page"
import ReportPage from "web/app/(admin)/reports/[id]/page"
import ReportsPage from "web/app/(admin)/reports/page"

const ID = "10000000-0000-4000-8000-000000000001"
const pages = [
  ["admissões", () => AdmissionsPage({ searchParams: Promise.resolve({}) })],
  ["admissão", () => AdmissionPage({ params: Promise.resolve({ id: ID }) })],
  ["denúncias", () => ReportsPage({ searchParams: Promise.resolve({}) })],
  ["denúncia", () => ReportPage({ params: Promise.resolve({ id: ID }) })],
  ["chegadas", () => ArrivalsPage()],
] as const

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-placeholder")
  mock.user.mockResolvedValue({ data: { user: { id: ID } }, error: null })
  mock.rpc.mockResolvedValue({ data: false, error: null })
})

describe.each(pages)("página de %s", (_name, render) => {
  it("recusa não operador com 404 antes de ler dados privilegiados", async () => {
    await expect(render()).rejects.toThrow("NOT_FOUND")
    expect(mock.rpc.mock.calls).toEqual([["is_current_user_operator", { p_user_id: ID }]])
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("recusa sessão ausente antes de qualquer consulta", async () => {
    mock.user.mockResolvedValue({ data: { user: null }, error: null })
    await expect(render()).rejects.toThrow("NOT_FOUND")
    expect(mock.rpc).not.toHaveBeenCalled()
    expect(mock.from).not.toHaveBeenCalled()
  })

  it("recusa falha na conferência de operador", async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { code: "unavailable" } })
    await expect(render()).rejects.toThrow("NOT_FOUND")
    expect(mock.rpc.mock.calls).toEqual([["is_current_user_operator", { p_user_id: ID }]])
    expect(mock.from).not.toHaveBeenCalled()
  })
})
