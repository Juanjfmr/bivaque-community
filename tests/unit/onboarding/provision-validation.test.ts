import { describe, expect, it } from "vitest"
import {
  isLocalityCodeFormat,
  validateProvisionInput,
} from "web/lib/onboarding/provision-validation"

// P0 Task 5 (Step 5): unitário sobre a rota do passo pós-elegibilidade.

describe("validateProvisionInput (P0 Task 5)", () => {
  it("accepts a valid ibge_code with a display name", () => {
    const result = validateProvisionInput({ ibgeCode: "1302603", displayName: "Ana Verificada" })
    expect(result.ok).toBe(true)
    expect(result.ibgeCode).toBe("1302603")
    expect(result.displayName).toBe("Ana Verificada")
  })

  it("rejects a missing locality", () => {
    const result = validateProvisionInput({ displayName: "Ana" })
    expect(result).toEqual({ ok: false, error: "locality is required" })
  })

  it("rejects a wrong-format locality code", () => {
    expect(isLocalityCodeFormat("12345")).toBe(false)
    const result = validateProvisionInput({ ibgeCode: "12345", displayName: "Ana" })
    expect(result).toEqual({ ok: false, error: "locality is required" })
  })

  it("accepts a well-formed code even before existence is checked", () => {
    // Formato certo mas ausente do catálogo é 400 na ROTA (checagem de
    // existência contra a tabela); a validação pura só separa o formato.
    expect(isLocalityCodeFormat("9999999")).toBe(true)
    const result = validateProvisionInput({ ibgeCode: "9999999", displayName: "Ana" })
    expect(result.ok).toBe(true)
  })

  it("rejects a missing display name", () => {
    const result = validateProvisionInput({ ibgeCode: "1302603" })
    expect(result).toEqual({ ok: false, error: "display_name is required" })
  })
})
