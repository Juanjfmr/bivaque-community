import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "web/app/api/internal/verification-reconcile/route"

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from "web/lib/supabase/server"

const mockRpc = vi.fn()

beforeEach(() => {
  vi.stubEnv("RECONCILE_WORKER_SECRET", "test-secret")
  const client = { rpc: mockRpc } as never
  ;(createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(client)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe("POST /api/internal/verification-reconcile (D2 Task 2)", () => {
  it("fails closed with 503 when the worker secret is not configured", async () => {
    vi.unstubAllEnvs()

    const response = await POST(
      new Request("http://localhost/api/internal/verification-reconcile", {
        method: "POST",
        headers: { "x-reconcile-secret": "test-secret" },
        body: JSON.stringify({ user_ids: ["00000000-0000-4000-8000-000000000001"] }),
      }),
    )

    expect(response.status).toBe(503)
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("rejects a wrong or missing secret with 401", async () => {
    for (const header of [undefined, "wrong-secret"]) {
      const headers: Record<string, string> = { "content-type": "application/json" }
      if (header !== undefined) headers["x-reconcile-secret"] = header
      const response = await POST(
        new Request("http://localhost/api/internal/verification-reconcile", {
          method: "POST",
          headers,
          body: JSON.stringify({ user_ids: ["00000000-0000-4000-8000-000000000001"] }),
        }),
      )
      expect(response.status).toBe(401)
    }
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("rejects malformed bodies with 400", async () => {
    const cases = [
      "{not json",
      JSON.stringify({}),
      JSON.stringify({ user_ids: "not-an-array" }),
      JSON.stringify({ user_ids: [] }),
      JSON.stringify({ user_ids: Array.from({ length: 21 }, (_, i) => String(i)) }),
    ]
    for (const body of cases) {
      const response = await POST(
        new Request("http://localhost/api/internal/verification-reconcile", {
          method: "POST",
          headers: { "x-reconcile-secret": "test-secret" },
          body,
        }),
      )
      expect(response.status).toBe(400)
    }
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("runs the step per id and reports the outcome counts", async () => {
    mockRpc
      .mockResolvedValueOnce({ data: "rejected", error: null })
      .mockResolvedValueOnce({ data: "deferred", error: null })
      .mockResolvedValueOnce({ data: "resolved", error: null })

    const response = await POST(
      new Request("http://localhost/api/internal/verification-reconcile", {
        method: "POST",
        headers: { "x-reconcile-secret": "test-secret" },
        body: JSON.stringify({
          user_ids: [
            "00000000-0000-4000-8000-000000000001",
            "00000000-0000-4000-8000-000000000002",
            "00000000-0000-4000-8000-000000000003",
          ],
        }),
      }),
    )

    expect(response.status).toBe(200)
    expect(mockRpc).toHaveBeenCalledTimes(3)
    expect(mockRpc).toHaveBeenCalledWith("verification_reconcile_step", {
      p_user_id: "00000000-0000-4000-8000-000000000001",
    })
    expect(await response.json()).toEqual({
      processed: 3,
      rejected: 1,
      deferred: 1,
      resolved: 1,
      errors: 0,
    })
  })

  it("counts a failing step as an error, never a crash", async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: { message: "db down" } })

    const response = await POST(
      new Request("http://localhost/api/internal/verification-reconcile", {
        method: "POST",
        headers: { "x-reconcile-secret": "test-secret" },
        body: JSON.stringify({ user_ids: ["00000000-0000-4000-8000-000000000001"] }),
      }),
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      processed: 1,
      rejected: 0,
      deferred: 0,
      resolved: 0,
      errors: 1,
    })
  })
})
