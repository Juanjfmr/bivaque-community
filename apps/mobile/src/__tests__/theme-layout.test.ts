import { describe, expect, it } from "vitest"
import { bodyLineHeight, theme } from "../theme"

describe("native text layout", () => {
  it("uses a pixel line height large enough for the body font", () => {
    expect(bodyLineHeight(theme.text.sm)).toBe(21)
    expect(bodyLineHeight(theme.text.sm)).toBeGreaterThan(theme.text.sm)
  })
})
