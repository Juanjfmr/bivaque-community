import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { ONBOARDING_CPF_KEY, purgeCpfResidue } from "web/lib/onboarding/storage"

const root = join(import.meta.dirname, "..", "..")
const ONBOARDING_PAGE = join(root, "apps", "web", "app", "(preauth)", "onboarding", "page.tsx")

describe("onboarding CPF session storage", () => {
  it("purges the residue key on boot without reading it back", () => {
    const removed: string[] = []
    purgeCpfResidue({
      removeItem: (key: string) => {
        removed.push(key)
      },
    })
    expect(removed).toEqual([ONBOARDING_CPF_KEY])
  })

  it("never writes the CPF to sessionStorage", () => {
    const content = readFileSync(ONBOARDING_PAGE, "utf8")
    expect(content).not.toMatch(/sessionStorage\.setItem\(\s*["']onboarding:cpf/)
  })

  it("never reads the CPF back from sessionStorage", () => {
    const content = readFileSync(ONBOARDING_PAGE, "utf8")
    expect(content).not.toMatch(/sessionStorage\.getItem\(\s*["']onboarding:cpf/)
  })

  it("boots with the residue purge in place", () => {
    const content = readFileSync(ONBOARDING_PAGE, "utf8")
    expect(content).toMatch(/purgeCpfResidue\(sessionStorage\)/)
  })
})
