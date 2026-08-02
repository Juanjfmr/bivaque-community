import { expect, test } from "@playwright/test"

test.describe("BottomNav visibility across viewports", () => {
  test("shows all 4 navigation items at 375px", async ({ page }) => {
    // Given the mobile-375 viewport
    // When a user opens the root route
    await page.goto("/")

    // Then all 4 bottom navigation items are visible
    const nav = page.getByRole("navigation", { name: "Navegação principal" })
    await expect(nav).toBeVisible()

    const tabs = nav.getByRole("tab")
    await expect(tabs).toHaveCount(4)

    await expect(tabs.nth(0)).toContainText("Minha comunidade")
    await expect(tabs.nth(1)).toContainText("Grupos")
    await expect(tabs.nth(2)).toContainText("Eventos")
    await expect(tabs.nth(3)).toContainText("Perfil")
  })

  test("shows all 4 navigation items at 768px", async ({ page }) => {
    // Given the tablet-768 viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    // When a user opens the root route
    await page.goto("/")

    // Then all 4 bottom navigation items are visible
    const nav = page.getByRole("navigation", { name: "Navegação principal" })
    await expect(nav).toBeVisible()

    const tabs = nav.getByRole("tab")
    await expect(tabs).toHaveCount(4)
  })

  test("shows all 4 navigation items at 1440px", async ({ page }) => {
    // Given the desktop-1440 viewport
    await page.setViewportSize({ width: 1440, height: 900 })
    // When a user opens the root route
    await page.goto("/")

    // Then all 4 bottom navigation items are visible
    const nav = page.getByRole("navigation", { name: "Navegação principal" })
    await expect(nav).toBeVisible()

    const tabs = nav.getByRole("tab")
    await expect(tabs).toHaveCount(4)
  })
})

test.describe("Indicações discoverable entry", () => {
  test("shows the Indicações button in the header at 375px", async ({ page }) => {
    // Given the mobile-375 viewport
    // When a user opens the root route
    await page.goto("/")

    // Then the Indicações button is visible in the header
    const indicationsButton = page.getByRole("button", { name: "Indicações" })
    await expect(indicationsButton).toBeVisible()
  })

  test("shows the Indicações button in the header at 1440px", async ({ page }) => {
    // Given the desktop-1440 viewport
    await page.setViewportSize({ width: 1440, height: 900 })
    // When a user opens the root route
    await page.goto("/")

    // Then the Indicações button is visible in the header
    const indicationsButton = page.getByRole("button", { name: "Indicações" })
    await expect(indicationsButton).toBeVisible()
  })
})

test.describe("Navigation tab links", () => {
  test("each nav tab has an href pointing to the correct route", async ({ page }) => {
    // Given the mobile-375 viewport
    // When a user opens the root route
    await page.goto("/")

    // Then each tab links to the expected future route
    const nav = page.getByRole("navigation", { name: "Navegação principal" })
    const tabs = nav.getByRole("tab")

    const expectedHrefs = ["/community", "/groups", "/events", "/profile"]

    for (let index = 0; index < expectedHrefs.length; index++) {
      const href = await tabs.nth(index).getAttribute("href")
      expect(href).toBe(expectedHrefs[index])
    }
  })
})
