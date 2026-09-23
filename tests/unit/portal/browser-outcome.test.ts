import { describe, expect, it } from "vitest"
import { withoutReason } from "web/lib/portal/browser-outcome"

// ADR-20260922-identidade-quando-portal-falha: o motivo técnico do erro temporário não
// chega ao navegador; o que a tela precisa (status e errorCode) chega intacto.

describe("resultado da verificação visto pelo navegador", () => {
  it("tira o motivo técnico do erro temporário e mantém o código", () => {
    const outcome = withoutReason({
      status: "temporary_error",
      reason: "Portal API key not configured",
      errorCode: "INVALID_KEY",
    })
    expect(outcome).toEqual({ status: "temporary_error", errorCode: "INVALID_KEY" })
    expect(JSON.stringify(outcome)).not.toContain("not configured")
  })

  it("erro temporário sem código continua erro temporário", () => {
    expect(withoutReason({ status: "temporary_error", reason: "timeout" })).toEqual({
      status: "temporary_error",
    })
  })

  it("não mexe nas outras variantes", () => {
    expect(withoutReason({ status: "pending" })).toEqual({ status: "pending" })
    expect(withoutReason({ status: "rejected" })).toEqual({ status: "rejected" })
    const verified = withoutReason({
      status: "verified",
      eligibilityClass: "active",
      suggestedName: "Pessoa",
    } as never)
    expect(verified).toMatchObject({ status: "verified", suggestedName: "Pessoa" })
  })
})
