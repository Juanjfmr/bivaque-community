import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const appDir = join(root, "apps", "web", "app")

function collectSourceFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full))
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      files.push(full)
    }
  }
  return files
}

const sourceFiles = collectSourceFiles(appDir)

describe("no empty promises in the UI", () => {
  it("never shows the dead group onboarding progress counter", () => {
    const offenders = sourceFiles.filter((file) =>
      readFileSync(file, "utf8").includes("de 3 passos"),
    )
    expect(offenders).toEqual([])
  })

  it("never shows the event comments stub", () => {
    const offenders = sourceFiles.filter((file) => readFileSync(file, "utf8").includes("Em breve"))
    expect(offenders).toEqual([])
  })
})
