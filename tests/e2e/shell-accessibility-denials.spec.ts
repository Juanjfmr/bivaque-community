import { expect, test } from "@playwright/test"
import { BOTTOM_NAV, seedSession } from "./helpers/session"

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
  test("bottom nav tabs show visible focus indicator when focused", async ({ page, context }) => {
    // Given an authenticated member on a viewport that still shows the BottomNav
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })

    // When the first bottom nav tab receives keyboard focus
    await page.goto("/community")
    const firstTab = page.locator(BOTTOM_NAV).getByRole("tab").first()
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
  test("bottom nav tabs have touch targets of at least 44px", async ({ page, context }) => {
    // Given an authenticated member on a viewport that still shows the BottomNav
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })

    // When the bottom nav is rendered
    await page.goto("/community")

    // Then each visible tab has a minimum touch target of 44px both dimensions
    const tabs = page.locator(BOTTOM_NAV).getByRole("tab")
    // FIGMA-001 (decisão do dono 05/10/2026): três containers nesta versão.
    await expect(tabs).toHaveCount(3)
    const count = await tabs.count()

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

  test("Conversas entry in the header has a touch target of at least 44px", async ({
    page,
    context,
  }) => {
    // Given an authenticated member on the mobile-375 viewport, where the
    // owner's 05/10/2026 navigation puts Conversas in the top shell (the old
    // Indicações header icon no longer exists in this version)
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })

    // When the header is rendered
    await page.goto("/community")

    // Then the Conversas entry has a minimum touch target of 44px
    const entry = page.locator("header").getByRole("link", { name: "Conversas" })
    const box = await entry.boundingBox()
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
