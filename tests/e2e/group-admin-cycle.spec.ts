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

  test("the owner deletes their own group and it disappears", async ({ page }) => {
    // deleteGroupAction used to write is_deleted through the authenticated
    // client directly and always threw — block_soft_delete_groups only
    // allows the toggle from service_role. delete_group (a security definer
    // RPC) is the fix; this asserts the button's actual effect, not just
    // its visibility.
    await seedSession(page.context())
    await page.goto("/groups/40000000-0000-4000-8000-000000000001")

    const heading = page.getByRole("heading", { name: "Grupo de Corrida" })
    await expect(heading).toBeVisible()

    await page.getByRole("button", { name: /Excluir grupo/i }).click()

    // Then the group is excluded by RLS (is_deleted = false filter) even
    // for its own owner — the page renders the not-found UI. We assert
    // the UI, not the HTTP status — next 16 notFound() responds 200 per
    // the E2E lesson in the plan README.
    await expect(heading).toHaveCount(0)
  })

  test("a pending member can cancel their request", async ({ page }) => {
    // Given a session of a member with a pending request
    await seedSession(page.context())
    await page.goto("/groups/40000000-0000-4000-8000-000000000002")

    // Then the cancel button is visible
    await expect(page.getByRole("button", { name: /Cancelar pedido/i })).toBeVisible()
  })
})
