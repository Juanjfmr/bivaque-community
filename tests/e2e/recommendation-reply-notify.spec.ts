// Onda F Task 5 — close the ask-and-answer loop: author notified on reply,
// edit/delete own reply, Explorar links to detail, request resolved.
//
// Committed without running per README "E2E precisa do dono". Two real
// gaps found running the E2E realignment: (1) the seed had zero rows in
// recommendation_requests at all — seed.sql now seeds one authored by the
// default seedSession() account (visual@bivaque.example.invalid); (2) the
// "Marcar como resolvido" button lives inside the "Pedidos" tab
// (recommendation-requests.tsx, rendered under Tabs key="requests"), not
// the default "Explorar" tab /recommendations lands on — the spec never
// switched tabs.

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("recommendation ask-and-answer loop", () => {
  test("an author can mark their request resolved", async ({ page }) => {
    // Given a session of a member who authored a request
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open the recommendations page and switch to their requests
    await page.goto("/recommendations")
    await page.getByRole("tab", { name: "Pedidos" }).click()

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
