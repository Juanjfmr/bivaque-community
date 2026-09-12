import { describe, expect, it } from "vitest"
import { computeFichaCompleteness } from "../../../apps/web/lib/service-requests/completeness"

const empty = {
  bio: null,
  catalogCount: 0,
  reachCount: 0,
  portfolioCount: 0,
  contactPhone: null,
}

describe("ficha completeness over real fields", () => {
  it("flags the first missing required item as the pendency", () => {
    const result = computeFichaCompleteness(empty)
    expect(result.complete).toBe(false)
    expect(result.pending?.text).toBe("Falta descrever o negócio")
  })

  it("moves the pendency forward as items are filled", () => {
    const result = computeFichaCompleteness({
      ...empty,
      bio: "Manutenção de ar-condicionado",
      catalogCount: 2,
    })
    expect(result.pending?.text).toBe("Falta informar onde você atende")
  })

  it("treats a phone-less ficha with all required fields as complete", () => {
    const result = computeFichaCompleteness({
      bio: "Manutenção de ar-condicionado",
      catalogCount: 2,
      reachCount: 1,
      portfolioCount: 3,
      contactPhone: null,
    })
    expect(result.complete).toBe(true)
    expect(result.pending).toBeNull()
  })

  it("never makes the optional contact field a blocker", () => {
    const result = computeFichaCompleteness({
      ...empty,
      bio: "x",
      catalogCount: 1,
      reachCount: 1,
      portfolioCount: 1,
      contactPhone: null,
    })
    const contact = result.items.find((item) => item.key === "contato")
    expect(contact?.done).toBe(true)
    expect(contact?.detail).toBe("Adicione telefone e WhatsApp")
    expect(result.complete).toBe(true)
  })

  it("marks all four required items Informado when filled", () => {
    const result = computeFichaCompleteness({
      bio: "Manutenção",
      catalogCount: 1,
      reachCount: 1,
      portfolioCount: 1,
      contactPhone: "92999999999",
    })
    const required = result.items.filter((item) => item.key !== "contato")
    expect(required.every((item) => item.detail === "Informado")).toBe(true)
  })
})
