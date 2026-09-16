import { describe, expect, it } from "vitest"
import { emailHint } from "web/app/(shell)/profile/family-invite-email-hint"

describe("family invite email hint mask (D2 Task 4)", () => {
  it("masks a full email to the branded hint format", () => {
    expect(emailHint("joao.silva@gmail.com")).toBe("jo***@gm***.com")
  })

  it("never leaks the second character of a two-letter local part", () => {
    expect(emailHint("ab@gmail.com")).toBe("a***@gm***.com")
  })

  it("normalizes case and whitespace like the SQL function", () => {
    expect(emailHint("  Joao.Silva@gmail.com  ")).toBe("jo***@gm***.com")
  })

  it("never reconstructs the original email", () => {
    const masked = emailHint("jose.silva@hotmail.com")
    expect(masked).not.toContain("jose.silva@hotmail.com")
    expect(masked).toMatch(/^[^@\s]{1,2}\*{3}@[^@\s]{1,2}\*{3}\.[a-z]{2,}$/)
  })

  // Regressão medida em runtime em 15/09/2026: com o PRIMEIRO ponto, o rótulo de
  // um domínio de dois níveis saía como 'bi***.example.invalid' e o CHECK da
  // tabela recusava o convite — o familiar nunca recebia nada.
  it("usa o último ponto do domínio: o CHECK da tabela recusa o resto", () => {
    const mask = () => /^[^@\s]{1,2}\*{3}@[^@\s]{1,2}\*{3}\.[a-z]{2,}$/
    expect(emailHint("familiar@bivaque.example.invalid")).toBe("fa***@bi***.invalid")
    expect(emailHint("familiar@bivaque.example.invalid")).toMatch(mask())
    expect(emailHint("ana@exemplo.com.br")).toBe("an***@ex***.br")
    expect(emailHint("ana@exemplo.com.br")).toMatch(mask())
  })
})
