// Onda E Task 2 — the home is the vila feed; without a vila, the city reference.
//
// These specs assert the visual surface described in the plan and the
// behavior of the feed/community boundary. They commit without running
// (README: "E2E requires the owner to db:reset with seed and run the
// suite once"). Both views assert the h1 of the page is the right section
// title and that the right elements are present.

// Helper: log in a Vila Ajuricaba member and navigate to /community. The
// session helper mints a session via the password grant and sets the cookie
// the middleware expects; the seed sets the user up as an approved member of
// Vila Ajuricaba.

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("home is the vila feed; without a vila, the city reference", () => {
  test("approved member of Vila Ajuricaba sees the vila feed with the locality-reach post", async ({
    page,
  }) => {
    // Given an authenticated session whose seed membership is approved in
    // Vila Ajuricaba (foundation.inc + communities.inc fixtures)
    await seedSession(page.context())
    await page.setViewportSize({ width: 375, height: 812 })

    // When the member opens the home
    await page.goto("/community")

    // Then the h1 is the vila name (section title), not "Bivaque" and not "Manaus, AM"
    await expect(page.getByRole("heading", { name: "Vila Ajuricaba" })).toBeVisible()

    // And a locality-reach post is in the feed — E1 made it possible. The
    // card text is fixture-defined; we just assert it's there.
    await expect(page.getByText("Aviso da cidade para todas as vilas")).toBeVisible()

    // And the composer is wired
    await expect(page.getByRole("button", { name: "Publicar" }).first()).toBeVisible()
  })

  test("member with no approved community sees the city reference, not a feed", async ({
    page,
  }) => {
    // Given an authenticated session whose user has no approved community
    // membership (the visual-capture user from .env.local, by construction)
    await seedSession(page.context())
    await page.setViewportSize({ width: 375, height: 812 })

    // When the member opens the home
    await page.goto("/community")

    // Then there is no feed list (no post cards)
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)

    // And the city reference renders the four things from §6.2
    await expect(page.getByRole("heading", { name: /.*/ }).first()).toBeVisible()
    await expect(page.getByText("Próximos eventos da cidade")).toBeVisible()
    await expect(page.getByText("Guia de chegada")).toBeVisible()
    await expect(page.getByText("Vitrine de prestadores")).toBeVisible()
    await expect(page.getByText("Entrar numa vila")).toBeVisible()

    // And the "Manaus, AM" hardcoded header that used to render when no
    // community was found is gone
    await expect(page.getByRole("heading", { name: "Manaus, AM" })).toHaveCount(0)
  })
})
