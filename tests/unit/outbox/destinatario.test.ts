import type { OutboxMessage } from "@bivaque/domain"
import { afterEach, expect, it, vi } from "vitest"
import { createChannelAdapters } from "web/lib/outbox/adapters"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

it("recusa destinatários inválidos antes de chamar o provedor", async () => {
  vi.stubEnv("RESEND_API_KEY", "teste")
  vi.stubEnv("RESEND_FROM_EMAIL", "bivaque@example.invalid")
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
  vi.stubGlobal("fetch", fetchMock)
  const message: OutboxMessage = {
    id: "1",
    recipient: "owner-link@local",
    channel: "email",
    type: "community_invite",
    payload: {},
    attempts: 0,
    updatedAt: 0,
  }
  for (const recipient of [
    "owner-link@local",
    "event-invite:123",
    "a..b@example.com",
    "a@-example.com",
    "a@example.com,b@example.com",
  ]) {
    expect((await createChannelAdapters().email.send({ ...message, recipient })).ok).toBe(false)
  }
  expect(fetchMock).not.toHaveBeenCalled()
})

it("entrega destinatário válido ao provedor", async () => {
  vi.stubEnv("RESEND_API_KEY", "teste")
  vi.stubEnv("RESEND_FROM_EMAIL", "bivaque@example.invalid")
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }))
  vi.stubGlobal("fetch", fetchMock)
  const message: OutboxMessage = {
    id: "1",
    recipient: "pessoa@example.invalid",
    channel: "email",
    type: "community_invite",
    payload: {},
    attempts: 0,
    updatedAt: 0,
  }
  expect((await createChannelAdapters().email.send(message)).ok).toBe(true)
  const calls = fetchMock.mock.calls as unknown as [string, RequestInit][]
  const body = JSON.parse(String(calls[0]?.[1].body))
  expect(body.to).toEqual([message.recipient])
})
