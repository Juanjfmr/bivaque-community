import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { consentStepTarget } from "../../../apps/web/app/auth/callback/redirect-plan"

// Hotfix de 22/10/2026 (PR #104), trazido para esta base junto com o passo
// Aceite do protótipo que ele torna alcançável: quem cria a conta pelo Google
// não passa pelo formulário de cadastro, onde fica a linha do aceite
// (ADR-20260907-consentimento-no-cadastro). Sem aceite gravado, /api/onboarding
// recusa a conferência do CPF com 403 e a pessoa fica presa na entrada. O
// protótipo tem o passo "Aceite" só para o Google
// (prototypes/bivaque-html/src/features/entry/login.js). A correção: o callback
// manda à tela de aceite, uma vez, a conta que nunca aceitou nada. Quem já
// aceitou qualquer versão segue direto — o aceite não reaparece.

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

  it("a recuperação de senha chega a /nova-senha, mesmo sem aceite", () => {
    // O código do link já foi consumido na troca: desviar para o aceite
    // deixaria a pessoa sem conseguir definir a senha nova.
    expect(consentStepTarget(false, "/nova-senha")).toBeNull()
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
    // O ramo é o do erro da consulta (lookupError), não o de "sem usuário".
    expect(callback).toMatch(/if \(lookupError\) \{[\s\S]{0,160}callback-error/)
  })
})
