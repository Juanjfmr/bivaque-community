import { detectCep, detectCpf, isValidCpf } from "@bivaque/domain"
import { describe, expect, it } from "vitest"

describe("PII pattern detection (D21)", () => {
  describe("isValidCpf", () => {
    it("accepts a CPF with a valid check digit", () => {
      expect(isValidCpf("52998224725")).toBe(true)
    })

    it("rejects an eleven-digit sequence with an invalid check digit", () => {
      expect(isValidCpf("12345678901")).toBe(false)
    })

    it("rejects a CPF made of a single repeated digit", () => {
      expect(isValidCpf("1".repeat(11))).toBe(false)
    })
  })

  describe("detectCpf", () => {
    it("detects a masked CPF", () => {
      expect(detectCpf("Meu CPF é 529.982.247-25")).toBe(true)
    })

    it("detects an unmasked CPF", () => {
      expect(detectCpf("52998224725")).toBe(true)
    })

    it("does not fire on the word 'CPF'", () => {
      expect(detectCpf("Cuidado com golpe pedindo CPF")).toBe(false)
    })

    it("does not fire on an eleven-digit phone number", () => {
      expect(detectCpf("Ligue para 11987654321")).toBe(false)
    })

    it("does not fire on an eleven-digit sequence with an invalid check digit", () => {
      expect(detectCpf("O número 12345678901 não é CPF")).toBe(false)
    })

    it("does not fire on a money value", () => {
      expect(detectCpf("Custa R$ 1.234,56")).toBe(false)
    })
  })

  describe("detectCep", () => {
    it("detects a formatted CEP", () => {
      expect(detectCep("Entregar em 69030-180")).toBe(true)
    })

    it("does not fire on a money value", () => {
      expect(detectCep("R$ 1.234,56")).toBe(false)
    })
  })
})
