import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import {
  filterGuideEntries,
  GUIDE_CATEGORY_LABELS,
  guideResultCountLabel,
} from "../../../apps/web/lib/recommendations/guide-search"
import { stripComments } from "../ui/source-scan"

// DS-006 (prancha 45): a etapa do Guia que precede o formulário comunitário.
//
// O que este teste protege é o que o contrato proíbe fingir: a busca lê dado
// real e aprovado; falha de busca é erro com recuperação, não lista vazia; e
// nada aqui afirma vínculo, promoção ou curadoria que o servidor não tenha
// (`recommendation_replies` não tem coluna de vínculo na escrita e
// `recommendation_reply_promotions` é service_role).
//
// As varreduras de ausência olham o fonte SEM comentários: a nota que explica a
// proibição — e este arquivo tem uma, nomeando `suggest_guide_entry` e a
// etiqueta proibida — não é uso da proibição.

const root = join(import.meta.dirname, "..", "..", "..")
const read = (...segments: string[]) => readFileSync(join(root, ...segments), "utf8")

const panel = read("apps", "web", "app", "components", "bivaque", "guide-first-request.tsx")

const ENTRIES = [
  {
    id: "a1",
    name: "Transmuda Recife",
    description: "Transportes residenciais e comerciais.",
    category: "transporter",
  },
  {
    id: "a2",
    name: "Escola Modelo do Centro",
    description: "Ensino fundamental e médio.",
    category: "school",
  },
]

describe("busca do Guia no pedido de indicação (DS-006)", () => {
  it("lê arrival_guide_entries aprovadas da localidade real do membro", () => {
    expect(panel).toContain('.from("arrival_guide_entries")')
    expect(panel).toContain('.eq("status", "approved")')
    expect(panel).toContain('.eq("locality_id", current.id)')
    // A tabela inexistente não é consultada e a cidade não é chumbada.
    expect(panel).not.toContain('.from("guide_entries")')
    expect(panel).not.toMatch(/\b(Manaus|Recife|Brasília)\b/)
  })

  it("não inventa RPC de busca nem promoção de candidata", () => {
    expect(panel).not.toContain("suggest_guide_entry(")
    expect(panel).not.toContain(".rpc(")
    expect(panel).not.toContain("recommendation_reply_promotions")
  })

  it("abrir o resultado é a ação primária e descartar é a secundária", () => {
    // A ação primária é o link para a rota de detalhe que já existe: /guide/[id].
    expect(panel).toContain("href={`/guide/")
    expect(panel).toContain("Ver no Guia")
    expect(panel).toContain("Não é isso")
    // Ordem da prancha 45: abrir vem antes de descartar dentro do resultado.
    expect(panel.indexOf("Ver no Guia")).toBeLessThan(panel.indexOf("Não é isso"))
  })

  it("o fallback é explícito e leva o texto digitado para a comunidade", () => {
    expect(panel).toContain("Não encontrou? Perguntar à comunidade")
    expect(panel).toContain("onAskCommunity(term.trim())")
  })

  it("falha de busca é erro recuperável em português, nunca lista vazia", () => {
    expect(panel).toContain("Não foi possível buscar no Guia agora. Tente novamente.")
    expect(panel).toContain("<ErrorState message={error} onRetry={() => void loadEntries()} />")
    expect(panel).not.toContain("EmptyState")
  })

  it("não exibe vínculo, curadoria ou engajamento que o servidor não prova", () => {
    const code = stripComments(panel)
    expect(code).not.toContain("Ainda não está no Guia")
    expect(code).not.toMatch(/polegar|curtida|Curtir|Isso ajudou/i)
    expect(code).not.toMatch(/>\s*Indicar\s*</)
    expect(code).not.toMatch(/status\s*=\s*["']pending["']/)
    // A varredura continua pegando uso real: a mesma string, em código, aparece.
    expect(stripComments('<p>{"Ainda não está no Guia"}</p>')).toContain("Ainda não está no Guia")
  })

  it("a contagem vem do módulo puro, não de texto montado na tela", () => {
    expect(panel).toContain("guideResultCountLabel(results.length)")
  })
})

describe("filtro do Guia (módulo puro)", () => {
  it("casa nome e descrição sem depender de caixa", () => {
    expect(filterGuideEntries(ENTRIES, "transmuda")).toEqual([ENTRIES[0]])
    expect(filterGuideEntries(ENTRIES, "ENSINO FUNDAMENTAL")).toEqual([ENTRIES[1]])
    expect(filterGuideEntries(ENTRIES, "  escola  ")).toEqual([ENTRIES[1]])
  })

  it("não devolve o acervo inteiro quando ninguém perguntou nada", () => {
    expect(filterGuideEntries(ENTRIES, "")).toEqual([])
    expect(filterGuideEntries(ENTRIES, "   ")).toEqual([])
  })

  it("termo sem correspondência devolve lista vazia de verdade", () => {
    expect(filterGuideEntries(ENTRIES, "encanador")).toEqual([])
  })

  it("a contagem tem singular, plural e zero reais", () => {
    expect(guideResultCountLabel(0)).toBe("Nenhum resultado no Guia")
    expect(guideResultCountLabel(1)).toBe("1 resultado no Guia")
    expect(guideResultCountLabel(3)).toBe("3 resultados no Guia")
  })

  it("traduz as quatro categorias do enum de chegada", () => {
    expect(Object.keys(GUIDE_CATEGORY_LABELS).sort()).toEqual([
      "courier",
      "hospital",
      "school",
      "transporter",
    ])
  })
})
