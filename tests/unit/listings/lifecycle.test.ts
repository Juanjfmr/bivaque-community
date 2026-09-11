import { describe, expect, it } from "vitest"
import {
  ACTION_TARGET,
  allowedActions,
  canTransition,
  formatAvailableUntilLong,
  formatAvailableUntilShort,
  formatPublishedAt,
  pickupLabel,
  statusGroup,
  statusLabel,
  statusTone,
  tabCounts,
  validateListingEdit,
} from "../../../apps/web/lib/listings/lifecycle"

describe("allowedActions", () => {
  it("lets an active listing pause, reserve, sell or close", () => {
    expect(allowedActions("active")).toEqual(["pause", "reserve", "sell", "close"])
  })

  it("lets a paused listing reactivate or close", () => {
    expect(allowedActions("paused")).toEqual(["reactivate", "close"])
  })

  it("treats closed as terminal", () => {
    expect(allowedActions("closed")).toEqual([])
  })

  it("falls back to no actions for an unknown status", () => {
    expect(allowedActions("exploded")).toEqual([])
  })
})

describe("canTransition", () => {
  it("allows a legal transition", () => {
    expect(canTransition("reserved", "sell")).toBe(true)
  })

  it("refuses reopening a closed listing", () => {
    expect(canTransition("closed", "reactivate")).toBe(false)
  })

  it("refuses pausing a draft", () => {
    expect(canTransition("draft", "pause")).toBe(false)
  })
})

describe("action targets", () => {
  it("maps each action to its status", () => {
    expect(ACTION_TARGET.publish).toBe("active")
    expect(ACTION_TARGET.pause).toBe("paused")
    expect(ACTION_TARGET.sell).toBe("sold")
    expect(ACTION_TARGET.close).toBe("closed")
  })
})

describe("statusGroup / tabCounts", () => {
  it("groups draft and paused under Ativos and sold/closed under Encerrados", () => {
    expect(statusGroup("draft")).toBe("active")
    expect(statusGroup("paused")).toBe("active")
    expect(statusGroup("sold")).toBe("closed")
    expect(statusGroup("closed")).toBe("closed")
    expect(statusGroup("reserved")).toBe("reserved")
  })

  it("counts each group once per listing", () => {
    expect(tabCounts(["active", "active", "paused", "reserved", "sold", "closed"])).toEqual({
      active: 3,
      reserved: 1,
      closed: 2,
    })
  })
})

describe("labels and tone", () => {
  it("labels known statuses and falls back safely", () => {
    expect(statusLabel("active")).toBe("Ativo")
    expect(statusLabel("sold")).toBe("Vendido")
    expect(statusLabel("exploded")).toBe("Anúncio")
  })

  it("maps a status to a chip tone", () => {
    expect(statusTone("active")).toBe("active")
    expect(statusTone("paused")).toBe("attention")
    expect(statusTone("closed")).toBe("done")
    expect(statusTone("draft")).toBe("muted")
  })
})

describe("availability and pickup", () => {
  it("shows a combinar when the date is absent", () => {
    expect(formatAvailableUntilShort(null)).toBe("A combinar")
    expect(formatAvailableUntilLong(null)).toBe("A combinar")
  })

  it("keeps the date-only value on its own calendar day", () => {
    expect(formatAvailableUntilShort("2026-10-20")).toContain("20")
    expect(formatAvailableUntilShort("2026-10-20")).toContain("out")
    expect(formatAvailableUntilLong("2026-10-20")).toContain("20")
    expect(formatAvailableUntilLong("2026-10-20")).toContain("outubro")
  })

  it("defaults pickup to a combinar and keeps a real note", () => {
    expect(pickupLabel(null)).toBe("a combinar")
    expect(pickupLabel("  ")).toBe("a combinar")
    expect(pickupLabel("Pego no centro")).toBe("Pego no centro")
  })

  it("labels an unpublished listing as Rascunho", () => {
    expect(formatPublishedAt(null)).toBe("Rascunho")
    expect(formatPublishedAt("2026-09-12T10:00:00.000Z")).toContain("set")
  })
})

describe("validateListingEdit", () => {
  const validDraft = {
    title: "Mesa de jantar",
    category: "casa_moveis",
    priceInput: "650,00",
    condition: "used_good",
    description: "Mesa usada, sem detalhes.",
    neighborhood: "Centro",
  }

  it("accepts a valid edit and converts the price to cents", () => {
    const result = validateListingEdit(validDraft)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.priceCents).toBe(65000)
      expect(result.value.neighborhood).toBe("Centro")
    }
  })

  it("rejects a short title", () => {
    const result = validateListingEdit({ ...validDraft, title: "ab" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.title).toBeDefined()
  })

  it("rejects an address-like neighborhood", () => {
    const result = validateListingEdit({ ...validDraft, neighborhood: "Rua das Flores 123" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.neighborhood).toBeDefined()
  })

  it("rejects an unparsable price", () => {
    const result = validateListingEdit({ ...validDraft, priceInput: "combinar" })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.price).toBeDefined()
  })

  it("rejects an empty description", () => {
    const result = validateListingEdit({ ...validDraft, description: "   " })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.description).toBeDefined()
  })
})
