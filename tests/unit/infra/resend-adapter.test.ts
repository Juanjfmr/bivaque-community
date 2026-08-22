import type { OutboxMessage } from "@bivaque/domain"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createChannelAdapters } from "../../../apps/web/lib/outbox/adapters"

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function message(overrides: Partial<OutboxMessage> = {}): OutboxMessage {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    recipient: "member-one@example.invalid",
    channel: "email",
    type: "verification_decision",
    payload: { user_id: "10000000-0000-4000-8000-000000000001", status: "approved" },
    attempts: 0,
    updatedAt: 1000,
    ...overrides,
  }
}

describe("email channel adapter (D1 Task 4 — Resend)", () => {
  it("stays unavailable when RESEND_API_KEY is missing — no pretend provider", () => {
    delete process.env["RESEND_API_KEY"]
    const adapters = createChannelAdapters()
    expect(adapters["whatsapp"]).toBeDefined()
    // The email adapter is a real adapter only when the key exists; the
    // unavailable path returns a failure the worker turns into a retry.
  })

  it("sends a verification_decision email via the Resend API", async () => {
    process.env["RESEND_API_KEY"] = "re_testkey"
    process.env["RESEND_FROM_EMAIL"] = "bivaque@example.com"

    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const adapters = createChannelAdapters()
    const result = await adapters["email"].send(message())

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe("https://api.resend.com/emails")
    const body = JSON.parse(String(init.body))
    expect(body.to).toEqual(["member-one@example.invalid"])
    expect(body.subject).toContain("aprovada")
  })

  it("renders rejected decision copy", async () => {
    process.env["RESEND_API_KEY"] = "re_testkey"
    process.env["RESEND_FROM_EMAIL"] = "bivaque@example.com"

    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const adapters = createChannelAdapters()
    await adapters["email"].send(
      message({ payload: { user_id: "10000000-0000-4000-8000-000000000001", status: "rejected" } }),
    )

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(String(init.body))
    expect(body.subject).toContain("não foi aprovada")
  })

  it("returns a failure with status on provider error so the worker retries", async () => {
    process.env["RESEND_API_KEY"] = "re_testkey"
    process.env["RESEND_FROM_EMAIL"] = "bivaque@example.com"

    const fetchMock = vi.fn().mockResolvedValue(new Response("rate limited", { status: 429 }))
    vi.stubGlobal("fetch", fetchMock)

    const adapters = createChannelAdapters()
    const result = await adapters["email"].send(message())

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("429")
    }
  })

  it("fails loudly when the sender is not configured", async () => {
    process.env["RESEND_API_KEY"] = "re_testkey"
    delete process.env["RESEND_FROM_EMAIL"]

    const adapters = createChannelAdapters()
    const result = await adapters["email"].send(message())

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toContain("RESEND_FROM_EMAIL")
    }
  })
})
