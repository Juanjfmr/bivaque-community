import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { stripComments } from "../ui/source-scan"

// DS-006: o fluxo de indicação é conversa comunitária, não marketplace nem
// placar. Este teste é o negativo do contrato: polegar, curtida, "Isso ajudou" e
// o botão `Indicar` não existem em nenhuma tela do fluxo — e o vínculo com o
// Guia só aparece quando o servidor consegue prová-lo.
//
// A varredura mira CÓDIGO, não documentação: os comentários saem antes da
// comparação (o comentário que explica a proibição não é uso da proibição). O
// último caso deste arquivo injeta as strings proibidas em código de verdade e
// prova que a varredura continua pegando.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const FLOW_FILES: Array<[string, string]> = (
  [
    ["intent-launcher", ["components", "bivaque", "intent-launcher.tsx"]],
    ["guide-first-request", ["components", "bivaque", "guide-first-request.tsx"]],
    ["recommendation-requests", ["components", "bivaque", "recommendation-requests.tsx"]],
    ["recommendations/page", ["(shell)", "recommendations", "page.tsx"]],
  ] as Array<[string, string[]]>
).map(([name, segments]) => [name, read("apps", "web", "app", ...segments)] as [string, string])

describe("engajamento proibido no fluxo de indicação (DS-006)", () => {
  it("nenhuma tela do fluxo tem polegar, curtida, 'Isso ajudou' ou 'Indicar'", () => {
    for (const [name, source] of FLOW_FILES) {
      const code = stripComments(source)
      expect(code, `${name}: polegar/curtida`).not.toMatch(/polegar|curtida|Curtir/i)
      expect(code, `${name}: Isso ajudou`).not.toMatch(/Isso ajudou/i)
      expect(code, `${name}: botão Indicar`).not.toMatch(/>\s*Indicar\s*</)
    }
  })

  it("ninguém finge curadoria: a etiqueta proibida não é renderizada", () => {
    for (const [name, source] of FLOW_FILES) {
      const code = stripComments(source)
      expect(code, `${name}: etiqueta de candidata`).not.toContain("Ainda não está no Guia")
      expect(code, `${name}: RPC de sugestão`).not.toContain("suggest_guide_entry(")
    }
  })

  it("o vínculo com o Guia só existe com dado aprovado que liga a resposta ao item", () => {
    const source = read(
      "apps",
      "web",
      "app",
      "components",
      "bivaque",
      "recommendation-requests.tsx",
    )
    const code = stripComments(source)
    // A leitura é a única que prova o vínculo: arrival_guide_entries.source_reply_id.
    expect(code).toContain('.from("arrival_guide_entries")')
    expect(code).toContain('.in("source_reply_id", replyIds)')
    expect(code).toContain('.eq("status", "approved")')
    // E o vínculo é condicional: sem linha, nada é desenhado.
    expect(code).toContain("const guideLink = guideLinksByReplyId[reply.id]")
    expect(code).toContain("{guideLink ? (")
    expect(code).toContain("Ver no Guia")
    // A propriedade real é "o cliente não consulta a tabela de promoções" (ela é
    // service_role): a chamada é que não pode existir.
    expect(code).not.toContain('.from("recommendation_reply_promotions")')
  })

  it("moderação fica no overflow, nunca como ação primária", () => {
    const code = stripComments(
      read("apps", "web", "app", "components", "bivaque", "recommendation-requests.tsx"),
    )
    expect(code).toContain('report: "Denunciar pedido"')
    expect(code).toContain('report: "Denunciar resposta"')
    expect(code).toContain('hide: "Ocultar pedido"')
    expect(code).toContain('openReport("recommendation_request"')
    // "Silenciar" não existe em nenhum lugar do produto: não é inventado aqui.
    expect(code).not.toMatch(/Silenciar/i)
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
