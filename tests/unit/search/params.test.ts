import { describe, expect, it } from "vitest"
import {
  isSessionExpiredError,
  paginate,
  resolvePage,
  resolveTerm,
} from "../../../apps/web/lib/search/params"

function paramsFrom(init: Record<string, string>): (key: string) => string | null {
  const params = new URLSearchParams(init)
  return (key) => params.get(key)
}

describe("resolveTerm", () => {
  it("uses q as the canonical parameter", () => {
    expect(resolveTerm(paramsFrom({ q: "eletricista" }))).toBe("eletricista")
  })

  it("accepts the legacy search alias only when q is absent", () => {
    expect(resolveTerm(paramsFrom({ search: "encanador" }))).toBe("encanador")
  })

  it("keeps one meaning: q wins over the alias, never merged", () => {
    expect(resolveTerm(paramsFrom({ q: "pintor", search: "encanador" }))).toBe("pintor")
  })

  it("treats an explicit empty q as no term, not as a fallback to the alias", () => {
    expect(resolveTerm(paramsFrom({ q: "", search: "encanador" }))).toBe("")
  })

  it("trims whitespace", () => {
    expect(resolveTerm(paramsFrom({ q: "  escola  " }))).toBe("escola")
  })

  it("returns empty when neither parameter exists", () => {
    expect(resolveTerm(paramsFrom({ bairro: "1" }))).toBe("")
  })
})

describe("resolvePage", () => {
  it("defaults to 1", () => {
    expect(resolvePage(null)).toBe(1)
  })

  it("parses positive integers", () => {
    expect(resolvePage("3")).toBe(3)
  })

  it("rejects garbage, zero and negatives", () => {
    expect(resolvePage("abc")).toBe(1)
    expect(resolvePage("0")).toBe(1)
    expect(resolvePage("-2")).toBe(1)
  })
})

describe("paginate", () => {
  const rows = Array.from({ length: 25 }, (_, i) => i)

  it("windows the authorized list and reports the real total", () => {
    const result = paginate(rows, 2, 10)
    expect(result.items).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
    expect(result.total).toBe(25)
    expect(result.pageCount).toBe(3)
  })

  it("clamps a page beyond the end instead of rendering an empty lie", () => {
    const result = paginate(rows, 99, 10)
    expect(result.page).toBe(3)
    expect(result.items.length).toBe(5)
  })

  it("keeps one page for an empty list", () => {
    const result = paginate([], 1, 10)
    expect(result.items).toEqual([])
    expect(result.pageCount).toBe(1)
    expect(result.total).toBe(0)
  })
})

describe("isSessionExpiredError", () => {
  it("classifies PostgREST auth rejections as expired session", () => {
    expect(isSessionExpiredError({ code: "PGRST301", message: "JWT expired" })).toBe(true)
    expect(isSessionExpiredError({ code: "401", message: "invalid JWT" })).toBe(true)
    expect(isSessionExpiredError({ code: null, message: "JWSError JWSInvalidSignature" })).toBe(
      true,
    )
  })

  it("does not swallow ordinary failures into the session state", () => {
    expect(isSessionExpiredError({ code: "42P01", message: "relation does not exist" })).toBe(false)
    expect(isSessionExpiredError(null)).toBe(false)
    expect(isSessionExpiredError(undefined)).toBe(false)
  })
})
