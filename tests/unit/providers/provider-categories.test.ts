import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PROVIDER_CATEGORIES } from "@bivaque/domain"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")

describe("provider categories", () => {
  it("keeps the closed domain list aligned with the generated database enum", () => {
    // Given the public types generated from the local database
    const generatedTypes = readFileSync(join(root, "supabase", "database.generated.ts"), "utf8")
    const constantsSource = generatedTypes.slice(generatedTypes.indexOf("export const Constants"))

    // When provider_category is read from the generated runtime constants
    const enumSource = constantsSource.match(/provider_category:\s*\[([^\]]+)\]/s)?.[1]
    const databaseCategories = enumSource?.match(/"[^"]+"/g)?.map((value) => value.slice(1, -1))

    // Then the database and domain expose the same twelve values in the same order
    expect(databaseCategories).toEqual(PROVIDER_CATEGORIES)
  })
})
