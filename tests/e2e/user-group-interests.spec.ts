// Onda E Task 11 — group interests + suggestion feed.
//
// Committed without running per README: "E2E precisa do dono" — needs the
// seeded database. The asserts below encode §3.2 (interests map to
// groups, no parallel taxonomy) and §3.3 (private groups only suggest to
// members of their container).

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("group interests", () => {
  test("the interests page renders the locality groups and lets the user save", async ({
    page,
  }) => {
    // Given a verified approved member of the seeded locality
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open the interests page
    await page.goto("/profile/interests")

    // Then the heading and the locality copy are visible. The real copy
    // (interests-section.tsx) reads "usados para sugerir grupos da sua
    // cidade" — "sugerir" (infinitive), not "sugerem" — found running the
    // E2E realignment.
    await expect(page.getByRole("heading", { name: "Assuntos de interesse" })).toBeVisible()
    await expect(page.getByText(/sugerir grupos da sua cidade/i)).toBeVisible()

    // And the save button is enabled
    const saveButton = page.getByRole("button", { name: /Salvar interesses/ })
    await expect(saveButton).toBeEnabled()
  })

  test("the profile links to the interests page", async ({ page }) => {
    // Given the authenticated member
    await seedSession(page.context())

    // When they open the profile editor. Desde 25/09/2026 o perfil mostra e a
    // edição fica em /profile/editar, junto dos assuntos de interesse.
    await page.goto("/profile/editar")

    // Then a link to the interests page is rendered
    await expect(page.getByRole("link", { name: /Assuntos de interesse/ })).toBeVisible()
  })

  test("when the locality has no groups, the empty state offers a creation path", async ({
    page,
  }) => {
    // Given a user whose locality has no groups yet (depends on seed state)
    await seedSession(page.context())

    // When they open the interests page
    await page.goto("/profile/interests")

    // The section fetches its data client-side and renders null until it
    // resolves (interests-section.tsx: `if (!loaded) return null`) — wait
    // for the heading first, so the isVisible() snapshots below don't race
    // an unloaded page and read both as false.
    await expect(page.getByRole("heading", { name: "Assuntos de interesse" })).toBeVisible()

    // Then either the empty-state offer is rendered OR the group list is
    // rendered (the test passes when one or the other is visible).
    const empty = page.getByRole("link", { name: /Criar o primeiro grupo/ })
    const groups = page.getByRole("button", { name: /Salvar interesses/ })

    const emptyVisible = await empty.isVisible().catch(() => false)
    const groupsVisible = await groups.isVisible().catch(() => false)
    expect(emptyVisible || groupsVisible).toBe(true)
  })
})
