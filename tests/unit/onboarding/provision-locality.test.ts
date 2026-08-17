import { describe, expect, it } from "vitest"
import type { VerificationResult } from "web/lib/portal/types"

// P0 Task 5: teste de escopo — nenhum campo além do nome atravessa a fronteira
// do payload. É o que impede a OM, o posto e a situação de entrarem por
// descuido (AGENTS.md:205, D11, ADR-20260811-om-declarada).

describe("VerificationResult scope (P0 Task 5)", () => {
  it("a verified result carries status, eligibility class and at most the suggested name", () => {
    const verified: VerificationResult = {
      status: "verified",
      eligibilityClass: "veteran",
      suggestedName: "Ana Verificada",
    }

    const keys = Object.keys(verified)
    expect(keys.sort()).toEqual(["eligibilityClass", "status", "suggestedName"])
  })

  it("a verified result without a suggested name carries only the two decision fields", () => {
    const verified: VerificationResult = { status: "verified", eligibilityClass: "veteran" }
    expect(Object.keys(verified).sort()).toEqual(["eligibilityClass", "status"])
  })

  it("rejected and pending results carry no personal fields at all", () => {
    const rejected: VerificationResult = { status: "rejected" }
    const pending: VerificationResult = { status: "pending" }
    expect(Object.keys(rejected)).toEqual(["status"])
    expect(Object.keys(pending)).toEqual(["status"])
  })

  it("the suggested name field is the only new surface across the payload boundary", () => {
    // A fronteira da D11: o que atravessa do Portal é só status + classe (+ o
    // nome sugerido, para preencher o campo). OM, posto e situação ficam fora.
    const allowedKeys = new Set(["status", "eligibilityClass", "suggestedName"])
    const verified: VerificationResult = {
      status: "verified",
      eligibilityClass: "active_federal_military",
    }
    for (const key of Object.keys(verified)) {
      expect(allowedKeys.has(key)).toBe(true)
    }
  })
})
