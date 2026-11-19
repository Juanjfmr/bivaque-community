import { describe, expect, it } from "vitest"
import { emComposicao } from "@/src/casca/teclado"

describe("composição de teclado", () => {
  it("reconhece composição e o código de compatibilidade do Safari", () => {
    expect(emComposicao({ isComposing: true, keyCode: 13 })).toBe(true)
    expect(emComposicao({ isComposing: false, keyCode: 229 })).toBe(true)
    expect(emComposicao({ isComposing: false, keyCode: 13 })).toBe(false)
  })
})
