import { expect, test } from "@playwright/test"
import { BOTTOM_NAV, SIDEBAR, seedSession } from "./helpers/session"

// The shell chrome only exists under the app's `(shell)` route group, and every
// route there is behind the session gate. These specs sign in and assert
// against /inicio — the home of the new navigation.
//
// PROCESSO-DE-CONSTRUCAO §7 (2026-09-06) replaced the four historical containers
// of ADR-20260816 (Cidade / Minha comunidade / Grupos / Eu) with
// Início / Explorar / Comunidades / Perfil. The set is still exactly four
// (ceiling of five, ADR rule 2 preserved), enforced by
// tests/scope/navigation.test.mjs. Guia and Mercado are entries inside Explorar;
// grupos live inside a comunidade; Indicações is a header icon reachable at
// every width. BottomNav labels come from NavItem.shortLabel, which equals the
// label for all four new containers.

test.describe("BottomNav visibility across viewports", () => {
  test("shows all 4 navigation items at 375px", async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile-375", "This assertion uses the mobile project.")

    // Given an authenticated member on the mobile-375 viewport
    await seedSession(context)

    // When they open the home route
    await page.goto("/inicio")

    // Then all 4 bottom navigation items are visible, in NAV_ITEMS order
    const nav = page.locator(BOTTOM_NAV)
    await expect(nav).toBeVisible()

    const tabs = nav.getByRole("tab")
    await expect(tabs).toHaveCount(4)

    await expect(tabs.nth(0)).toContainText("Início")
    await expect(tabs.nth(1)).toContainText("Explorar")
    await expect(tabs.nth(2)).toContainText("Comunidades")
    await expect(tabs.nth(3)).toContainText("Perfil")
  })

  test("gives way to the icon rail at 768px", async ({ page, context }) => {
    // Given an authenticated member on the tablet-768 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 768, height: 1024 })

    // When they open the home route
    await page.goto("/inicio")

    // Then the BottomNav is gone and the sidebar takes over as a 4rem rail.
    // The labels stay in the accessibility tree even though they are not drawn.
    await expect(page.locator(BOTTOM_NAV)).toBeHidden()

    const sidebar = page.locator(SIDEBAR)
    await expect(sidebar).toBeVisible()
    expect((await sidebar.boundingBox())?.width).toBe(64)
    await expect(page.getByRole("link", { name: "Comunidades" })).toBeAttached()
  })

  test("expands the sidebar at 1440px", async ({ page, context }) => {
    // Given an authenticated member on the desktop-1440 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 1440, height: 900 })

    // When they open the home route
    await page.goto("/inicio")

    // Then the BottomNav is hidden and the sidebar is expanded with labels
    await expect(page.locator(BOTTOM_NAV)).toBeHidden()
    expect((await page.locator(SIDEBAR).boundingBox())?.width).toBe(256)
    await expect(page.getByRole("link", { name: "Comunidades" })).toBeVisible()
  })
})

test.describe("Indicações discoverable entry", () => {
  test("is reachable from the header at 375px", async ({ page, context }) => {
    // Given an authenticated member on the mobile-375 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })

    // When they open the home route
    await page.goto("/inicio")

    // Then Indicações is a labelled header entry, visible at every width — not
    // a BottomNav tab (the ceiling of four containers has no room for it).
    // Era ícone de lâmpada até 18/09/2026; virou entrada rotulada por decisão
    // do RECON-038 #4, e o nome acessível passou a vir do próprio texto.
    const indications = page.getByRole("link", { name: "Indicações" })
    await expect(indications).toBeVisible()
    await expect(indications).toHaveAttribute("href", "/community?vista=indicacoes")
  })

  test("keeps its accessible name in the 768px rail", async ({ page, context }) => {
    // Given an authenticated member on the tablet-768 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 768, height: 1024 })

    // When they open the home route
    await page.goto("/inicio")

    // Then the header entry is still named and reachable
    const indications = page.getByRole("link", { name: "Indicações" })
    await expect(indications).toBeVisible()
    await expect(indications).toHaveAttribute("href", "/community?vista=indicacoes")
  })

  test("is reachable from the header at 1440px", async ({ page, context }) => {
    // Given an authenticated member on the desktop-1440 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 1440, height: 900 })

    // When they open the home route
    await page.goto("/inicio")

    // Then Indicações is reachable from the header, where it is a link
    const indications = page.getByRole("link", { name: "Indicações" })
    await expect(indications).toBeVisible()
    await expect(indications).toHaveAttribute("href", "/community?vista=indicacoes")
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

    const expectedHrefs = ["/inicio", "/explorar", "/communities", "/profile"]

    for (let index = 0; index < expectedHrefs.length; index++) {
      const href = await tabs.nth(index).getAttribute("href")
      expect(href).toBe(expectedHrefs[index])
    }
  })
})

test.describe("Profile reachable on mobile", () => {
  test("the bottom nav reaches /profile and the header has no avatar on mobile", async ({
    page,
    context,
  }) => {
    // Given an authenticated member on the mobile-375 viewport
    await seedSession(context)
    await page.setViewportSize({ width: 375, height: 812 })

    // When they open the home route
    await page.goto("/inicio")

    // Then the header does not repeat Perfil: no celular o avatar repetia a aba
    // Perfil da barra inferior e saiu do cabeçalho (app-shell.tsx).
    await expect(page.locator("header").getByRole("link", { name: "Perfil" })).toBeHidden()

    // And the Perfil tab of the bottom nav lands on the profile route
    const tab = page
      .locator('[data-slot="tabs-list"][aria-label="Seções do aplicativo"]')
      .getByRole("tab", { name: /Perfil/ })
    await expect(tab).toBeVisible()
    await tab.click()
    await expect(page).toHaveURL(/\/profile/)
  })
})
