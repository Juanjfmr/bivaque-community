// Onda F Task 7 — health requests must start inside a group.
//
// Committed without running per README "E2E precisa do dono".

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("health request scope", () => {
  test("the form explains the health scope before submit", async ({ page }) => {
    // Given a session of a member who has at least one group
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open the recommendations page and switch to the Pedir tab
    await page.goto("/recommendations")
    await page.getByRole("tab", { name: /Pedir indicação/i }).click()

    // And select the Saúde category
    const catTrigger = page.locator('[aria-label="Categoria"]').first()
    await catTrigger.click()
    await page.getByRole("option", { name: /Saúde/i }).click()

    // Then the explanatory line appears
    await expect(page.getByText(/Pedidos de Saúde começam em grupo/)).toBeVisible()

    // And the locality option is hidden (Manaus no longer in the list)
    const scopeTrigger = page.locator('[aria-label="Alcance"]').first()
    await scopeTrigger.click()
    const manausOption = page.getByRole("option", { name: /^Manaus$/ })
    await expect(manausOption).toHaveCount(0)
  })
})
