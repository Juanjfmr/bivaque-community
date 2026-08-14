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

describe("feed exposes no post save control without a destination", () => {
  it("never writes or reads post_saves", () => {
    const offenders = sourceFiles.filter((file) =>
      readFileSync(file, "utf8").includes("post_saves"),
    )
    expect(offenders).toEqual([])
  })

  it("never exposes the bookmark toggle props", () => {
    const offenders = sourceFiles.filter((file) => {
      const content = readFileSync(file, "utf8")
      return content.includes("onBookmarkToggle") || content.includes("isBookmarked")
    })
    expect(offenders).toEqual([])
  })
})
