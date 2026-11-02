import { describe, expect, it } from "vitest"

import { assetUrl } from "../lib/assets"
import { dataISO, diasAte, moeda, rotuloDeData } from "../lib/formato"
import { idLocal } from "../lib/id"
import { iniciais, normalizar } from "../lib/texto"

describe("texto (§7 helpers)", () => {
  it("normaliza sem acento e em minúsculo", () => {
    expect(normalizar("Indicação")).toBe("indicacao")
    expect(normalizar("ATENÇÃO: São Luís")).toBe("atencao: sao luis")
    expect(normalizar(undefined)).toBe("")
  })

  it("tira até duas iniciais e reserva BV", () => {
    expect(iniciais("Ana Paula Souza")).toBe("AP")
    expect(iniciais("João")).toBe("J")
    expect(iniciais("  ")).toBe("BV")
    expect(iniciais(null)).toBe("BV")
  })
})

describe("formatação (§7 helpers)", () => {
  it("escreve real sem centavos", () => {
    // O Intl separa o símbolo com espaço fixo (U+00A0), como em pt-BR.
    expect(moeda(1250)).toBe("R$\u00A01.250")
    expect(moeda(0)).toBe("R$\u00A00")
  })

  it("a data ISO é local e aceita deslocamento de dias", () => {
    const hoje = dataISO()
    expect(hoje).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    const amanha = dataISO(1)
    expect(amanha).not.toBe(hoje)
    expect(Date.parse(`${amanha}T12:00:00`) - Date.parse(`${hoje}T12:00:00`)).toBe(86_400_000)
  })

  it("o rótulo de data fala dia e mês por extenso, em pt-BR", () => {
    expect(rotuloDeData("2026-03-07")).toBe("7 de março")
  })

  it("conta dias inteiros até a data, sem negativo", () => {
    const referencia = new Date("2026-03-01T12:00:00")
    expect(diasAte("2026-03-08", referencia)).toBe(7)
    expect(diasAte("2026-02-01", referencia)).toBe(0)
  })
})

describe("id local (§7 helpers)", () => {
  it("tem o prefixo e é único", () => {
    const primeiro = idLocal("aviso-")
    expect(primeiro.startsWith("aviso-")).toBe(true)
    expect(primeiro.length).toBeGreaterThan("aviso-".length + 6)
    expect(primeiro).not.toBe(idLocal("aviso-"))
  })
})

describe("imagem de asset (§7 primitivos)", () => {
  it("deixa passar o data: URI e devolve vazio no que ainda não existe", () => {
    expect(assetUrl("data:image/png;base64,AAA")).toBe("data:image/png;base64,AAA")
    // O mapa de assets é dado de demonstração, que chega na onda 1d.
    expect(assetUrl("foto-do-hero")).toBe("")
    expect(assetUrl(undefined)).toBe("")
  })
})
