import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const state = vi.hoisted(() => ({
  data: {
    status: "cancelled",
    cancelled_at: "2026-09-23T12:00:00.000Z",
    cancelled_by_user_id: "user-1",
  } as Record<string, unknown> | null,
  error: null as { message: string } | null,
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => [], setAll: () => {} })),
}))

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    rpc: vi.fn(async () => ({ data: state.data, error: state.error })),
  })),
}))

vi.mock("web/lib/logger", () => ({ log: { error: vi.fn() } }))

import { cancelRequest } from "web/app/(shell)/pedidos/[id]/actions"

const workspaceSource = readFileSync(
  join(import.meta.dirname, "../../../apps/web/app/(shell)/pedidos/[id]/request-workspace.tsx"),
  "utf8",
)

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  state.data = {
    status: "cancelled",
    cancelled_at: "2026-09-23T12:00:00.000Z",
    cancelled_by_user_id: "user-1",
  }
  state.error = null
})

afterEach(() => vi.unstubAllEnvs())

describe("cancelamento de pedido pelo solicitante", () => {
  it("devolve o estado terminal persistido pelo RPC", async () => {
    const result = await cancelRequest("50000000-0000-4000-8000-0000000000a1")

    expect(result).toEqual({
      status: "cancelled",
      cancelledAt: "2026-09-23T12:00:00.000Z",
      cancelledByUserId: "user-1",
    })
  })

  it("a interface separa cancelamento de encerramento e remove o composer terminal", () => {
    expect(workspaceSource).toContain("cancelRequest")
    expect(workspaceSource).toContain("Cancelar pedido")
    expect(workspaceSource).toContain("Pedido cancelado")
    expect(workspaceSource).toContain("router.refresh()")
    expect(workspaceSource).toContain("setStatus(request.status)")
    expect(workspaceSource).toContain("setCancelledAt(request.cancelledAt)")
    expect(workspaceSource).toContain("{closed ? (")
  })

  it("não transforma erro do servidor em sucesso", async () => {
    state.error = { message: "only the requester cancels" }

    const result = await cancelRequest("50000000-0000-4000-8000-0000000000a1")

    expect(result).toEqual({
      status: "error",
      message: "Não foi possível cancelar o pedido agora.",
    })
  })
})
