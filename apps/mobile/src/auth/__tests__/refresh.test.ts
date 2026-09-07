// Testes do helper de refresh (apps/mobile/src/auth/refresh.ts).
//
// Cobre o que o ADR-20260901-mobile-session §Acceptance exige:
//   - isExpired detecta expirado (positivo e negativo)
//   - isNearExpiry detecta janela de 60s (positivo e negativo)
//   - tokens longe da expiracao nao disparam refresh (negativo)

import { describe, expect, it } from "vitest"
import { isExpired, isNearExpiry } from "../refresh"

describe("refresh.isExpired", () => {
  it("retorna true para timestamp no passado", () => {
    expect(isExpired(1_700_000_000, 1_900_000_000)).toBe(true)
  })

  it("retorna true para timestamp igual ao agora", () => {
    expect(isExpired(1_900_000_000, 1_900_000_000)).toBe(true)
  })

  it("retorna false para timestamp futuro", () => {
    expect(isExpired(1_900_000_000, 1_700_000_000)).toBe(false)
  })
})

describe("refresh.isNearExpiry", () => {
  it("retorna true para janela de 60s antes da expiracao", () => {
    // now = 1_900_000_000; expires = now + 60s (dentro da janela)
    expect(isNearExpiry(1_900_000_060, 1_900_000_000)).toBe(true)
  })

  it("retorna true para timestamp ja expirado", () => {
    expect(isNearExpiry(1_700_000_000, 1_900_000_000)).toBe(true)
  })

  it("retorna false para token com mais de 60s de vida", () => {
    expect(isNearExpiry(1_900_001_000, 1_900_000_000)).toBe(false)
  })

  it("retorna false para token com 61s de vida (fora da janela)", () => {
    expect(isNearExpiry(1_900_000_061, 1_900_000_000)).toBe(false)
  })
})
