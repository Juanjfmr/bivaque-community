import {
  LocalityCodeSchema,
  PrivacyVisibilitySchema,
  PublicIdentitySchema,
} from "@bivaque/contracts"
import { describe, expect, it } from "vitest"

describe("portable public contracts", () => {
  it("accepts the pilot locality when parsing a public identity", () => {
    // Given a minimal public identity for the approved pilot locality
    const input = {
      displayName: "Pessoa da comunidade",
      localityCode: "manaus-am",
    }

    // When the boundary contract parses it
    const identity = PublicIdentitySchema.parse(input)

    // Then only the portable public fields remain available
    expect(identity).toEqual(input)
  })

  it("accepts only the declared locality and privacy literals", () => {
    // Given the approved portable literals
    const locality = "manaus-am"
    const visibility = "community"

    // When each boundary schema parses its value
    const parsed = {
      locality: LocalityCodeSchema.parse(locality),
      visibility: PrivacyVisibilitySchema.parse(visibility),
    }

    // Then both literals preserve their exact value
    expect(parsed).toEqual({ locality, visibility })
  })
})
