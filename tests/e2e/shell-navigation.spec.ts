import { expect, test } from "@playwright/test"
import { BOTTOM_NAV, SIDEBAR, seedSession } from "./helpers/session"

// The shell chrome only exists under the app's `(shell)` route group, and every
// route there is behind the session gate. These specs used to open "/" while
// unauthenticated, which lands on /login — a `(preauth)` route with no layout
// and therefore no nav at all. They sign in and assert against /community
// instead.
//
// BottomNav labels come from NavItem.shortLabel when present, so the community
// tab reads "Comunidade", not "Minha comunidade".

test.describe("BottomNav visibility across viewports", () => {
  test("shows all 5 navigation items at 375px", async ({ page, context }) => {
    // Given an authenticated member on the mobile-375 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })

    // When they open the community route
    await page.goto("/community")

    // Then all 5 bottom navigation items are visible, in NAV_ITEMS order
    const nav = page.locator(BOTTOM_NAV)
    await expect(nav).toBeVisible()

    const tabs = nav.getByRole("tab")
    await expect(tabs).toHaveCount(5)

    await expect(tabs.nth(0)).toContainText("Comunidade")
    await expect(tabs.nth(1)).toContainText("Grupos")
    await expect(tabs.nth(2)).toContainText("Eventos")
    await expect(tabs.nth(3)).toContainText("Indicações")
    await expect(tabs.nth(4)).toContainText("Mensagens")
  })

  test("gives way to the icon rail at 768px", async ({ page, context }) => {
    // Given an authenticated member on the tablet-768 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 768, height: 1024 })

    // When they open the community route
    await page.goto("/community")

    // Then the BottomNav is gone and the sidebar takes over as a 4rem rail.
    // The labels stay in the accessibility tree even though they are not drawn.
    await expect(page.locator(BOTTOM_NAV)).toBeHidden()

    const sidebar = page.locator(SIDEBAR)
    await expect(sidebar).toBeVisible()
    expect((await sidebar.boundingBox())?.width).toBe(64)
    await expect(page.getByRole("link", { name: "Minha comunidade" })).toBeAttached()
  })

  test("expands the sidebar at 1440px", async ({ page, context }) => {
    // Given an authenticated member on the desktop-1440 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 1440, height: 900 })

    // When they open the community route
    await page.goto("/community")

    // Then the BottomNav is hidden and the sidebar is expanded with labels
    await expect(page.locator(BOTTOM_NAV)).toBeHidden()
    expect((await page.locator(SIDEBAR).boundingBox())?.width).toBe(256)
    await expect(page.getByRole("link", { name: "Minha comunidade" })).toBeVisible()
  })
})

test.describe("Indicações discoverable entry", () => {
  test("is reachable from the BottomNav at 375px", async ({ page, context }) => {
    // Given an authenticated member on the mobile-375 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })

    // When they open the community route
    await page.goto("/community")

    // Then Indicações is in the BottomNav, not desktop-only
    const indications = page.locator(BOTTOM_NAV).getByRole("tab", { name: "Indicações" })
    await expect(indications).toBeVisible()
    await expect(indications).toHaveAttribute("href", "/recommendations")
  })

  test("keeps its accessible name in the 768px icon rail", async ({ page, context }) => {
    // Given an authenticated member on the tablet-768 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 768, height: 1024 })

    // When they open the community route
    await page.goto("/community")

    // Then the rail entry is still named, even though only the icon is drawn —
    // the icon itself is aria-hidden, so the label carries the name.
    const indications = page.getByRole("link", { name: "Indicações" })
    await expect(indications).toBeAttached()
    await expect(indications).toHaveAttribute("href", "/recommendations")
  })

  test("is reachable from the sidebar at 1440px", async ({ page, context }) => {
    // Given an authenticated member on the desktop-1440 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 1440, height: 900 })

    // When they open the community route
    await page.goto("/community")

    // Then Indicações is reachable from the sidebar, where it is a link
    const indications = page.getByRole("link", { name: "Indicações" })
    await expect(indications).toBeVisible()
    await expect(indications).toHaveAttribute("href", "/recommendations")
  })
})

test.describe("Navigation tab links", () => {
  test("each nav tab has an href pointing to the correct route", async ({ page, context }) => {
    // Given an authenticated member on the mobile-375 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })

    // When they open the community route
    await page.goto("/community")

    // Then each tab links to the expected route
    const tabs = page.locator(BOTTOM_NAV).getByRole("tab")

    const expectedHrefs = ["/community", "/groups", "/events", "/recommendations", "/messages"]

    for (let index = 0; index < expectedHrefs.length; index++) {
      const href = await tabs.nth(index).getAttribute("href")
      expect(href).toBe(expectedHrefs[index])
    }
  })
})

test.describe("Profile reachable from the header avatar", () => {
  test("header avatar links to /profile on mobile", async ({ page, context }) => {
    // Given an authenticated member on the mobile-375 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })

    // When they open the community route
    await page.goto("/community")

    // Then the header avatar links to /profile — the regression this plan can cause
    const avatar = page.getByRole("link", { name: "Perfil" })
    await expect(avatar).toBeVisible()
    await expect(avatar).toHaveAttribute("href", "/profile")

    // And activating it lands on the profile route
    await avatar.click()
    await expect(page).toHaveURL(/\/profile/)
  })
})
