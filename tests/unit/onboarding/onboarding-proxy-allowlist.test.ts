import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { areaDoPrestador, entradaEmAndamento } from "web/lib/security/route-surface"

// Achado da jornada simulada de 22/09/2026: /onboarding/perfil estava fora da allowlist do
// proxy, e o verificado sem membership era devolvido a /onboarding/locality ao clicar
// Continuar. Ninguém novo concluía o cadastro. Os passos anteriores à membership agora são
// decididos pelos predicados de route-surface.ts; a prova de comportamento continua em
// tests/e2e/journey-entrar-e-ser-admitido.spec.ts e tests/e2e/middleware-session-gate.spec.ts.

const root = join(import.meta.dirname, "..", "..", "..")
const proxy = readFileSync(join(root, "apps", "web", "proxy.ts"), "utf8")

describe("proxy: passos do onboarding anteriores à membership", () => {
  it.each([
    "/onboarding",
    "/onboarding/status",
    "/onboarding/documento",
    "/onboarding/locality",
    "/onboarding/perfil",
  ])("%s é entrada em andamento", (path) => {
    expect(entradaEmAndamento(path)).toBe(true)
  })

  it.each(["/onboardingx", "/onboarding/statusx", "/onboarding/qualquer-coisa"])(
    "%s não é entrada em andamento",
    (path) => {
      expect(entradaEmAndamento(path)).toBe(false)
    },
  )

  it("a área do prestador cobre a subárvore real e recusa o prefixo solto", () => {
    expect(areaDoPrestador("/prestador")).toBe(true)
    expect(areaDoPrestador("/prestadores")).toBe(true)
    expect(areaDoPrestador("/prestadores/abc")).toBe(true)
    expect(areaDoPrestador("/prestadorx")).toBe(false)
  })

  it("o verificado sem membership continua sendo levado à cidade", () => {
    expect(proxy).toMatch(
      /if \(status === "verified"\) \{\s*return NextResponse\.redirect\(new URL\("\/onboarding\/locality"/,
    )
  })
})
