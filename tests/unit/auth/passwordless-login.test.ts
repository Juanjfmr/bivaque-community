import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const appDir = join(root, "apps", "web", "app")
const loginComponent = join(appDir, "(preauth)", "login", "components", "bivaque-sign-in.tsx")
const signupPage = join(appDir, "(preauth)", "signup", "page.tsx")
const landingPage = join(appDir, "landing", "landing.tsx")

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

  it("explains the passwordless benefit without exposing session internals", () => {
    const source = readFileSync(loginComponent, "utf8")
    expect(source).toContain("Sem senha para lembrar")
    expect(source).not.toContain("400 dias")
  })

  it("separates returning members from deliberate account creation", () => {
    const entrySource = readFileSync(loginComponent, "utf8")
    const signupSource = readFileSync(signupPage, "utf8")
    const landingSource = readFileSync(landingPage, "utf8")

    expect(signupSource).toContain('mode="signup"')
    expect(entrySource).toContain('shouldCreateUser: mode === "signup"')
    expect(entrySource).toContain('alternateHref: "/signup"')
    expect(landingSource).toContain('pathname: "/signup"')
  })
})
