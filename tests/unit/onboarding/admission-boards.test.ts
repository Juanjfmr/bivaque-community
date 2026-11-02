import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const onboardingDir = join(root, "apps", "web", "app", "(preauth)", "onboarding")

function read(relativePath: string): string {
  return readFileSync(join(onboardingDir, relativePath), "utf8")
}

describe("admission screens follow boards 38 and 69", () => {
  // PORT-004 (frente B): a prancha 38 da elegibilidade passou a ser a tela do
  // protótipo (`renderEntryCpf`): CPF direto, "Por que o CPF" e o link do
  // convite, sem a pergunta do tipo de vínculo. A expectativa antiga guardava as
  // quatro opções e o texto "Verificar meu acesso"; o contrato novo guarda o que
  // passou a valer, e continua recusando o que não pode voltar.
  it("renders the eligibility screen with the prototype copy", () => {
    const page = read("page.tsx")

    expect(page).toContain("Confirme seu vínculo.")
    expect(page).toContain("Para militares federais ativos, veteranos e pensionistas militares.")
    expect(page).toContain("Por que o CPF")
    expect(page).toContain("É cônjuge ou dependente?")
    expect(page).toContain('href="/convite"')
    expect(page).not.toContain("Como você deseja verificar seu acesso?")
    expect(page).not.toContain("RadioGroup")
  })

  it("renders the progress rail with the three board-38 steps", () => {
    const shell = read("components/admission-shell.tsx")

    expect(shell).toContain('label: "E-mail"')
    expect(shell).toContain('label: "Seu acesso"')
    expect(shell).toContain('label: "Cidade"')
    expect(shell).toContain("Seu progresso")
  })

  it("keeps the result and pending states of the prototype", () => {
    const page = read("page.tsx")
    const status = read("status/page.tsx")

    expect(page).toContain("Não localizamos o vínculo.")
    expect(page).toContain("Não conseguimos consultar agora.")
    expect(page).toContain("Tentar de novo")
    expect(status).toContain("pendingTimeline")
    expect(status).toContain("Você pode sair e voltar: o status fica aqui.")
  })

  it("exposes the single-file document route and its replacement state", () => {
    const page = read("documento/page.tsx")
    const form = read("document-upload.tsx")

    expect(page).toContain("Envie um documento.")
    expect(page).toContain("A equipe pediu outro documento.")
    expect(form).toContain("Enviar um documento")
    expect(form).toContain("PDF, JPG ou PNG, até 10 MB.")
    expect(form).toContain('aria-label="Documento para análise"')
  })

  it("does not claim AI recognition nor promise a deadline", () => {
    const copy = [
      read("page.tsx"),
      read("documento/page.tsx"),
      read("status/page.tsx"),
      read("document-upload.tsx"),
    ].join("\n")

    expect(copy).not.toMatch(/\bIA\b/)
    expect(copy).not.toContain("reconhecimento")
    expect(copy).not.toContain("7 dias")
    expect(copy).not.toContain("horas úteis")
  })

  it("registers the document route in the visual capture", () => {
    const capture = readFileSync(join(root, "scripts", "visual", "capture.mjs"), "utf8")

    expect(capture).toContain('"/onboarding/documento"')
  })
})
