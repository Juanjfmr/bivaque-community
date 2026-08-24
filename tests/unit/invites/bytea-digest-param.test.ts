import { describe, expect, it } from "vitest"
import { byteaDigestParam } from "web/lib/invites-bytea"

// Guarda a serialização do digest sha256 para parâmetros bytea via PostgREST.
// Sem o prefixo \x, o Postgres interpreta a string em escape-format (1 byte
// por caractere): 64 bytes no lugar de 32 — bug real de runtime corrigido em
// 2026-08-23 (create_community_invitation 22023 / create_family_invitation
// 23514). Este teste falha o build se algum ponto voltar a enviar hex nu.

const HEX_64 = "ab".repeat(32)

describe("byteaDigestParam", () => {
  it("prefixa \\x para que o Postgres parseie hex-format (32 bytes)", () => {
    expect(byteaDigestParam(HEX_64)).toBe(`\\x${HEX_64}`)
  })

  it("recusa digest com comprimento errado", () => {
    expect(() => byteaDigestParam("ab".repeat(31))).toThrow()
    expect(() => byteaDigestParam("ab".repeat(33))).toThrow()
    expect(() => byteaDigestParam("")).toThrow()
  })

  it("recusa caracteres fora de hex minúsculo", () => {
    expect(() => byteaDigestParam("A".repeat(64))).toThrow()
    expect(() => byteaDigestParam(`${"g".repeat(63)}0`)).toThrow()
  })
})
