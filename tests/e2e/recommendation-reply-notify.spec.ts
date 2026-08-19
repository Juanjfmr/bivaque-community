// Onda F Task 5 — close the ask-and-answer loop: author notified on reply,
// edit/delete own reply, Explorar links to detail, request resolved.
//
// Committed without running per README "E2E precisa do dono".

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("recommendation ask-and-answer loop", () => {
  test("an author can mark their request resolved", async ({ page }) => {
    // Given a session of a member who authored a request
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open the recommendations page
    await page.goto("/recommendations")

    // Then the "Marcar como resolvido" action is reachable for a request
    await expect(page.getByRole("button", { name: /Marcar como resolvido/ }).first()).toBeVisible()
  })

  test("the invite surface has no people search (D43)", async ({ page }) => {
    // Given a session
    await seedSession(page.context())
    await page.goto("/recommendations")

    // Then no search input is present on the recommendation surface
    const search = page.locator('input[type="search"]')
    await expect(search).toHaveCount(0)
  })
})
