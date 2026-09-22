import { describe, expect, it } from "vitest"
import { buildGoingLine } from "../../../apps/web/app/(shell)/inicio/home-loaders"

describe("buildGoingLine monta a linha de presença do próximo encontro", () => {
  it("sem gente não inventa linha", () => {
    expect(buildGoingLine([], 0)).toBeNull()
  })

  it("degrada para a contagem quando nenhum nome é legível", () => {
    expect(buildGoingLine([], 1)).toBe("1 pessoa vai")
    expect(buildGoingLine([], 4)).toBe("4 pessoas vão")
  })

  it("um nome e mais gente", () => {
    expect(buildGoingLine(["Leila"], 1)).toBe("Leila vai")
    expect(buildGoingLine(["Leila"], 3)).toBe("Leila e mais 2 pessoas vão")
    expect(buildGoingLine(["Leila"], 2)).toBe("Leila e mais 1 pessoa vai")
  })

  it("dois nomes fecham a contagem ou citam o resto", () => {
    expect(buildGoingLine(["Leila", "Andréa"], 2)).toBe("Leila e Andréa vão")
    expect(buildGoingLine(["Leila", "Andréa"], 20)).toBe("Leila, Andréa e mais 18 pessoas vão")
  })

  it("ignora nome em branco em vez de tratar como pessoa", () => {
    expect(buildGoingLine(["  ", "Andréa"], 1)).toBe("Andréa vai")
  })
})
