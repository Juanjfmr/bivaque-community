import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

// DS-006: na Home de membro ativo o retorno relevante vem ANTES do lançador
// compacto de intenções, e o lançador não pode virar hero — o primeiro item do
// feed tem de continuar dentro da dobra em 768 e 1440 (a medida foi feita no
// navegador; aqui fica a guarda de composição que impede a regressão silenciosa).

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const page = read("apps", "web", "app", "(shell)", "inicio", "page.tsx")
const launcher = read("apps", "web", "app", "components", "bivaque", "intent-launcher.tsx")

describe("ordem da Home (DS-006)", () => {
  it("o retorno vem antes do lançador, e o feed depois dos dois", () => {
    const retorno = page.indexOf("<ReturnStrip />")
    const lancador = page.indexOf("<IntentLauncher")
    const feed = page.indexOf("<CommunitySection")

    expect(retorno).toBeGreaterThan(-1)
    expect(lancador).toBeGreaterThan(-1)
    expect(feed).toBeGreaterThan(-1)
    expect(retorno).toBeLessThan(lancador)
    expect(lancador).toBeLessThan(feed)
  })

  it("a saudação continua sendo o primeiro bloco e o h1 da rota", () => {
    const saudacao = page.indexOf("<InicioGreeting")
    const retorno = page.indexOf("<ReturnStrip />")
    expect(saudacao).toBeGreaterThan(-1)
    expect(saudacao).toBeLessThan(retorno)
  })

  it("o lançador compacto é uma faixa, não um hero", () => {
    // A variante compacta é a faixa de uma linha: avatar + rótulo + duas ações.
    expect(launcher).toContain(
      'className="flex items-center gap-3 rounded-xl border border-border bg-[var(--semantic-surface)] p-3"',
    )
    expect(launcher).toContain("sm:flex-row")
    // Nenhuma medida de hero no arquivo: sem padding vertical grande, sem
    // tipografia de destaque e sem altura mínima de bloco.
    expect(launcher).not.toMatch(/py-(8|10|12|16)|text-(2xl|3xl|4xl)|min-h-(48|56|64|72)/)
  })

  it("a faixa de retorno continua sendo reaproveitada, não reescrita", () => {
    expect(page).toContain('import { ReturnStrip } from "./return-strip"')
    // A faixa devolve null quando não há notificação legível; a Home não
    // desenha um bloco vazio no lugar dela.
    const strip = read("apps", "web", "app", "(shell)", "inicio", "return-strip.tsx")
    expect(strip).toContain("if (strip === null) return null")
  })
})
