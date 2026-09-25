import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { CONSENT_PATH, isConsentRequired } from "web/lib/onboarding/consent-required"

// Quem confirma o e-mail noutro aparelho chega ao onboarding sem aceite; o 403
// "consent is required" de /api/onboarding tem de virar caminho para /consent,
// não uma string crua sem saída.

describe("isConsentRequired", () => {
  it("reconhece o 403 de aceite ausente", () => {
    expect(isConsentRequired(403, { error: "consent is required" })).toBe(true)
  })

  it.each([
    [403, { error: "forbidden" }],
    [400, { error: "consent is required" }],
    [200, {}],
    [500, { error: "consent is required" }],
  ])("não confunde %i %j com aceite ausente", (status, body) => {
    expect(isConsentRequired(status, body)).toBe(false)
  })

  it("aponta para a tela real de aceite", () => {
    expect(CONSENT_PATH).toBe("/consent")
  })
})

describe("onboarding oferece o aceite em vez do erro cru", () => {
  const page = readFileSync(
    join(process.cwd(), "apps", "web", "app", "(preauth)", "onboarding", "page.tsx"),
    "utf8",
  )

  it("as duas chamadas a /api/onboarding tratam o aceite ausente antes do erro genérico", () => {
    const checks = page.match(/isConsentRequired\(response\.status, data\)/g) ?? []
    expect(checks).toHaveLength(2)
  })

  it("mostra o caminho para /consent", () => {
    expect(page).toContain("href={CONSENT_PATH}")
    expect(page).toContain("Revisar e aceitar os termos")
  })
})

describe("o cookie de aceite só nasce onde a caixa de aceite existe", () => {
  it("o reenvio da confirmação não emite o intent de aceite", () => {
    const resend = readFileSync(
      join(
        process.cwd(),
        "apps",
        "web",
        "app",
        "auth",
        "confirmar-email",
        "confirmar-email-client.tsx",
      ),
      "utf8",
    )
    expect(resend).not.toContain("prepareSignupConsentAction")
  })
})

describe("callback-error com aceite pendente leva ao aceite, não à confirmação", () => {
  const errorPage = readFileSync(
    join(process.cwd(), "apps", "web", "app", "auth", "callback-error", "page.tsx"),
    "utf8",
  )

  it("o retry do aceite abre /consent, que grava pela sessão já criada", () => {
    expect(errorPage).toContain('href={consentRetry ? CONSENT_PATH : "/login"}')
    expect(errorPage).not.toContain('"/auth/confirmar-email"')
  })
})
