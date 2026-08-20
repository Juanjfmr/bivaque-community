// Onda F Task 9 — real photo upload with EXIF stripping.
//
// Committed without running per README "E2E precisa do dono".

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("photo upload", () => {
  test("the composer has a file picker for photos", async ({ page }) => {
    // Given a session of a member
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open the community page and click Publicar to open the modal
    await page.goto("/community")
    await page.getByRole("button", { name: /Publicar/i }).click()

    // And select Photo type
    await page.getByRole("button", { name: /Foto/i }).click()

    // Then a file input is present (not a text input)
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeVisible()
  })
})
