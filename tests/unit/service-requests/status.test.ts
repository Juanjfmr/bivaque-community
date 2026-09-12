import { describe, expect, it } from "vitest"
import {
  formatReceived,
  QUEUE_TABS,
  requestBody,
  requestTitle,
  tabForStatus,
} from "../../../apps/web/lib/service-requests/status"

describe("service request queue tabs", () => {
  it("keeps the three tabs of prancha 23, in order", () => {
    expect(QUEUE_TABS.map((tab) => tab.label)).toEqual(["Novos", "Em conversa", "Encerrados"])
  })

  it("maps open to Novos and in_conversation to Em conversa", () => {
    expect(tabForStatus("open")).toBe("novos")
    expect(tabForStatus("in_conversation")).toBe("em_conversa")
  })

  it("maps both terminal statuses to Encerrados, without inventing a fourth tab", () => {
    expect(tabForStatus("closed")).toBe("encerrados")
    expect(tabForStatus("cancelled")).toBe("encerrados")
  })
})

describe("service request title derived from the real description field", () => {
  it("uses the first non-empty line as the title", () => {
    expect(requestTitle("Ar-condicionado não resfria\nO aparelho é split")).toBe(
      "Ar-condicionado não resfria",
    )
  })

  it("truncates a long single line on a word boundary", () => {
    const title = requestTitle(
      "Ar-condicionado não resfria e faz um ruído estranho quando liga de manhã cedo",
      32,
    )
    expect(title.length).toBeLessThanOrEqual(33)
    expect(title.endsWith("…")).toBe(true)
  })

  it("returns the remainder of the description as the body", () => {
    expect(requestBody("Título\nlinha dois\nlinha três")).toBe("linha dois\nlinha três")
  })

  it("returns an empty body for a single-line description", () => {
    expect(requestBody("Só uma linha")).toBe("")
  })
})

describe("formatReceived", () => {
  const now = new Date("2026-09-10T12:00:00.000Z")

  it("reads minutes in the panel vocabulary", () => {
    expect(formatReceived("2026-09-10T11:40:00.000Z", now)).toBe("há 20min")
  })

  it("reads hours", () => {
    expect(formatReceived("2026-09-10T11:00:00.000Z", now)).toBe("há 1h")
  })

  it("never reports a future timestamp as a fabricated age", () => {
    expect(formatReceived("2026-09-10T12:05:00.000Z", now)).toBe("agora mesmo")
  })
})
