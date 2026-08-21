import { scrubReportReason } from "@bivaque/domain"
import { describe, expect, it } from "vitest"

describe("scrubReportReason (H-Task 2)", () => {
  it("redige CPF formatado", () => {
    expect(scrubReportReason("ele publicou o CPF 529.982.247-25 no grupo")).toBe(
      "ele publicou o CPF [documento removido] no grupo",
    )
  })

  it("redige CPF sem pontuação", () => {
    expect(scrubReportReason("cpf:52998224725")).toBe("cpf:[documento removido]")
  })

  it("redige CPF com pontos e sem hífen", () => {
    expect(scrubReportReason("529.982.247.25")).toBe("[documento removido]")
  })

  it("redige sequência de 11 dígitos mesmo sem ser CPF — falso positivo aceito", () => {
    // 12345678901 não tem dígitos verificadores válidos, mas a redação corre
    // por formato. Aceitamos o falso positivo: é a escolha certa porque o
    // operador não precisa de números longos de 11 dígitos no motivo, e
    // preferiríamos redigir um telefone mal digitado do que vazar um CPF.
    expect(scrubReportReason("telefone 12345678901 dele")).toBe(
      "telefone [documento removido] dele",
    )
  })

  it("NÃO bloqueia vocabulário proibido antes da D21 — frase sobre patente e OM sai intacta", () => {
    // A D21 derrubou o filtro de vocabulário porque ele proibia "patente" e
    // "OM", que é como a comunidade real fala. Este teste existe para
    // garantir que scrubReportReason nunca vire um check de vocabulário
    // disfarçado: a frase mais útil que a fila pode receber sai inteira.
    const phrase = "ele falou da patente e da OM dele, e publicou o CPF 529.982.247-25"
    expect(scrubReportReason(phrase)).toBe(
      "ele falou da patente e da OM dele, e publicou o CPF [documento removido]",
    )
  })

  it("preserva texto curto sem PII", () => {
    expect(scrubReportReason("vendeu gato por lebre")).toBe("vendeu gato por lebre")
  })

  it("lida com múltiplos CPFs no mesmo motivo", () => {
    expect(scrubReportReason("ele expôs o 529.982.247-25 e o 000.111.222-33 no chat")).toBe(
      "ele expôs o [documento removido] e o [documento removido] no chat",
    )
  })

  it("preserva números curtos (CEP parcial, ano, quantidade)", () => {
    expect(scrubReportReason("post do dia 12/08/2026")).toBe("post do dia 12/08/2026")
    expect(scrubReportReason("30 pessoas viram")).toBe("30 pessoas viram")
  })
})
