import { describe, expect, it } from "vitest"
import {
  composeReportReason,
  EXPLANATION_MAX,
  isReportReasonValue,
  parseReportReason,
  REPORT_REASONS,
  reasonMatchesCategory,
  reportReasonLabel,
} from "../../../apps/web/app/components/bivaque/report-reasons"

// RECON-033 — uma lista fechada só, nas duas pontas (pranchas 56 e 58). A
// categoria canônica é a única que o servidor aceita gravar, e o parse é o que
// a fila da operação lê de volta. Linha legada de texto livre nunca ganha
// categoria inventada.

describe("vocabulário canônico do motivo", () => {
  it("são exatamente as quatro categorias da prancha 56", () => {
    expect(REPORT_REASONS.map((r) => r.label)).toEqual([
      "Spam",
      "Conteúdo inadequado",
      "Informação enganosa",
      "Outro",
    ])
  })

  it("o vocabulário da prancha 58 não entra como categoria paralela", () => {
    for (const legacy of ["Propaganda", "Atividade suspeita", "Informação incorreta"]) {
      expect(isReportReasonValue(legacy)).toBe(false)
      expect(reportReasonLabel(legacy)).toBeNull()
    }
  })

  it("aceita só os valores canônicos", () => {
    expect(isReportReasonValue("spam")).toBe(true)
    expect(isReportReasonValue("outro")).toBe(true)
    expect(isReportReasonValue("")).toBe(false)
    expect(isReportReasonValue(null)).toBe(false)
    expect(isReportReasonValue("SPAM")).toBe(false)
  })
})

describe("gravar e ler de volta", () => {
  it("sem explicação o motivo é só o rótulo", () => {
    expect(composeReportReason("Spam", "   ")).toBe("Spam")
    expect(parseReportReason("Spam")).toEqual({
      categoryLabel: "Spam",
      explanation: null,
      raw: "Spam",
    })
  })

  it("com explicação o par sobrevive ao round-trip", () => {
    const composed = composeReportReason("Conteúdo inadequado", "A descrição ofende.")
    expect(composed).toBe("Conteúdo inadequado: A descrição ofende.")
    const parsed = parseReportReason(composed)
    expect(parsed.categoryLabel).toBe("Conteúdo inadequado")
    expect(parsed.explanation).toBe("A descrição ofende.")
  })

  it("texto livre legado não ganha categoria nem se perde", () => {
    const parsed = parseReportReason("Mensagem parece fora do tema da comunidade.")
    expect(parsed.categoryLabel).toBeNull()
    expect(parsed.raw).toBe("Mensagem parece fora do tema da comunidade.")
  })

  it("explicação que contenha o separador não quebra o parse do prefixo", () => {
    const parsed = parseReportReason("Outro: ele escreveu: não sou robô")
    expect(parsed.categoryLabel).toBe("Outro")
    expect(parsed.explanation).toBe("ele escreveu: não sou robô")
  })

  it("o teto da explicação é o contador da prancha 56", () => {
    expect(EXPLANATION_MAX).toBe(300)
  })
})

describe("filtro da operação", () => {
  it("casa pelo rótulo canônico, não por busca livre", () => {
    expect(reasonMatchesCategory("Spam: vende curso", "Spam")).toBe(true)
    expect(reasonMatchesCategory("Spam", "Spam")).toBe(true)
    expect(reasonMatchesCategory("Conteúdo inadequado", "Spam")).toBe(false)
    expect(reasonMatchesCategory("texto legado com a palavra spam", "Spam")).toBe(false)
  })
})
