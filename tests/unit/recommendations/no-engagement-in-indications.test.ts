import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "../ui/source-scan"

// DS-006: o fluxo de indicação é conversa comunitária, não marketplace nem
// placar. Este teste é o negativo do contrato: polegar, curtida, "Isso ajudou" e
// o botão `Indicar` não existem em nenhuma tela do fluxo — e o vínculo com o
// Guia só aparece quando o servidor consegue prová-lo.
//
// Desde 25/09/2026 o fluxo são as telas de apps/web/app/components/indications
// (ADR-20260925-memoria-de-indicacoes). "Ajudou a resolver" é a marca decidida
// pelo dono em 09/09 — um ponteiro escolhido por quem perguntou, não voto.
//
// A varredura mira CÓDIGO, não documentação: os comentários saem antes da
// comparação (o comentário que explica a proibição não é uso da proibição). O
// último caso deste arquivo injeta as strings proibidas em código de verdade e
// prova que a varredura continua pegando.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")
const indications = (file: string) => read("apps", "web", "app", "components", "indications", file)

const FLOW_FILES: Array<[string, string]> = [
  ["ask-indication", indications("ask-indication.tsx")],
  ["indications-panel", indications("indications-panel.tsx")],
  ["indication-item", indications("indication-item.tsx")],
]

describe("engajamento proibido no fluxo de indicação (DS-006)", () => {
  it("nenhuma tela do fluxo tem polegar, curtida, 'Isso ajudou' ou 'Indicar'", () => {
    for (const [name, source] of FLOW_FILES) {
      const code = stripComments(source)
      expect(code, `${name}: polegar/curtida`).not.toMatch(/polegar|curtida|Curtir/i)
      expect(code, `${name}: Isso ajudou`).not.toMatch(/Isso ajudou/i)
      expect(code, `${name}: botão Indicar`).not.toMatch(/>\s*Indicar\s*</)
    }
  })

  it("nenhuma tela conta ou ranqueia pessoas pela marca", () => {
    for (const [name, source] of FLOW_FILES) {
      const code = stripComments(source)
      expect(code, `${name}: placar`).not.toMatch(/indicad[oa] por \d|ranking|pontos/i)
    }
  })

  it("ninguém finge curadoria: a etiqueta proibida não é renderizada", () => {
    for (const [name, source] of FLOW_FILES) {
      const code = stripComments(source)
      expect(code, `${name}: etiqueta de candidata`).not.toContain("Ainda não está no Guia")
      expect(code, `${name}: RPC de sugestão`).not.toContain("suggest_guide_entry(")
    }
  })

  it("a varredura ainda pega as strings proibidas quando elas são código", () => {
    // Prova de que remover comentários não afrouxou nada: em código de verdade
    // — JSX renderizado, rótulo de botão e consulta de cliente — a mesma
    // asserção falharia.
    const injection = [
      "<p>Ainda não está no Guia</p>",
      '<button type="button">Indicar</button>',
      "👍 12 curtidas",
      'supabase.from("recommendation_reply_promotions").select("*")',
    ].join("\n")
    const scanned = stripComments(injection)
    expect(scanned).toContain("Ainda não está no Guia")
    expect(scanned).toMatch(/>\s*Indicar\s*</)
    expect(scanned).toMatch(/curtidas/i)
    expect(scanned).toContain('.from("recommendation_reply_promotions")')
  })
})
