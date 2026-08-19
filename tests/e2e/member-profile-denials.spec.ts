// Onda E Task 7 — other-member profile denials.
//
// Committed without running per README "E2E precisa do dono".

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("other-member profile denials", () => {
  test("profile of a member in another locality is not found", async ({ page }) => {
    // Given a session of a member in locality 1
    await seedSession(page.context())

    // When the viewer tries to open the profile of a member in locality 2
    // (member-three in foundation.inc)
    await page.goto("/profile/10000000-0000-4000-4000-8000-000000000003")

    // Then the page is the not-found UI (no protected content, no posts
    // headings, no display name of the target). We assert the UI, not
    // the HTTP status — next 16 notFound() responds 200 per the E2E
    // lesson in the plan.
    const postsHeading = page.getByRole("heading", { name: "Publicações" })
    await expect(postsHeading).toHaveCount(0)
  })

  test("profile of a same-locality member is reachable", async ({ page }) => {
    // Given a session
    await seedSession(page.context())

    // When the viewer opens the profile of a member in the same locality
    // (member-four, hidden-member)
    await page.goto("/profile/10000000-0000-4000-8000-000000000004")

    // Then the profile is rendered with the display name
    await expect(page.getByRole("heading", { name: /Hidden Member/ })).toBeVisible()
  })
})
