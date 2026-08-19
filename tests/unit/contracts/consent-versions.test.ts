import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import { describe, expect, it } from "vitest"

// D2 Task 3: the unit side of the single source. The application files import
// these constants; the scope guard (tests/scope/consent-version.test.mjs) proves
// no app file declares its own copy. This test pins the values to positive
// integers so a bad edit (0 or negative) fails here, not in a live production
// "consent is required" error.

describe("consent version constants", () => {
  it("are positive integers", () => {
    expect(Number.isInteger(CONSENT_VERSION)).toBe(true)
    expect(CONSENT_VERSION).toBeGreaterThanOrEqual(1)
    expect(Number.isInteger(CODE_OF_CONDUCT_VERSION)).toBe(true)
    expect(CODE_OF_CONDUCT_VERSION).toBeGreaterThanOrEqual(1)
  })

  it("are exported from the public entry point", () => {
    expect(CONSENT_VERSION).toBeDefined()
    expect(CODE_OF_CONDUCT_VERSION).toBeDefined()
  })
})
