import { describe, expect, it, vi } from "vitest"
import {
  composeReason,
  createReport,
  isReportTargetType,
  splitReason,
  validateReportInput,
  validateReportTarget,
} from "web/lib/reports/reports"

describe("lista fechada de motivos", () => {
  it("aceita exatamente os quatro valores da lista da prancha 56", () => {
    expect(validateReportInput({ reason: "spam", explanation: "" })).toEqual({
      ok: true,
      label: "Spam",
      explanation: "",
    })
    for (const value of ["conteudo-inadequado", "informacao-enganosa", "outro"]) {
      expect(validateReportInput({ reason: value, explanation: "" }).ok).toBe(true)
    }
  })

  it("recusa motivo fora da lista inclusive por chamada direta sem interface", () => {
    for (const forged of ["", "  ", "Spam", "SPAM: motivo livre", "assédio", "outros"]) {
      expect(validateReportInput({ reason: forged, explanation: "" })).toEqual({
        ok: false,
        error: "motivo-invalido",
      })
    }
  })

  it("recusa explicacao maior que o contador da prancha", () => {
    expect(validateReportInput({ reason: "spam", explanation: "x".repeat(301) }).ok).toBe(false)
  })
})

describe("motivo gravado e lido", () => {
  it("compoe rotulo e explicacao no formato da RECON-016, redigindo documento", () => {
    expect(composeReason("Outro", "divulgou CPF 529.982.247-25 na foto")).toBe(
      "Outro: divulgou CPF [documento removido] na foto",
    )
    expect(composeReason("Spam", "   ")).toBe("Spam")
  })

  it("separa as duas metades na tela de acompanhamento", () => {
    expect(splitReason("Conteúdo inadequado: linguagem ofensiva")).toEqual({
      label: "Conteúdo inadequado",
      explanation: "linguagem ofensiva",
    })
    expect(splitReason("Spam")).toEqual({ label: "Spam", explanation: null })
  })

  it("texto livre legado nunca vira categoria inventada", () => {
    expect(splitReason("Mensagem parece fora do tema da comunidade.")).toEqual({
      label: "Motivo registrado",
      explanation: "Mensagem parece fora do tema da comunidade.",
    })
  })
})

describe("alvo da denuncia", () => {
  it("so os tipos do enum publico sao aceitos", () => {
    expect(isReportTargetType("post")).toBe(true)
    expect(isReportTargetType("provider_profile")).toBe(false)
    expect(isReportTargetType("profile")).toBe(false)
  })

  it("uuid malformado e recusado sem tocar o banco", async () => {
    const from = vi.fn()
    const supabase = { from } as never
    expect(await validateReportTarget(supabase, "post", "nao-e-uuid")).toBe(false)
    expect(from).not.toHaveBeenCalled()
  })

  it("linha que a RLS nao mostra nao e denunciavel", async () => {
    const supabase = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: null }) }),
        }),
      })),
    }
    expect(await validateReportTarget(supabase as never, "post", crypto.randomUUID())).toBe(false)
  })
})

function makeCreateSupabase(options: {
  targetVisible: boolean
  insert?: { data?: { id: string } | null; error?: { code?: string; message?: string } | null }
}) {
  return {
    auth: { getUser: async () => ({ data: { user: { id: "reporter-1" } } }) },
    from: vi.fn((table: string) => {
      if (table === "posts") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: options.targetVisible ? { content: "texto do alvo" } : null,
              }),
            }),
          }),
        }
      }
      return {
        insert: () => ({
          select: () => ({
            single: async () => options.insert ?? { data: { id: "report-novo" }, error: null },
          }),
        }),
      }
    }),
  }
}

describe("createReport", () => {
  const base = {
    targetType: "post",
    targetId: "80000000-0000-4000-8000-000000000002",
    reason: "outro",
    explanation: "conteudo fora das regras",
  }

  it("persiste motivo fechado contra alvo visivel e devolve o recibo", async () => {
    const result = await createReport(makeCreateSupabase({ targetVisible: true }) as never, base)
    expect(result).toEqual({ ok: true, reportId: "report-novo" })
  })

  it("motivo fora da lista nao chega ao banco", async () => {
    const supabase = makeCreateSupabase({ targetVisible: true })
    const result = await createReport(supabase as never, { ...base, reason: "vingança" })
    expect(result).toEqual({ ok: false, error: "motivo-invalido" })
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it("alvo invisivel pela RLS do membro e recusado", async () => {
    const result = await createReport(makeCreateSupabase({ targetVisible: false }) as never, base)
    expect(result).toEqual({ ok: false, error: "alvo-invalido" })
  })

  it("denuncia aberta repetida no mesmo alvo vira estado claro, nao falha generica", async () => {
    const result = await createReport(
      makeCreateSupabase({
        targetVisible: true,
        insert: { data: null, error: { code: "23505" } },
      }) as never,
      base,
    )
    expect(result).toEqual({ ok: false, error: "ja-denunciado" })
  })
})
