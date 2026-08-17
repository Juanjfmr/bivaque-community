import { describe, expect, it } from "vitest"
import { buildSlug, normalizeCityName } from "../../../scripts/localities/generate-catalog.mjs"

describe("generate-catalog", () => {
  it("normalizes ALL-CAPS names with accents for display", () => {
    expect(normalizeCityName("ALVARÃES")).toBe("Alvarães")
  })

  it("builds a state-suffixed slug for homonymous municipalities", () => {
    expect(buildSlug("Bom Jesus", "PI")).toBe("bom-jesus-pi")
    expect(buildSlug("Bom Jesus", "RJ")).toBe("bom-jesus-rj")
  })

  it("produces distinct slugs for homonymous municipalities in different UFs", () => {
    // Este é o teste da task: sem o sufixo da UF, "Bom Jesus" colidiria.
    const pi = buildSlug("Bom Jesus", "PI")
    const rj = buildSlug("Bom Jesus", "RJ")
    expect(pi).not.toBe(rj)
    expect(pi).toBe("bom-jesus-pi")
  })

  it("keeps stop words lowercase in the middle of a name", () => {
    expect(normalizeCityName("SÃO JOSÉ DO RIO PRETO")).toBe("São José do Rio Preto")
  })
})
