// Onda E Task 7 — other-member profile denials.
//
// Committed without running per README "E2E precisa do dono". The original
// IDs (10000000-...) are the pgTAP fixture convention (supabase/tests/
// fixtures/foundation.inc), which only exists inside a transactional pgTAP
// run — the real dev seed (supabase/seed.sql) never inserts those rows, so
// both tests 404'd unconditionally. Realigned against real seed.sql users:
// the default seedSession() account (visual@bivaque.example.invalid,
// 20000000-...-0001 "Ana Verificada") is in the Manaus locality; "Membro do
// Rio" (20000000-...-0003) is seeded in the second locality (Rio) and
// "Carla Almeida" (30000000-...-0002) is one of the ~300 Manaus members.

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("other-member profile denials", () => {
  test("profile of a member in another locality is not found", async ({ page }) => {
    // Given a session of a member in the Manaus locality
    await seedSession(page.context())

    // When the viewer tries to open the profile of a member in the Rio
    // locality (membro-rio@bivaque.example.invalid)
    await page.goto("/profile/20000000-0000-4000-8000-000000000003")

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

    // When the viewer opens the profile of a member in the same (Manaus)
    // locality
    await page.goto("/profile/30000000-0000-4000-8000-000000000002")

    // Then the profile is rendered with the display name
    await expect(page.getByRole("heading", { name: /Carla Almeida/ })).toBeVisible()
  })
})
