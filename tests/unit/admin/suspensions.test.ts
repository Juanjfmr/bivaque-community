import { beforeEach, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: mock.user } }) }))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => ({ rpc: mock.rpc }) }))

import { endSuspensionAction, suspendAccountAction } from "web/app/(admin)/suspensions/actions"

const ID = "24000000-0000-4000-8000-000000000003"
const OP = "10000000-0000-4000-8000-000000000002"
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.invalid")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-placeholder")
  mock.user.mockResolvedValue({ data: { user: { id: OP } } })
  mock.rpc.mockImplementation(async (name: string) => ({
    data: name === "is_current_user_operator" ? true : null,
    error: null,
  }))
})
it("aplica com motivo, prazo e caller da sessão", async () => {
  expect(await suspendAccountAction(ID, "Regra", 7)).toEqual({ ok: true })
  expect(mock.rpc).toHaveBeenCalledWith("operator_suspend_account", {
    p_user_id: ID,
    p_operator_user_id: OP,
    p_reason: "Regra",
    p_days: 7,
  })
})
it("encerra com motivo e caller da sessão", async () => {
  expect(await endSuspensionAction(ID, "Recurso aceito")).toEqual({ ok: true })
  expect(mock.rpc).toHaveBeenCalledWith("operator_end_suspension", {
    p_user_id: ID,
    p_operator_user_id: OP,
    p_reason: "Recurso aceito",
  })
})
it.each([() => suspendAccountAction(ID, "Regra", 7), () => endSuspensionAction(ID, "Recurso")])(
  "não operador não aplica nem encerra",
  async (action) => {
    mock.rpc.mockResolvedValue({ data: false, error: null })
    expect(await action()).toEqual({ ok: false, error: "forbidden" })
    expect(mock.rpc).toHaveBeenCalledTimes(1)
  },
)
it("recusa prazo inválido, motivo vazio e alvo forjado", async () => {
  for (const days of [0, -1, 366, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(await suspendAccountAction(ID, "Regra", days)).toMatchObject({ ok: false })
  }
  expect(await suspendAccountAction("forged", "Regra", 7)).toMatchObject({ ok: false })
  expect(await suspendAccountAction(ID, "", 7)).toMatchObject({ ok: false })
  expect(await endSuspensionAction(ID, "")).toMatchObject({ ok: false })
  expect(mock.rpc.mock.calls.some(([name]) => name !== "is_current_user_operator")).toBe(false)
})
it("conflito não vira sucesso e recusa do banco permanece recusa", async () => {
  for (const [code, error] of [
    ["P0001", "conflict"],
    ["42501", "forbidden"],
    ["P0002", "not-found"],
  ]) {
    mock.rpc.mockImplementation(async (name: string) => ({
      data: name === "is_current_user_operator" ? true : null,
      error: name === "is_current_user_operator" ? null : { code },
    }))
    expect(await suspendAccountAction(ID, "Regra", 7)).toEqual({ ok: false, error })
  }
})
