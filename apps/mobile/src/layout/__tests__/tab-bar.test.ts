import { describe, expect, it } from "vitest"
import { getTabBarStyle } from "../tab-bar"

describe("tab bar safe-area ownership", () => {
  it("adds the bottom inset to the bar instead of the tab screen", () => {
    expect(getTabBarStyle(24)).toEqual({ height: 88, paddingTop: 8, paddingBottom: 32 })
  })

  it("keeps the base bar unchanged when the device reports no inset", () => {
    expect(getTabBarStyle(0)).toEqual({ height: 64, paddingTop: 8, paddingBottom: 8 })
  })
})
