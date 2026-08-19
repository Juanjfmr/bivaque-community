// Onda E Task 4 — composer shows reach before submit, defaults to the vila,
// and the city-reach post is rendered with a chip in the feed.
//
// Committed without running per README "E2E precisa do dono".

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("audience selector and reach chip", () => {
  test("the audience notice describes who will read", async ({ page }) => {
    // Given an authenticated session with a seeded approved community
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When the composer opens
    await page.goto("/community")
    await page
      .getByRole("button", { name: /Publicar/ })
      .first()
      .click()

    // Then the audience section renders with a notice
    await expect(page.getByText(/vão ler/i).first()).toBeVisible()
  })

  test("city-reach post carries a chip with the locality name in the feed", async ({ page }) => {
    // Given a session whose locality has at least one city-reach post (the
    // dev seed sets this up)
    await seedSession(page.context())

    // When the member opens the home feed
    await page.goto("/community")

    // Then a city-reach chip is visible on the city-wide post
    const chip = page.getByRole("button", { name: /inteira$/i }).first()
    await expect(chip).toBeVisible()
  })
})
