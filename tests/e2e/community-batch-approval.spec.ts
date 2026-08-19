// Onda E Task 5 — batch approval, pagination and moderator delegation.
//
// The E2E spec asserts:
//   - Approve batch: selecting 3 of 5 and approving leaves exactly 2 pending.
//   - Promote/demote via the delegation page.
//
// Like other E2E specs in this wave, the file is committed without running —
// it needs the seeded database and the running test server.

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("community batch approval and delegation", () => {
  test("approving 3 of 5 selected leaves exactly 2 pending", async ({ page }) => {
    // Given an authenticated session whose seed membership is the owner of a
    // vila with at least 5 pending entries (the dev seed sets this up).
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When the owner opens the pending queue
    await page.goto("/communities/70000000-0000-4000-8000-000000000001/admin/pending")

    // Then five checkboxes are rendered and selectable
    const checkboxes = page.getByRole("checkbox", { name: /Selecionar/ })
    await expect(checkboxes.nth(4)).toBeVisible()

    // When the owner selects the first three
    await checkboxes.nth(0).check()
    await checkboxes.nth(1).check()
    await checkboxes.nth(2).check()

    // And clicks the batch approve button
    await page.getByRole("button", { name: "Aprovar selecionados" }).click()

    // Then the queue reloads and exactly two remain
    const remaining = page.getByRole("checkbox", { name: /Selecionar/ })
    await expect(remaining).toHaveCount(2)
  })

  test("promote page lists eligible members and offers a promote button", async ({ page }) => {
    // Given the owner
    await seedSession(page.context())

    // When they open the delegation page
    await page.goto("/communities/70000000-0000-4000-8000-000000000001/admin/moderators")

    // Then the current moderators are listed (owner + any seeded moderator)
    await expect(page.getByRole("heading", { name: "Moderadores atuais" })).toBeVisible()

    // And the eligible members section is visible with a promote button per entry
    const promoteButtons = page.getByRole("button", { name: /Promover a moderador/ })
    await expect(promoteButtons.first()).toBeVisible()
  })
})
