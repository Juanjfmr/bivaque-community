import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const onboardingDir = join(root, "apps", "web", "app", "(preauth)", "onboarding")

function read(relativePath: string): string {
  return readFileSync(join(onboardingDir, relativePath), "utf8")
}

describe("onboarding experience", () => {
  it("presents the canonical three-stage entry journey", () => {
    const shell = read("components/onboarding-shell.tsx")

    expect(shell).toContain('{ id: "rules", label: "Regras" }')
    expect(shell).toContain('{ id: "eligibility", label: "Elegibilidade" }')
    expect(shell).toContain('{ id: "locality", label: "Localidade" }')
  })

  it("does not reintroduce Manaus as an admission boundary or fixed welcome", () => {
    const admissionSource = [read("page.tsx"), read("status/page.tsx"), read("welcome/page.tsx")]
      .join("\n")
      .toLocaleLowerCase("pt-BR")

    expect(admissionSource).not.toContain("piloto hoje acontece só em manaus")
    expect(admissionSource).not.toContain("bem-vindo à comunidade de manaus")
    expect(admissionSource).not.toContain("outras localidades abrirem")
  })

  it("separates the board-38 access step from the board-39 city step", () => {
    // PORT-004 (frente B): a prancha 38 virou a elegibilidade do protótipo
    // ("Confirme seu vínculo."), com o CPF direto e sem a pergunta do tipo de
    // vínculo. A prancha 39 virou a tela de cidade e momento (PORT-005), coberta
    // logo abaixo.
    expect(read("page.tsx")).toContain("Confirme seu vínculo.")
    expect(read("page.tsx")).not.toContain("Como você deseja verificar seu acesso?")
    expect(read("welcome/page.tsx")).toContain("Você chegou ao Bivaque.")
  })

  // PORT-005 (ADR-20261022-entrada-do-prototipo, item 3): a entrada segue o
  // protótipo. Cidade e momento são UMA tela — cidade, momento, a data que o
  // momento pede, destino (só em "Saindo") e "como quer ser chamado" —, e o
  // passo de personalização deixou de fazer parte da entrada: ele desvia para
  // cá, e foto/Força/interesses ficam para o perfil.
  it("apresenta a tela de cidade e momento do protótipo", () => {
    const city = read("locality/page.tsx")

    expect(city).toContain("Onde e em que momento?")
    expect(city).toContain("Concluir minha entrada")
  })

  it("mantém a tela de cidade fora do esqueleto antigo de três passos", () => {
    const city = read("locality/page.tsx")

    expect(city).toContain("EntrySteps")
    expect(city).not.toContain("ContextSteps")
  })

  it("o passo de perfil deixou de fazer parte da entrada e desvia para a cidade", () => {
    const profile = read("perfil/page.tsx")

    expect(profile).toContain('redirect("/onboarding/locality")')
    expect(profile).not.toContain("Deixe com a sua cara.")
  })

  it("gives the document exception control an explicit accessible name", () => {
    const upload = read("document-upload.tsx")

    expect(upload).toContain('htmlFor="verification-document"')
    expect(upload).toContain('id="verification-document"')
    expect(upload).toContain('aria-label="Documento para análise"')
  })
})
