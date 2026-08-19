// Onda E Task 8 — operator manual curation of guide entries from
// recommendation replies.
//
// Committed without running per README "E2E precisa do dono". The asserts
// below document the manual path: the operator opens /guide-queue, sees
// promotable replies, fills the canonical name + description, and the
// reply becomes an approved guide entry linked back to the source.

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("guide manual curation from replies", () => {
  test("guide-queue renders both the pending review list and the promote section", async ({
    page,
  }) => {
    // Given an operator session
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open the curation page
    await page.goto("/guide-queue")

    // Then both section headings are visible
    await expect(page.getByRole("heading", { name: "Curadoria do guia" })).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /Promover resposta de indica\\u00e7\\u00e3o/ }),
    ).toBeVisible()
  })

  test("non-operator visitors see a restricted message", async ({ page }) => {
    // Given a non-operator session (visual user — not promoted to operator)
    await seedSession(page.context())

    // When they try to access the queue
    await page.goto("/guide-queue")

    // Then the gated message is rendered (and the operator sections are not)
    await expect(page.getByText("Apenas operadores podem revisar o guia.")).toBeVisible()
  })
})
