// Bio do perfil (prancha 51) — prova do módulo puro que a tela importa, no
// mesmo padrão de `profile-affiliation.test.ts`. Cada via tem positivo e
// negativo: aceitar um texto legítimo não prova nada sobre recusar CPF;
// esvaziar não prova que um valor sobrevive.

import { describe, expect, it } from "vitest"
import {
  BIO_FIELD_LABEL,
  BIO_MAX_LENGTH,
  bioFromRow,
  bioLength,
  normalizeBio,
  validateBio,
} from "web/lib/profile/bio"

describe("D1 — o limite da bio é o número do contador da prancha", () => {
  it("fixa 300 caracteres", () => {
    expect(BIO_MAX_LENGTH).toBe(300)
    expect(BIO_FIELD_LABEL).toBe("Apresentação")
  })

  it("aceita exatamente 300 (positivo)", () => {
    expect(validateBio("a".repeat(BIO_MAX_LENGTH))).toBeNull()
  })

  it("recusa 301 (negativo)", () => {
    expect(validateBio("a".repeat(BIO_MAX_LENGTH + 1))).toMatch(/no máximo 300 caracteres/)
  })

  it("conta o texto aparado, como o banco grava", () => {
    expect(bioLength(`  ${"a".repeat(10)}  `)).toBe(10)
  })
})

describe("D4 — superfície de texto livre com a varredura da casa", () => {
  it("vazio é aceito: campo opcional, nada é exigido para salvar", () => {
    expect(validateBio("")).toBeNull()
    expect(validateBio("   ")).toBeNull()
  })

  it("texto legítimo passa (positivo)", () => {
    expect(validateBio("Apaixonado por trilhas e por cozinhar em casa.")).toBeNull()
  })

  it("bloqueia CPF formatado e cru (negativo)", () => {
    expect(validateBio("Meu CPF é 529.982.247-25")).toMatch(/CPF/)
    expect(validateBio("52998224725")).toMatch(/CPF/)
  })

  it("bloqueia CEP (negativo)", () => {
    expect(validateBio("Moro no 69030-180")).toMatch(/CEP/)
  })
})

describe("D3 — esvaziar apaga: nulo, não string vazia", () => {
  it("vazio e só espaços normalizam para nulo", () => {
    expect(normalizeBio("")).toBeNull()
    expect(normalizeBio("   ")).toBeNull()
  })

  it("texto é aparado antes de gravar", () => {
    expect(normalizeBio("  minha bio  ")).toBe("minha bio")
  })
})

describe("leitura — o que voltou do banco é o estado", () => {
  it("nulo e ausente viram campo vazio, sem inventar texto", () => {
    expect(bioFromRow(null)).toBe("")
    expect(bioFromRow(undefined)).toBe("")
  })

  it("texto volta como está", () => {
    expect(bioFromRow("texto")).toBe("texto")
  })
})
