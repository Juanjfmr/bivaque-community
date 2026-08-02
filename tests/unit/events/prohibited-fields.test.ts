import { EventCreateSchema } from "@bivaque/contracts"
import { describe, expect, it } from "vitest"

describe("EventCreateSchema prohibited fields", () => {
  const validEvent = {
    title: "Encontro Comunitário",
    localityId: "00000000-0000-4000-8000-000000000001",
    startsAt: "2026-09-01T18:00:00.000Z",
    venue: "Parque Municipal",
  } as const

  it("accepts a valid event creation payload", () => {
    const result = EventCreateSchema.safeParse(validEvent)
    expect(result.success).toBe(true)
  })

  it("rejects an event with ticket_price field", () => {
    const result = EventCreateSchema.safeParse({
      ...validEvent,
      ticket_price: 29.9,
    })
    expect(result.success).toBe(false)
  })

  it("rejects an event with payment_url field", () => {
    const result = EventCreateSchema.safeParse({
      ...validEvent,
      payment_url: "https://pay.example.com/event/1",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an event with personal_address field", () => {
    const result = EventCreateSchema.safeParse({
      ...validEvent,
      personal_address: "Rua das Flores, 123",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an event with public_alert field", () => {
    const result = EventCreateSchema.safeParse({
      ...validEvent,
      public_alert: true,
    })
    expect(result.success).toBe(false)
  })

  it("rejects an event with video_event_url field", () => {
    const result = EventCreateSchema.safeParse({
      ...validEvent,
      video_event_url: "https://stream.example.com/live",
    })
    expect(result.success).toBe(false)
  })

  it("rejects an event with sponsor_info field", () => {
    const result = EventCreateSchema.safeParse({
      ...validEvent,
      sponsor_info: { name: "Patrocinador X", tier: "gold" },
    })
    expect(result.success).toBe(false)
  })

  it("rejects venue containing a residential address pattern", () => {
    const result = EventCreateSchema.safeParse({
      ...validEvent,
      venue: "Rua das Flores, 123 - Apartamento 45",
    })
    expect(result.success).toBe(false)
  })

  it("rejects venue containing a military address", () => {
    const result = EventCreateSchema.safeParse({
      ...validEvent,
      venue: "Quartel General do Exército",
    })
    expect(result.success).toBe(false)
  })
})
