// Onda F Task 9 — real photo upload with EXIF stripping.
//
// Committed without running per README "E2E precisa do dono".

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("photo upload", () => {
  test("the composer has a file picker for photos", async ({ page }) => {
    // Given a session of a member
    await seedSession(page.context())
    // When they open the community page and use the real publication entry
    await page.goto("/community")
    await page.getByRole("button", { name: "Publicar" }).first().click()
    await expect(page).toHaveURL(/\/publicacoes\/nova/)

    // And select Photo type
    const composer = page.locator("[data-composer-form]")
    await expect(composer).toBeVisible()
    await expect(composer).toHaveAttribute("data-draft-ready", "true")
    await composer.getByRole("button", { name: "Foto", exact: true }).click()

    // Then a file input is present (not a text input)
    const fileInput = composer.getByLabel("Selecionar foto")
    await expect(fileInput).toBeVisible()
  })
})
