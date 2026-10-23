import { describe, expect, it } from "vitest"
import { findOrganizationInCity, listOrganizationsByCity } from "../../../apps/web/lib/om/catalog"

describe("military organization directory", () => {
  it("lists public organizations only in the requested municipality", () => {
    const results = listOrganizationsByCity("Manaus", "AM")
    expect(results.length).toBeGreaterThan(0)
    expect(
      results.every(
        (entry) => entry.uf === "AM" && entry.city.toLocaleLowerCase("pt-BR") === "manaus",
      ),
    ).toBe(true)
  })
  it("does not accept an OM from another municipality", () => {
    const mana = listOrganizationsByCity("Manaus", "AM")[0]
    expect(mana).toBeDefined()
    expect(findOrganizationInCity(mana.id, "Rio de Janeiro", "RJ")).toBeNull()
  })
  it("never exposes addresses or geographic site coordinates", () => {
    const record = listOrganizationsByCity("Manaus", "AM")[0]
    expect(record).toBeDefined()
    expect(record).not.toHaveProperty("latitude")
    expect(record).not.toHaveProperty("longitude")
    expect(record).not.toHaveProperty("public_address")
    expect(record).not.toHaveProperty("site_id")
  })
})
