import { expect, test } from "@playwright/test"
import { BOTTOM_NAV, SIDEBAR, seedSession } from "./helpers/session"

// The shell chrome only exists under the app's `(shell)` route group, and every
// route there is behind the session gate. These specs sign in and assert
// against /inicio — the home of the new navigation.
//
// FIGMA-001 (decisão direta do dono em 05/10/2026, reconciliada em
// tests/scope/navigation.test.mjs): a navegação do membro desta versão tem
// TRÊS containers — Início / Explorar / Perfil. Comunidades e Grupos saíram da
// navegação (rotas e dados históricos permanecem). Conversas é entrada do
// shell superior em todas as larguras, e item da sidebar no desktop.
// O teto de cinco itens (ADR-20260816, regra 2) continua valendo: três ≤ cinco.

test.describe("BottomNav visibility across viewports", () => {
  test("shows all 3 navigation items at 375px", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-375", "This assertion uses the mobile project.")

    // Given an authenticated member on the mobile-375 viewport
    await seedSession(context)

    // When they open the home route
    await page.goto("/inicio")

    // Then all 3 bottom navigation items are visible, in NAV_ITEMS order
    const nav = page.locator(BOTTOM_NAV)
    await expect(nav).toBeVisible()

    const tabs = nav.getByRole("tab")
    await expect(tabs).toHaveCount(3)

    await expect(tabs.nth(0)).toContainText("Início")
    await expect(tabs.nth(1)).toContainText("Explorar")
    await expect(tabs.nth(2)).toContainText("Perfil")

    // And Comunidades/Grupos are not navigation of this version
    await expect(nav).not.toContainText("Comunidades")
    await expect(nav).not.toContainText("Grupos")
  })

  test("gives way to the Figma sidebar at 768px", async ({ page, context }) => {
    // Given an authenticated member on the tablet-768 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 768, height: 1024 })

    // When they open the home route
    await page.goto("/inicio")

    // Then the BottomNav is gone and the sidebar takes over at 232px, the
    // width of the Figma reference (35:2629).
    await expect(page.locator(BOTTOM_NAV)).toBeHidden()

    const sidebar = page.locator(SIDEBAR)
    await expect(sidebar).toBeVisible()
    expect((await sidebar.boundingBox())?.width).toBe(232)
    await expect(page.getByRole("link", { name: "Conversas" }).first()).toBeAttached()
    await expect(sidebar).not.toContainText("Comunidades")
  })

  test("keeps the sidebar expanded at 1440px", async ({ page, context }) => {
    // Given an authenticated member on the desktop-1440 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 1440, height: 900 })

    // When they open the home route
    await page.goto("/inicio")

    // Then the BottomNav is hidden and the sidebar is expanded with labels
    await expect(page.locator(BOTTOM_NAV)).toBeHidden()
    expect((await page.locator(SIDEBAR).boundingBox())?.width).toBe(232)
    await expect(page.getByRole("link", { name: "Conversas" }).first()).toBeVisible()
  })
})

test.describe("Conversas discoverable entry", () => {
  test("is reachable from the header at 375px", async ({ page, context }) => {
    // Given an authenticated member on the mobile-375 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })

    // When they open the home route
    await page.goto("/inicio")

    // Then Conversas is a header entry, visible at every width — the owner's
    // direct instruction for this version — and opens the real inbox
    const conversas = page.locator("header").getByRole("link", { name: "Conversas" })
    await expect(conversas).toBeVisible()
    await expect(conversas).toHaveAttribute("href", "/messages")
  })

  test("keeps its accessible name at 768px", async ({ page, context }) => {
    // Given an authenticated member on the tablet-768 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 768, height: 1024 })

    // When they open the home route
    await page.goto("/inicio")

    // Then the header entry is still named and reachable
    const conversas = page.locator("header").getByRole("link", { name: "Conversas" })
    await expect(conversas).toBeVisible()
    await expect(conversas).toHaveAttribute("href", "/messages")
  })

  test("is reachable from the header at 1440px", async ({ page, context }) => {
    // Given an authenticated member on the desktop-1440 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 1440, height: 900 })

    // When they open the home route
    await page.goto("/inicio")

    // Then Conversas is reachable from the header, where it is a link
    const conversas = page.locator("header").getByRole("link", { name: "Conversas" })
    await expect(conversas).toBeVisible()
    await expect(conversas).toHaveAttribute("href", "/messages")
  })
})

test.describe("Navigation tab links", () => {
  test("each nav tab has an href pointing to the correct route", async ({ page, context }) => {
    // Given an authenticated member on the mobile-375 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })

    // When they open the home route
    await page.goto("/inicio")

    // Then each tab links to the expected route
    const tabs = page.locator(BOTTOM_NAV).getByRole("tab")

    const expectedHrefs = ["/inicio", "/explorar", "/profile"]

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

    // When they open the home route
    await page.goto("/inicio")

    // Then the header avatar links to /profile — the regression this plan can
    // cause. Scoped to <header> because the sidebar member card also names it.
    const avatar = page.locator("header").getByRole("link", { name: "Perfil" })
    await expect(avatar).toBeVisible()
    await expect(avatar).toHaveAttribute("href", "/profile")

    // And activating it lands on the profile route
    await avatar.click()
    await expect(page).toHaveURL(/\/profile/)
  })
})
