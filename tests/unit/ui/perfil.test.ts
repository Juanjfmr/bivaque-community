import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// O próprio perfil refeito em 25/09/2026, com referências do Mobbin (Nextdoor,
// Digg, AllTrails): o perfil mostra a pessoa e o que ela faz no Bivaque; a
// edição fica em /profile/editar; notificações e família ficam em
// Configurações. LIMITE: leitura de fonte; o comportamento foi provado no
// navegador a 375 e 1440 (salvar a apresentação e vê-la no perfil).

const root = join(import.meta.dirname, "..", "..", "..")
const profile = (...segments: string[]) =>
  readFileSync(join(root, "apps", "web", "app", "(shell)", "profile", ...segments), "utf8")

const view = profile("page.tsx")
const edit = profile("editar", "page.tsx")
const indications = profile("profile-indications.tsx")

describe("o perfil mostra; a edição fica à parte", () => {
  it("a vista não tem formulário de edição", () => {
    expect(view).not.toContain("<Input")
    expect(view).not.toContain("<TextArea")
    expect(view).not.toContain("saveAffiliationAction")
    expect(view).toContain('href="/profile/editar"')
  })

  it("a ordem: quem é, seu espaço, comunidades, indicações, cidade", () => {
    const order = [
      "<h1",
      'id="perfil-atalhos"',
      'id="perfil-comunidades"',
      "<ProfileIndications",
      "<CitySection />",
    ].map((marker) => view.indexOf(marker))
    for (const position of order) expect(position).toBeGreaterThan(-1)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it("só o que a pessoa escolheu mostrar vira etiqueta de vínculo", () => {
    expect(view).toContain("if (!row.is_visible || !row.value) continue")
  })

  it("notificações e família saíram do perfil: moram em Configurações", () => {
    expect(view).not.toContain("NotificationPreferencesSection")
    expect(view).not.toContain("FamilyInviteSection")
  })
})

describe("editar perfil", () => {
  it("foto, nome, apresentação, vínculo e assuntos, com a mesma gravação de antes", () => {
    expect(edit).toContain("<AvatarSection />")
    expect(edit).toContain('id="profile-name"')
    expect(edit).toContain('id="profile-bio"')
    expect(edit).toContain("saveAffiliationAction(normalized)")
    expect(edit).toContain("saveBioAction(bio)")
    expect(edit).toContain('href="/profile/interests"')
  })
})

describe("suas indicações", () => {
  it("pedidos e respostas levam à conversa de cada um", () => {
    expect(indications).toContain('.eq("author_id", userId)')
    expect(indications.match(/indicationHref\(/g)?.length).toBe(2)
  })

  it("sem placar nem contagem de 'ajudou a resolver' no perfil", () => {
    expect(indications).not.toMatch(/count\(\*\)|resolveram|pontos|ranking/i)
    expect(indications).not.toMatch(/ajudou a resolver \d|\d+ vezes/i)
  })
})
