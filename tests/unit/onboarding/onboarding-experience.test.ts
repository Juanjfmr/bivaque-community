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

  it("separates the board-38 access step from the board-39 locality step", () => {
    expect(read("page.tsx")).toContain("Verificar meu acesso")
    expect(read("locality/page.tsx")).toContain("Qual cidade você quer explorar?")
    expect(read("welcome/page.tsx")).toContain("Você chegou ao Bivaque.")
  })

  // A versão de 08/09/2026 (especificação §4.1 R14–R16 e prancha 39) substitui
  // o passo único "Localidade" por um contexto de dois passos visíveis — Cidade
  // e Perfil — antes de "Concluir". A expectativa antiga deste arquivo
  // ("Escolha sua localidade.") codificava o desenho superado; a cobertura do
  // novo contrato é maior, não menor: o esqueleto de três passos, o H1 da
  // cidade e a existência do passo de personalização passam a ser exigidos.
  it("apresenta o contexto Cidade → Perfil → Concluir da prancha 39", () => {
    expect(read("components/context-steps.tsx")).toContain('{ id: "cidade", label: "Cidade" }')
    expect(read("components/context-steps.tsx")).toContain('{ id: "perfil", label: "Perfil" }')
    expect(read("components/context-steps.tsx")).toContain('{ id: "concluir", label: "Concluir" }')
    expect(read("locality/page.tsx")).toContain("Qual cidade você quer explorar?")
    expect(read("perfil/page.tsx")).toContain("Deixe com a sua cara.")
  })

  it("gives the document exception control an explicit accessible name", () => {
    const upload = read("document-upload.tsx")

    expect(upload).toContain('htmlFor="verification-document"')
    expect(upload).toContain('id="verification-document"')
    expect(upload).toContain('aria-label="Documento para análise"')
  })
})
