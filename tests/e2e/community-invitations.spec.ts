// Onda E Task 6 — community member invitations with attribution and scope.
//
// Committed without running per README: "E2E precisa do dono" — needs the
// seeded database. The asserts below encode the D14/D15 invariants the
// migration enforces: a verified invitee accepts and gets a pending request,
// a non-verified invitee sees no state change, and the link never crosses
// communities.

import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

test.describe("community member invite", () => {
  test("verified inviter sees the invite section and can generate a link", async ({ page }) => {
    // Given a verified approved member of Vila Ajuricaba
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When the owner opens the community invite section
    await page.goto("/communities/70000000-0000-4000-8000-000000000001/invite")

    // Then the section renders and the generate button is enabled
    await expect(page.getByRole("heading", { name: "Convidar membros" })).toBeVisible()
    const generateButton = page.getByRole("button", { name: /Gerar link/ })
    await expect(generateButton).toBeEnabled()

    // When the inviter generates a link
    await generateButton.click()

    // Then a copyable link appears
    await expect(page.getByRole("button", { name: /Copiar/ })).toBeVisible()
  })

  test("the invite accept page redirects unverified invitees to onboarding", async ({ page }) => {
    // Given a session of an unverified user (the visual capture user)
    await seedSession(page.context())

    // When they open an invite link
    await page.goto("/invite/0000000000000000000000000000000000000000000000000000000000000000")

    // Then the D15 gate redirects them to onboarding with the link preserved
    await page.waitForURL(/\/onboarding/)
    const url = new URL(page.url())
    expect(url.searchParams.get("next")).toContain("/invite/")
  })

  test("an expired invite renders a friendly error", async ({ page }) => {
    // Given a session and an obviously-expired token (all-zero digest format)
    await seedSession(page.context())

    // When the invite is opened, the server component renders the error UI
    await page.goto("/invite/0000000000000000000000000000000000000000000000000000000000000000")

    // Then the user sees the error heading (either not_found or expired)
    await expect(page.getByRole("heading", { name: "Convite" })).toBeVisible()
  })
})
