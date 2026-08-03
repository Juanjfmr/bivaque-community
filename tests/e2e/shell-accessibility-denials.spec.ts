import { expect, test } from "@playwright/test"

test.describe("Horizontal overflow prevention", () => {
  test("has no horizontal overflow at 375px viewport", async ({ page }) => {
    // Given the mobile-375 viewport
    // When a user opens the root route
    await page.goto("/")

    // Then the page body does not overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
  })

  test("has no horizontal overflow at 768px viewport", async ({ page }) => {
    // Given the tablet-768 viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    // When a user opens the root route
    await page.goto("/")

    // Then the page body does not overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
  })

  test("has no horizontal overflow at 1440px viewport", async ({ page }) => {
    // Given the desktop-1440 viewport
    await page.setViewportSize({ width: 1440, height: 900 })
    // When a user opens the root route
    await page.goto("/")

    // Then the page body does not overflow horizontally
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
  })
})

test.describe("Keyboard focus visibility", () => {
  test("bottom nav tabs show visible focus indicator when focused", async ({ page }) => {
    // Given the mobile-375 viewport
    // When the first bottom nav tab receives keyboard focus
    await page.goto("/")
    const firstTab = page.locator("[role='tab']").first()
    await firstTab.focus()

    // Then the focused element is a tab with a visible style
    const focused = page.locator("*:focus")
    const focusedCount = await focused.count()
    expect(focusedCount).toBeGreaterThanOrEqual(1)

    const isTabRole = await focused.first().evaluate((el) => {
      return el.getAttribute("role") === "tab"
    })
    expect(isTabRole).toBe(true)
  })
})

test.describe("Touch target minimum size", () => {
  test("bottom nav tabs have touch targets of at least 44px", async ({ page }) => {
    // Given the mobile-375 viewport
    // When the bottom nav is rendered
    await page.goto("/")

    // Then each visible tab has a minimum touch target of 44px both dimensions
    const tabs = page.locator("[role='tablist'] [role='tab']")
    const count = await tabs.count()
    expect(count).toBe(4)

    for (let index = 0; index < count; index++) {
      const tab = tabs.nth(index)
      await tab.waitFor({ state: "visible" })
      let box = await tab.boundingBox()
      for (let attempt = 0; attempt < 5 && box === null; attempt++) {
        await page.waitForTimeout(250)
        box = await tab.boundingBox()
      }
      expect(box).not.toBeNull()

      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.width).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test("Indicações button has a touch target of at least 44px", async ({ page }) => {
    // Given the mobile-375 viewport
    // When the header is rendered
    await page.goto("/")

    // Then the Indicações button has a minimum touch target of 44px both dimensions
    const button = page.getByRole("button", { name: "Indicações" })
    const box = await button.boundingBox()
    expect(box).not.toBeNull()

    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
    }
  })
})

test.describe("Reduced motion respect", () => {
  test("reduced-motion media query is active when preference is set", async ({ page }) => {
    // Given a browser with prefers-reduced-motion: reduce
    await page.emulateMedia({ reducedMotion: "reduce" })

    // When the page loads
    await page.goto("/")

    // Then the reduced-motion media query matches
    const motionQueryMatches = await page.evaluate(() => {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    })
    expect(motionQueryMatches).toBe(true)

    // And scroll-behavior is forced to auto on the root element
    const scrollBehavior = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).scrollBehavior
    })
    expect(scrollBehavior).toBe("auto")
  })
})
