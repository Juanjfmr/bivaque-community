// Escolha de cidade entre os passos do contexto (prancha 39). O rascunho de
// navegação mora no sessionStorage; o parse é puro e prova que dado corrompido
// vira ausência, nunca uma cidade inventada.

import { describe, expect, it } from "vitest"
import {
  CITY_STORAGE_KEY,
  parseStoredCity,
  readStoredCity,
  writeStoredCity,
} from "web/app/(preauth)/onboarding/city-storage"

const CITY = {
  id: "00000000-0000-4000-8000-000000000001",
  ibgeCode: "1302603",
  cityName: "Manaus",
  stateCode: "AM",
}

describe("parseStoredCity", () => {
  it("lê a cidade completa (positivo)", () => {
    expect(parseStoredCity(JSON.stringify(CITY))).toEqual(CITY)
  })

  it("ausente, vazio ou JSON inválido viram nulo", () => {
    expect(parseStoredCity(null)).toBeNull()
    expect(parseStoredCity("")).toBeNull()
    expect(parseStoredCity("{not json")).toBeNull()
  })

  it("objeto sem os campos obrigatórios vira nulo (nada é inventado)", () => {
    expect(parseStoredCity(JSON.stringify({ cityName: "Manaus" }))).toBeNull()
    expect(parseStoredCity(JSON.stringify({ ...CITY, stateCode: 42 }))).toBeNull()
  })
})

describe("read/write no storage", () => {
  it("grava e lê a mesma cidade (positivo)", () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
    }
    writeStoredCity(storage, CITY)
    expect(store.get(CITY_STORAGE_KEY)).toBe(JSON.stringify(CITY))
    expect(readStoredCity(storage)).toEqual(CITY)
  })

  it("storage vazio devolve nulo (negativo)", () => {
    expect(readStoredCity({ getItem: () => null })).toBeNull()
  })
})
