import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const root = join(import.meta.dirname, "..", "..", "..")
const onboardingDir = join(root, "apps", "web", "app", "(preauth)", "onboarding")

function read(relativePath: string): string {
  return readFileSync(join(onboardingDir, relativePath), "utf8")
}

describe("admission screens follow boards 38 and 69", () => {
  it("renders the verify access screen with the four role options", () => {
    const page = read("page.tsx")

    expect(page).toContain("Verificar meu acesso")
    expect(page).toContain("Como você deseja verificar seu acesso?")
    expect(page).toContain("Sou militar das Forças Armadas")
    expect(page).toContain("Sou veterano")
    expect(page).toContain("Sou pensionista")
    expect(page).toContain("Recebi um convite familiar")
    expect(page).toContain("Digite seu CPF")
    expect(page).toContain("A verificação por CPF é praticamente instantânea.")
    expect(page).toContain("Se não conseguirmos confirmar, você poderá enviar sua identidade.")
  })

  it("renders the progress rail with the three board-38 steps", () => {
    const shell = read("components/admission-shell.tsx")

    expect(shell).toContain('label: "E-mail"')
    expect(shell).toContain('label: "Seu acesso"')
    expect(shell).toContain('label: "Cidade"')
    expect(shell).toContain("Seu progresso")
  })

  it("exposes the single-file document route and its replacement state", () => {
    const page = read("documento/page.tsx")
    const form = read("document-upload.tsx")

    expect(page).toContain("Enviar identidade")
    expect(page).toContain("Precisamos de outro arquivo")
    expect(page).toContain("Voltar à verificação")
    expect(form).toContain("Identidade militar digital")
    expect(form).toContain("Arquivo não legível")
    expect(form).toContain("Envie o documento completo em um único arquivo.")
    expect(form).toContain("Substituir arquivo")
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
