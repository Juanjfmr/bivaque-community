import { describe, expect, it } from "vitest"
import {
  DEFAULT_ENTRY_MODE,
  ENTRY_MODES,
  entryCopy,
  isPlausibleEmail,
  parseEntryMode,
} from "../entry-mode"

describe("parseEntryMode", () => {
  it("keeps each declared mode", () => {
    for (const mode of ENTRY_MODES) {
      expect(parseEntryMode(mode)).toBe(mode)
    }
  })

  it("reads the first value when expo-router repeats the parameter", () => {
    expect(parseEntryMode(["criar-conta", "entrar"])).toBe("criar-conta")
  })

  it("falls back to returning, never to account creation", () => {
    for (const value of [undefined, null, "", "signup", "criar", 7, {}]) {
      expect(parseEntryMode(value)).toBe(DEFAULT_ENTRY_MODE)
    }
    expect(DEFAULT_ENTRY_MODE).toBe("entrar")
  })
})

describe("entryCopy", () => {
  it("says something different for each path", () => {
    const entrar = entryCopy("entrar")
    const criar = entryCopy("criar-conta")
    expect(entrar.title).not.toBe(criar.title)
    expect(entrar.submit).not.toBe(criar.submit)
  })

  it("never promises access as a consequence of creating an account", () => {
    for (const mode of ENTRY_MODES) {
      const copy = entryCopy(mode)
      const text = `${copy.title} ${copy.description} ${copy.submit}`.toLowerCase()
      expect(text).not.toContain("aprovado")
      expect(text).not.toContain("verificado")
      expect(text).not.toContain("acesso liberado")
    }
  })
})

describe("isPlausibleEmail", () => {
  it("accepts an ordinary address", () => {
    expect(isPlausibleEmail("ana.ribeiro@exemplo.com.br")).toBe(true)
    expect(isPlausibleEmail("  ana@exemplo.com  ")).toBe(true)
  })

  it("rejects what cannot be an address", () => {
    for (const value of [
      "",
      "ana",
      "ana@",
      "@exemplo.com",
      "ana@exemplo",
      "ana@.com",
      "ana@exemplo.",
      "ana exemplo@x.com",
      "a@b@exemplo.com",
    ]) {
      expect(isPlausibleEmail(value)).toBe(false)
    }
  })

  it("rejects an address longer than the RFC limit", () => {
    expect(isPlausibleEmail(`${"a".repeat(250)}@exemplo.com`)).toBe(false)
  })
})
