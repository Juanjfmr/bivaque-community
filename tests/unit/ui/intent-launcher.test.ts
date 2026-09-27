import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// DS-006 (prancha 01, ajuste de densidade de 20/09): a Home de membro ativo tem
// DUAS intenções com destinos distintos — nada de uma entrada genérica só. A
// pergunta abre o compositor que já existe; a indicação chega ao painel do Guia
// pelo parâmetro de aba real. O lançador não é hero.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const launcher = read("apps", "web", "app", "components", "bivaque", "intent-launcher.tsx")
const page = read("apps", "web", "app", "(shell)", "inicio", "page.tsx")

describe("lançador de intenções da Home (DS-006)", () => {
  it("oferece as duas intenções nomeadas do contrato", () => {
    expect(launcher).toContain("Fazer uma pergunta")
    expect(launcher).toContain("Pedir uma indicação")
  })

  it("as duas ações têm destinos distintos e ambos são reais", () => {
    // Pergunta: botão que abre o compositor existente.
    expect(launcher).toContain('data-testid="intent-pergunta"')
    expect(launcher).toContain("onClick={onAskQuestion}")
    // Indicação: link para a aba real de /recommendations.
    expect(launcher).toContain('data-testid="intent-indicacao"')
    expect(launcher).toContain("href={ASK_INDICATION_HREF as Route}")
    expect(launcher).toContain("ASK_INDICATION_HREF")
  })

  it("a pergunta reusa o mecanismo de publicação que já existe", () => {
    // A página abre o CreatePostModal montado nela; o lançador não publica nada.
    expect(page).toContain('onAskQuestion={() => handleOpenModal("text")}')
    expect(page).toContain("<CreatePostModal")
    expect(launcher).not.toContain('.from("posts")')
    expect(launcher).not.toContain(".insert(")
  })

  it("a entrada genérica antiga não convive com o lançador", () => {
    expect(launcher).not.toContain("O que você quer compartilhar?")
    expect(page).not.toContain("InicioComposer")
    expect(existsSync(join(root, "apps", "web", "app", "(shell)", "inicio", "composer.tsx"))).toBe(
      false,
    )
  })

  it("os dois alvos respeitam 44px e têm foco visível", () => {
    // A propriedade real é "as duas ações têm 44px e foco visível", não a
    // contagem de ocorrências no arquivo: a classe base é uma só e as duas
    // ações derivam dela.
    const base = launcher.slice(
      launcher.indexOf("const ACTION_BASE"),
      launcher.indexOf("const ACTION_BORDERED"),
    )
    expect(base).toContain("min-h-11")
    expect(base).toContain("focus-visible:ring-2")
    expect(launcher).toContain("askAction(ACTION_")
    expect(launcher).toContain("indicationAction(ACTION_")
    expect(launcher).toContain('aria-labelledby="intent-launcher-titulo"')
  })

  it("quem não tem comunidade é orientado pelo feed, não por um lançador maior", () => {
    // Desde 25/09/2026 o lançador é uma linha só em todo estado; a explicação
    // para quem ainda não participa mora no estado vazio do feed, com a ação.
    const section = read("apps", "web", "app", "(shell)", "inicio", "community-section.tsx")
    expect(launcher).not.toContain('variant === "explain"')
    expect(section).toContain("Você ainda não participa de uma comunidade")
    expect(section).toContain('href="/communities"')
  })
})
