import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const appDir = join(root, "apps", "web", "app")
const loginComponent = join(appDir, "(preauth)", "login", "components", "bivaque-sign-in.tsx")
const consentPage = join(appDir, "(preauth)", "consent", "page.tsx")
const codeOfConductPage = join(appDir, "(preauth)", "codigo-de-conduta", "page.tsx")
const privacyPage = join(appDir, "(preauth)", "privacidade", "page.tsx")
const callbackRoute = join(appDir, "auth", "callback", "route.ts")
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

  it("sends both passwordless providers through the canonical post-auth router", () => {
    const source = readFileSync(loginComponent, "utf8")

    expect(source).toContain('const AUTH_CALLBACK_PATH = "/auth/callback?next=/"')
    expect(source).toContain("emailRedirectTo: getAuthCallbackUrl()")
    expect(source).toContain("redirectTo: getAuthCallbackUrl()")
    expect(source).not.toContain("next=/consent")
  })

  it("requires a versioned terms checkbox before either sign-in method", () => {
    const source = readFileSync(loginComponent, "utf8")

    expect(source).toContain("function TermsCheckbox")
    expect(source).toContain('"/codigo-de-conduta" as Route')
    expect(source).toContain('"/privacidade" as Route')
    expect(source).toContain("isDisabled={loading !== null || !hasAcceptedTerms}")
    expect(source).toContain("recordConsentIntent()")
    expect(readFileSync(codeOfConductPage, "utf8")).toContain('fileName="CODIGO_DE_CONDUTA.md"')
    expect(readFileSync(privacyPage, "utf8")).toContain('fileName="PRIVACIDADE.md"')
  })

  it("keeps the legacy consent URL out of the entry flow", () => {
    const source = readFileSync(consentPage, "utf8")

    expect(source).toContain('redirect("/login?consent=required")')
    expect(source).not.toContain("ConsentForm")
  })

  it("records the accepted versions after the provider has identified the user", () => {
    const source = readFileSync(callbackRoute, "utf8")

    expect(source).toContain('serviceClient.rpc("record_consent_acceptance"')
    expect(source).toContain("p_consent_version: CONSENT_VERSION")
    expect(source).toContain("p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION")
    expect(source).toContain("response.cookies.set(CONSENT_COOKIE, String(CONSENT_VERSION)")
  })
})
