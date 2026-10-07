import { describe, expect, it } from "vitest"
import { propertySearchParams } from "../../../apps/web/lib/listings/search-params"

describe("property URL filters", () => {
  it("reads approved fields with monetary precision", () => {
    const result = propertySearchParams({
      q: " Apartamento ",
      tipo: "casa",
      bairro: " Flores ",
      aluguel_max: "3200,50",
      quartos_min: "3",
    })
    expect(result.filters).toEqual({
      query: "Apartamento",
      propertyType: "casa",
      neighborhood: "Flores",
      maxRentCents: 320050,
      minBedrooms: 3,
    })
  })
  it.each(["-1", "NaN", "Infinity", "1.234", "999999999999999999999"])(
    "does not send invalid monetary filter %s",
    (aluguel_max) => {
      expect(propertySearchParams({ aluguel_max }).filters.maxRentCents).toBeUndefined()
    },
  )
  it("ignores non-scalar params and preserves absence", () => {
    expect(propertySearchParams({ q: ["x"], quartos_min: "2.5" }).filters).toEqual({
      query: "",
      propertyType: "",
      neighborhood: "",
      maxRentCents: undefined,
      minBedrooms: undefined,
    })
  })
})
