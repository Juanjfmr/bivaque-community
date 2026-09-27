// Onda F Task 9 — real photo upload with EXIF stripping.
//
// Committed without running per README "E2E precisa do dono".

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("photo upload", () => {
  test("the composer has a file picker for photos", async ({ page }) => {
    // Given a session of a member
    await seedSession(page.context())
    // When they open the community page and open the composer. A conta do
    // seedSession() não tem comunidade: a Comunidade é a referência da cidade,
    // e publicar começa pelo "Publicar" dela.
    await page.goto("/community")
    await page.getByRole("button", { name: "Publicar" }).first().click()

    // And select Photo type
    const dialog = page.getByRole("dialog", { name: "Criar publicação" })
    await expect(dialog).toBeVisible()
    await dialog.getByRole("button", { name: "Foto", exact: true }).click()

    // Then a file input is present (not a text input)
    const fileInput = dialog.getByLabel("Selecionar foto")
    await expect(fileInput).toBeVisible()
  })
})
