import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { consentStepTarget } from "../../../apps/web/app/auth/callback/redirect-plan"

// Hotfix de 22/10/2026: quem cria a conta pelo Google não passa pelo formulário
// de cadastro, onde fica a linha do aceite (ADR-20260907-consentimento-no-cadastro).
// Sem aceite gravado, /api/onboarding recusa a conferência do CPF com 403 e a
// pessoa fica presa na entrada. O protótipo tem o passo "Aceite" só para o
// Google (prototypes/bivaque-html/src/features/entry/login.js). A correção: o
// callback manda à tela de aceite, uma vez, a conta que nunca aceitou nada.
// Quem já aceitou qualquer versão segue direto — o aceite não reaparece.

const root = join(import.meta.dirname, "..", "..", "..")
const callback = readFileSync(
  join(root, "apps", "web", "app", "auth", "callback", "route.ts"),
  "utf8",
)

describe("conta sem aceite passa pela tela de aceite uma vez", () => {
  it("quem nunca aceitou vai para /consent", () => {
    expect(consentStepTarget(false)).toBe("/consent")
  })

  it("o convite de prestador, que tem fluxo próprio, não é desviado", () => {
    expect(consentStepTarget(false, "/prestador-convite/abc123")).toBeNull()
  })

  it("quem já aceitou alguma versão segue sem desvio", () => {
    expect(consentStepTarget(true)).toBeNull()
  })

  it("o callback consulta o aceite pelo usuário da sessão trocada e aplica o desvio", () => {
    expect(callback).toContain("consentStepTarget(")
    expect(callback).toContain('from("consent_acceptances")')
    expect(callback).toMatch(/\.eq\("user_id",\s*userId\)/)
  })

  it("falha ao consultar o aceite não deixa a pessoa seguir como se tivesse aceitado", () => {
    expect(callback).toMatch(/consent lookup failed[\s\S]{0,200}callback-error/)
  })
})
