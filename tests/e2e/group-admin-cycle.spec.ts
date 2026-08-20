// Onda F Task 8 — complete the group administrator cycle.
//
// Committed without running per README "E2E precisa do dono".

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("group admin cycle", () => {
  test("the owner sees delete and transfer options", async ({ page }) => {
    // Given a session of a group owner
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open their own group detail
    await page.goto("/groups/40000000-0000-4000-8000-000000000001")

    // Then the admin actions are visible
    await expect(page.getByRole("button", { name: /Excluir grupo/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Transferir/i })).toBeVisible()
  })

  test("a pending member can cancel their request", async ({ page }) => {
    // Given a session of a member with a pending request
    await seedSession(page.context())
    await page.goto("/groups/40000000-0000-4000-8000-000000000002")

    // Then the cancel button is visible
    await expect(page.getByRole("button", { name: /Cancelar pedido/i })).toBeVisible()
  })
})
