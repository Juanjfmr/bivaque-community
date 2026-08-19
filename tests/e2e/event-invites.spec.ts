// Onda F Task 3 — organizer event invitation fan-out.
//
// Committed without running per README "E2E precisa do dono".

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("event invitation fan-out", () => {
  test("the organizer sees the invite section with eligible members", async ({ page }) => {
    // Given a session of an event organizer
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open an event they organize
    await page.goto("/events/60000000-0000-4000-8000-000000000010")

    // Then the invite fan-out section is visible
    await expect(page.getByRole("heading", { name: /Convidar para este evento/ })).toBeVisible()
  })

  test("the invite section does NOT expose a people search field", async ({ page }) => {
    // Given a session of an event organizer
    await seedSession(page.context())
    await page.goto("/events/60000000-0000-4000-8000-000000000010")

    // Then there is no search box (D43 forbids people search in the pilot)
    const search = page.locator('input[type="search"]')
    await expect(search).toHaveCount(0)
  })
})
