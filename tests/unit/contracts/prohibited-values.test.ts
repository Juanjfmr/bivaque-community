import { LocalityCodeSchema, PublicIdentitySchema } from "@bivaque/contracts"
import { describe, expect, it } from "vitest"

describe("portable privacy boundaries", () => {
  it("rejects an undeclared locality", () => {
    // Given a locality outside the current portable contract
    const locality = "undeclared-locality"

    // When the locality boundary attempts to parse it
    const result = LocalityCodeSchema.safeParse(locality)

    // Then it remains outside the accepted contract
    expect(result.success).toBe(false)
  })

  it("rejects affiliation and public-verification fields", () => {
    // Given data that tries to expand a public identity with private affiliation details
    const input = {
      displayName: "Pessoa da comunidade",
      localityCode: "manaus-am",
      militaryOrganization: "private-value",
      publicVerification: true,
      rank: "private-value",
    }

    // When the strict public boundary attempts to parse it
    const result = PublicIdentitySchema.safeParse(input)

    // Then the expanded identity is rejected rather than silently exposed
    expect(result.success).toBe(false)
  })
})
