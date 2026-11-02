// O rascunho da tela de cidade e momento (PORT-005). Antes eram dois passos e o
// sessionStorage levava só a cidade; agora leva o formulário inteiro, e o parse
// é puro: dado corrompido não vira cidade, data ou momento inventado.

import { describe, expect, it } from "vitest"
import {
  clearEntryDraft,
  DEFAULT_ENTRY_MOMENT,
  EMPTY_ENTRY_DRAFT,
  ENTRY_DRAFT_KEY,
  type EntryDraft,
  parseEntryDraft,
  parseStoredCity,
  readEntryDraft,
  writeEntryDraft,
} from "web/app/(preauth)/onboarding/city-storage"

const CITY = {
  id: "00000000-0000-4000-8000-000000000001",
  ibgeCode: "1302603",
  cityName: "Manaus",
  stateCode: "AM",
}

const DESTINATION = {
  id: "00000000-0000-4000-8000-000000000002",
  ibgeCode: "5300108",
  cityName: "Brasília",
  stateCode: "DF",
}

const DRAFT: EntryDraft = {
  arrivalDate: "",
  city: CITY,
  departureDate: "2026-11-20",
  destination: DESTINATION,
  moment: "leaving",
  name: "Ana Maria",
}

describe("parseStoredCity", () => {
  it("lê a cidade completa (positivo)", () => {
    expect(parseStoredCity(CITY)).toEqual(CITY)
  })

  it("objeto sem os campos obrigatórios vira nulo (nada é inventado)", () => {
    expect(parseStoredCity({ cityName: "Manaus" })).toBeNull()
    expect(parseStoredCity({ ...CITY, stateCode: 42 })).toBeNull()
    expect(parseStoredCity(null)).toBeNull()
    expect(parseStoredCity("Manaus")).toBeNull()
  })
})

describe("parseEntryDraft", () => {
  it("lê o rascunho inteiro (positivo)", () => {
    expect(parseEntryDraft(JSON.stringify(DRAFT))).toEqual(DRAFT)
  })

  it("ausente, vazio ou JSON inválido viram nulo", () => {
    expect(parseEntryDraft(null)).toBeNull()
    expect(parseEntryDraft("")).toBeNull()
    expect(parseEntryDraft("{not json")).toBeNull()
    expect(parseEntryDraft("[]")).toBeNull()
  })

  it("rascunho pela metade é restaurado no que dá, com os padrões do protótipo", () => {
    expect(parseEntryDraft(JSON.stringify({ name: "Ana" }))).toEqual({
      ...EMPTY_ENTRY_DRAFT,
      name: "Ana",
    })
    // Momento desconhecido não vira momento nenhum: fica o padrão ("chegando").
    expect(parseEntryDraft(JSON.stringify({ moment: "mudando" }))?.moment).toBe(
      DEFAULT_ENTRY_MOMENT,
    )
  })

  it("data fora do formato e nome acima do limite não passam", () => {
    const parsed = parseEntryDraft(
      JSON.stringify({ arrivalDate: "20/11/2026", name: "a".repeat(120) }),
    )
    expect(parsed?.arrivalDate).toBe("")
    expect(parsed?.name).toHaveLength(80)
  })
})

describe("read/write/clear no storage", () => {
  const store = () => {
    const map = new Map<string, string>()
    return {
      map,
      storage: {
        getItem: (key: string) => map.get(key) ?? null,
        removeItem: (key: string) => {
          map.delete(key)
        },
        setItem: (key: string, value: string) => {
          map.set(key, value)
        },
      },
    }
  }

  it("grava e lê o mesmo rascunho (positivo)", () => {
    const { map, storage } = store()
    writeEntryDraft(storage, DRAFT)
    expect(map.get(ENTRY_DRAFT_KEY)).toBe(JSON.stringify(DRAFT))
    expect(readEntryDraft(storage)).toEqual(DRAFT)
  })

  it("concluída a entrada, o rascunho sai", () => {
    const { map, storage } = store()
    writeEntryDraft(storage, DRAFT)
    clearEntryDraft(storage)
    expect(map.has(ENTRY_DRAFT_KEY)).toBe(false)
    expect(readEntryDraft(storage)).toBeNull()
  })

  it("storage vazio devolve nulo (negativo)", () => {
    expect(readEntryDraft({ getItem: () => null })).toBeNull()
  })
})
