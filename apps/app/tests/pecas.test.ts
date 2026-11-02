import { statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { caminhoDaIlustracao, caminhoDoSelo, ILUSTRACOES, iniciais, SELOS } from "@/src/pecas/pecas"

const pastaDasIlustracoes = join(import.meta.dirname, "..", "public", "ilustracoes")

// Orçamento por arquivo: a cena aparece em toda etapa do cadastro e o selo em
// toda lista de grupos; nenhum pode pesar como foto.
const LIMITE_DA_CENA = 80 * 1024
const LIMITE_DO_SELO = 12 * 1024

describe("Peças — iniciais do avatar", () => {
  it("usa a primeira letra do nome e a do último sobrenome", () => {
    expect(iniciais("Ana Souza")).toBe("AS")
    expect(iniciais("Carla R.")).toBe("CR")
    expect(iniciais("Maria da Silva Prado")).toBe("MP")
  })

  it("com um nome só, usa uma letra", () => {
    expect(iniciais("Marcos")).toBe("M")
    expect(iniciais("  lúcia  ")).toBe("L")
  })
})

describe("Peças — a família de ilustrações existe e é leve", () => {
  it("toda cena nomeada tem o arquivo, dentro do orçamento", () => {
    for (const nome of ILUSTRACOES) {
      const tamanho = statSync(join(pastaDasIlustracoes, `${nome}.webp`)).size
      expect(tamanho, nome).toBeGreaterThan(0)
      expect(tamanho, nome).toBeLessThanOrEqual(LIMITE_DA_CENA)
    }
  })

  it("todo selo nomeado tem o arquivo, dentro do orçamento", () => {
    for (const nome of SELOS) {
      const tamanho = statSync(join(pastaDasIlustracoes, `selo-${nome}.webp`)).size
      expect(tamanho, nome).toBeGreaterThan(0)
      expect(tamanho, nome).toBeLessThanOrEqual(LIMITE_DO_SELO)
    }
  })

  it("os caminhos saem da base do app", () => {
    expect(caminhoDaIlustracao("porta")).toBe(`${import.meta.env.BASE_URL}ilustracoes/porta.webp`)
    expect(caminhoDoSelo("pets")).toBe(`${import.meta.env.BASE_URL}ilustracoes/selo-pets.webp`)
  })
})
