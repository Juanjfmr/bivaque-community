import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// Achado da jornada simulada de 22/09/2026: /onboarding/perfil estava fora da allowlist do
// proxy, e o verificado sem membership era devolvido a /onboarding/locality ao clicar
// Continuar. Ninguém novo concluía o cadastro. Cada passo do onboarding que a pessoa percorre
// ANTES de ter membership precisa passar pelo proxy; a página de cada um decide o estado.
// A prova de comportamento é tests/e2e/journey-entrar-e-ser-admitido.spec.ts.

const root = join(import.meta.dirname, "..", "..", "..")
const proxy = readFileSync(join(root, "apps", "web", "proxy.ts"), "utf8")

const allowlist =
  /if \(\s*pathname === "\/onboarding" \|\|([\s\S]*?)\) \{\s*return supabaseResponse/.exec(
    proxy,
  )?.[1]

describe("proxy: passos do onboarding anteriores à membership", () => {
  it("a allowlist do onboarding existe", () => {
    expect(allowlist).toBeDefined()
  })

  it.each([
    "/onboarding/status",
    "/onboarding/documento",
    "/onboarding/locality",
    "/onboarding/perfil",
  ])("%s passa pelo proxy para quem ainda não tem membership", (path) => {
    expect(allowlist).toContain(`pathname.startsWith("${path}")`)
  })

  it("o verificado sem membership continua sendo levado à cidade", () => {
    expect(proxy).toMatch(
      /if \(status === "verified"\) \{\s*return NextResponse\.redirect\(new URL\("\/onboarding\/locality"/,
    )
  })
})
