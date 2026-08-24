import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { POST } from "web/app/api/onboarding/route"

vi.mock("web/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
}))

import { createServerClient } from "web/lib/supabase/server"

const mockRpc = vi.fn()
const mockGetUser = vi.fn()

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key")
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co")
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")

  const client = {
    auth: { getUser: mockGetUser },
    rpc: mockRpc,
  } as never

  mockGetUser.mockResolvedValue({
    data: { user: { id: "10000000-0000-4000-8000-000000000002" } },
    error: null,
  })

  mockRpc.mockImplementation(async (name: string) => {
    if (name === "has_accepted_consent") {
      return { data: true, error: null }
    }
    throw new Error(`unexpected rpc: ${name}`)
  })

  ;(createServerClient as ReturnType<typeof vi.fn>).mockReturnValue(client)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

function makeRequest(token: string, body: unknown): Request {
  return new Request("http://localhost/api/onboarding", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
}

const HAPPY_BODY = {
  action: "accept-family-invite",
  token: "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
  display_name: "Maria da Silva",
}

describe("POST /api/onboarding accept-family-invite sad paths (D2 Task 5)", () => {
  it.each([
    { code: "P0001", status: 404, label: "not_found or email mismatch" },
    { code: "P0002", status: 410, label: "expired" },
    { code: "P0003", status: 409, label: "already used" },
    { code: "P0004", status: 410, label: "revoked" },
  ])("maps errcode $code to HTTP $status ($label)", async ({ code, status }) => {
    mockRpc.mockImplementation(async (name: string) => {
      if (name === "has_accepted_consent") {
        return { data: true, error: null }
      }
      if (name === "accept_family_invitation") {
        return {
          data: null,
          error: {
            code,
            message: `family_invitation_${code.toLowerCase()}`,
            details: null,
            hint: null,
          },
        }
      }
      throw new Error(`unexpected rpc: ${name}`)
    })

    const response = await POST(makeRequest("token", HAPPY_BODY))
    expect(response.status).toBe(status)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBeTypeOf("string")
    expect(JSON.stringify(body)).not.toContain(code.toLowerCase())
    expect(JSON.stringify(body)).not.toContain("family_invitation_")
  })

  it("maps an unrecognised database error to a generic 500 (no echo)", async () => {
    mockRpc.mockImplementation(async (name: string) => {
      if (name === "has_accepted_consent") {
        return { data: true, error: null }
      }
      if (name === "accept_family_invitation") {
        return {
          data: null,
          error: {
            code: "99999",
            message: "connection reset by peer (internal pg detail)",
            details: null,
            hint: null,
          },
        }
      }
      throw new Error(`unexpected rpc: ${name}`)
    })

    const response = await POST(makeRequest("token", HAPPY_BODY))
    expect(response.status).toBe(500)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe("internal server error")
    expect(JSON.stringify(body)).not.toContain("connection reset")
    expect(JSON.stringify(body)).not.toContain("99999")
  })
})
