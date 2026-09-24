import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const composerFile = join(root, "apps", "web", "app", "components", "bivaque", "feed-composer.tsx")

describe("composer exposes no unimplemented controls", () => {
  const content = readFileSync(composerFile, "utf8")

  it("has no photo control", () => {
    expect(content).not.toMatch(/onOpenComposer\(\s*["']photo["']/)
    expect(content).not.toMatch(/aria-label="Nova publicacao com foto"/)
  })

  it("has no poll control", () => {
    expect(content).not.toMatch(/onOpenComposer\(\s*["']poll["']/)
    expect(content).not.toMatch(/aria-label="Nova enquete"/)
  })

  it("keeps the link control", () => {
    expect(content).toMatch(/onOpenComposer\(\s*["']link["']/)
  })
})
