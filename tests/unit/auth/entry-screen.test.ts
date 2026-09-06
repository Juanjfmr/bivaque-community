import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// A primeira tela de entrada existe nas duas superfícies e precisa oferecer a
// mesma escolha explícita — entrar ou criar conta — apontando para as rotas
// certas. Estas asserções travam essa distinção contra uma regressão silenciosa
// (PROCESSO-DE-CONSTRUCAO §12.3).
const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const webEntry = read(
  "apps",
  "web",
  "app",
  "(preauth)",
  "login",
  "components",
  "bivaque-sign-in.tsx",
)
const webEntryStyles = read(
  "apps",
  "web",
  "app",
  "(preauth)",
  "login",
  "components",
  "bivaque-sign-in.module.css",
)
const mobileIndex = read("apps", "mobile", "app", "index.tsx")
const mobileWelcome = read("apps", "mobile", "app", "(auth)", "boas-vindas.tsx")
const mobileAccess = read("apps", "mobile", "app", "(auth)", "acesso.tsx")

describe("web entry screen", () => {
  it("offers both paths as navigation to their own routes", () => {
    expect(webEntry).toContain('{ mode: "login", label: "Entrar", href: "/login" }')
    expect(webEntry).toContain('{ mode: "signup", label: "Criar conta", href: "/signup" }')
  })

  it("marks the active path for assistive technology", () => {
    expect(webEntry).toContain('aria-current={entry.mode === mode ? "page" : undefined}')
    expect(webEntry).toContain('aria-label="Escolha como entrar no Bivaque"')
  })

  it("keeps the switch options at the minimum touch target", () => {
    const option = webEntryStyles.match(/\.modeOption \{[^}]*\}/)?.[0] ?? ""
    expect(option).toContain("min-height: 44px")
  })

  it("uses the focus tokens for the visible ring, not the action colour", () => {
    expect(webEntryStyles).toContain("outline: 2px solid var(--semantic-focus-outer)")
    expect(webEntryStyles).not.toContain("outline: 2px solid var(--semantic-action-primary)")
  })
})

describe("mobile entry screen", () => {
  it("opens on the welcome screen instead of the signed-in tabs", () => {
    expect(mobileIndex).toContain('<Redirect href="/(auth)/boas-vindas" />')
    expect(mobileIndex).not.toContain('href="/(tabs)')
  })

  it("carries the chosen mode to the e-mail step", () => {
    expect(mobileWelcome).toContain('router.push("/(auth)/acesso?modo=criar-conta")')
    expect(mobileWelcome).toContain('router.push("/(auth)/acesso?modo=entrar")')
  })

  it("does not turn account creation into community access", () => {
    expect(mobileWelcome).toContain(
      "Criar conta não concede participação em uma comunidade privada.",
    )
  })

  it("never fakes the e-mail delivery that is not wired yet", () => {
    expect(mobileAccess).not.toContain("signInWithOtp")
    expect(mobileAccess).not.toContain("signInWithOAuth")
    expect(mobileAccess).toContain("ainda não está ligado no aplicativo")
    expect(mobileAccess).toContain("<Button label={copy.submit} disabled")
  })
})
