import { beforeEach, describe, expect, it, vi } from "vitest"

const mock = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: mock.user } }) }))
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [] }) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("web/lib/supabase/server", () => ({ createServerClient: () => ({ rpc: mock.rpc }) }))

import { resolveReport } from "web/app/(admin)/reports/actions"

const ID = "24000000-0000-4000-8000-000000000002"
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
describe("decisões de denúncia", () => {
  it.each([
    ["manter", "dismiss"],
    ["ocultar", "hide"],
    ["remover", "remove"],
  ])("%s usa decisão transacional com operador da sessão", async (decision, action) => {
    expect(await resolveReport(ID, decision, "Regra da comunidade")).toEqual({ ok: true })
    expect(mock.rpc).toHaveBeenCalledWith("resolve_report", {
      p_report_id: ID,
      p_operator_user_id: OP,
      p_action: action,
      p_note: "Regra da comunidade",
    })
  })
  it.each(["manter", "ocultar", "remover"])("nega %s a não operador", async (decision) => {
    mock.rpc.mockResolvedValue({ data: false, error: null })
    expect(await resolveReport(ID, decision, "Motivo")).toEqual({ ok: false, error: "forbidden" })
    expect(mock.rpc).toHaveBeenCalledTimes(1)
  })
  it.each(["", "   "])("aceita justificativa vazia (%j)", async (note) => {
    expect(await resolveReport(ID, "ocultar", note)).toEqual({ ok: true })
    expect(mock.rpc).toHaveBeenCalledWith("resolve_report", {
      p_report_id: ID,
      p_operator_user_id: OP,
      p_action: "hide",
      p_note: "",
    })
  })
  it("aceita justificativa com 1000 caracteres", async () => {
    expect(await resolveReport(ID, "manter", "a".repeat(1000))).toEqual({ ok: true })
  })
  it("recusa corpo inválido, motivo longo e alvo inválido", async () => {
    for (const [id, decision, note] of [
      [ID, "forged", "Motivo"],
      [ID, "ocultar", "a".repeat(1001)],
      ["forged", "manter", "Motivo"],
    ])
      expect(await resolveReport(id ?? "", decision ?? "", note ?? "")).toMatchObject({ ok: false })
    expect(mock.rpc.mock.calls.some(([name]) => name === "resolve_report")).toBe(false)
  })
  it("mostra conflito e recusa autoritativa do banco", async () => {
    for (const [code, error] of [
      ["P0002", "already-resolved"],
      ["42501", "forbidden"],
    ]) {
      mock.rpc.mockImplementation(async (name: string) => ({
        data: name === "is_current_user_operator" ? true : null,
        error: name === "resolve_report" ? { code, message: "recusado" } : null,
      }))
      expect(await resolveReport(ID, "manter", "Motivo")).toEqual({ ok: false, error })
    }
  })
})
