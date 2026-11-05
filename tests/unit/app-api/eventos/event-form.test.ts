import { describe, expect, it } from "vitest"
import { eventInputFromBody, validateEventForm } from "web/lib/events/event-form"

describe("eventInputFromBody", () => {
  it("maps the app contract and supplies absent optional strings", () => {
    expect(eventInputFromBody({ titulo: "Encontro", comecaEm: "2026-12-01T12:00:00Z" })).toEqual({
      title: "Encontro",
      description: "",
      startsAt: "2026-12-01T12:00:00Z",
      venue: "",
      coverPath: "",
    })
  })

  it("rejects missing or wrongly typed fields and reuses form validation", () => {
    expect(eventInputFromBody({ titulo: "x", comecaEm: "2026-12-01", local: null })).toBeNull()
    expect(eventInputFromBody({ titulo: "x" })).toBeNull()
    const input = eventInputFromBody({ titulo: "x", comecaEm: "2026-12-01T12:00:00Z" })
    expect(input && validateEventForm(input)).toBe("O título precisa de pelo menos 2 caracteres.")
  })
})
