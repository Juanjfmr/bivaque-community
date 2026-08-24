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

  it("keeps eligibility and locality as separate user-visible steps", () => {
    expect(read("page.tsx")).toContain("Confirme sua elegibilidade.")
    expect(read("locality/page.tsx")).toContain("Escolha sua localidade.")
    expect(read("welcome/page.tsx")).toContain("Você chegou ao Bivaque.")
  })

  it("gives the document exception control an explicit accessible name", () => {
    const upload = read("document-upload.tsx")

    expect(upload).toContain('htmlFor="verification-document"')
    expect(upload).toContain('id="verification-document"')
    expect(upload).toContain('aria-label="Documento para análise"')
  })
})
