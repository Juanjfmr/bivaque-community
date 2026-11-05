import { describe, expect, it } from "vitest"

import { corpoDoEncontro, paraCampoDeDataHora, validarEncontro } from "@/src/eventos/formulario"

/**
 * A régua do formulário no app. Ela não substitui a do servidor — evita mandar
 * o que já se sabe que volta 400, e mantém os mesmos limites para a mensagem
 * aparecer antes do pedido.
 */

const valido = {
  titulo: "Café da manhã",
  descricao: "Encontro aberto.",
  comecaEm: "2026-11-10T09:00",
  local: "Praça do centro",
}

describe("validação do encontro", () => {
  it("aceita o formulário completo", () => {
    expect(validarEncontro(valido)).toBeNull()
  })

  it("exige título com pelo menos dois caracteres", () => {
    expect(validarEncontro({ ...valido, titulo: " a " })).toBe(
      "O título precisa de pelo menos 2 caracteres.",
    )
  })

  it("recusa título, descrição e local acima do teto do servidor", () => {
    expect(validarEncontro({ ...valido, titulo: "x".repeat(201) })).toContain("200")
    expect(validarEncontro({ ...valido, descricao: "x".repeat(2001) })).toContain("2000")
    expect(validarEncontro({ ...valido, local: "x".repeat(201) })).toContain("200")
  })

  it("exige data e recusa data impossível", () => {
    expect(validarEncontro({ ...valido, comecaEm: "  " })).toBe(
      "Informe a data e a hora do encontro.",
    )
    expect(validarEncontro({ ...valido, comecaEm: "2026-13-45T99:99" })).toBe(
      "Data e hora inválidas.",
    )
  })
})

describe("corpo enviado", () => {
  it("tira espaço sobrando e manda o instante em ISO", () => {
    const corpo = corpoDoEncontro({ ...valido, titulo: "  Café  ", local: "  Praça  " })
    expect(corpo.titulo).toBe("Café")
    expect(corpo.local).toBe("Praça")
    expect(corpo.comecaEm).toBe(new Date("2026-11-10T09:00").toISOString())
  })
})

describe("ida e volta do campo de data", () => {
  it("o valor do campo volta igual ao que foi digitado", () => {
    const iso = new Date("2026-11-10T09:30").toISOString()
    expect(paraCampoDeDataHora(iso)).toBe("2026-11-10T09:30")
  })

  it("data inválida não vira campo preenchido", () => {
    expect(paraCampoDeDataHora("nada")).toBe("")
  })
})
