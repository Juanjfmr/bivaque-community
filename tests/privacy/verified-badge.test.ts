import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..")
const APP_DIR = join(root, "apps", "web", "app")
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"])

function collectFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...collectFiles(full))
    } else if (SOURCE_EXTENSIONS.has(entry.slice(entry.lastIndexOf(".")))) {
      files.push(full)
    }
  }
  return files
}

describe("verified badge is not part of the product", () => {
  it("never renders a 'Membro verificado' badge in the app", () => {
    const hits: string[] = []
    for (const file of collectFiles(APP_DIR)) {
      const content = readFileSync(file, "utf8")
      if (content.includes("Membro verificado") || content.includes("BadgeCheck")) {
        hits.push(file)
      }
    }
    expect(hits).toEqual([])
  })
})
