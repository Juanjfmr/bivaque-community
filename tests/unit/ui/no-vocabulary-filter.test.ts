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

// Fragments unique to the vocabulary-filter regex (character classes and word
// boundaries), never present in plain copy. D21 removed the filter.
const REGEX_FRAGMENTS = ["an[ôo]nimo", "v[íi]deo", "organiza[çc]", "\\bOM\\b", "\\bCPF\\b"]

describe("client no longer mirrors the vocabulary filter", () => {
  it("has no forbidden-content regex in apps/web", () => {
    const offenders: string[] = []
    for (const file of sourceFiles) {
      const content = readFileSync(file, "utf8")
      for (const fragment of REGEX_FRAGMENTS) {
        if (content.includes(fragment)) offenders.push(`${file} :: ${fragment}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
