import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const appShell = join(root, "apps", "web", "app", "components", "bivaque", "app-shell.tsx")

describe("locality context in the app shell", () => {
  it("renders the locality name", () => {
    expect(readFileSync(appShell, "utf8")).toContain("Manaus, AM")
  })

  it("does not render a switch affordance for the locality", () => {
    expect(readFileSync(appShell, "utf8")).not.toContain("ChevronDown")
  })
})
