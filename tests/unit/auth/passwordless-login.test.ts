import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const appDir = join(root, "apps", "web", "app")
const loginComponent = join(appDir, "(preauth)", "login", "components", "bivaque-sign-in.tsx")

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

describe("passwordless login has no password affordances", () => {
  it("never shows 'Manter conectado' anywhere in apps/web/app", () => {
    const offenders = sourceFiles.filter((file) =>
      readFileSync(file, "utf8").includes("Manter conectado"),
    )
    expect(offenders).toEqual([])
  })

  it("never shows 'Esqueci minha senha' anywhere in apps/web/app", () => {
    const offenders = sourceFiles.filter((file) =>
      readFileSync(file, "utf8").includes("Esqueci minha senha"),
    )
    expect(offenders).toEqual([])
  })

  it("states the session duration instead", () => {
    expect(readFileSync(loginComponent, "utf8")).toContain("400 dias")
  })
})
