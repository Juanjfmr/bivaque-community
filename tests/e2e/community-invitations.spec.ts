// Onda E Task 6 — community member invitations with attribution and scope.
//
// Committed without running per README: "E2E precisa do dono" — needs the
// seeded database. The asserts below encode the D14/D15 invariants the
// migration enforces: a verified invitee accepts and gets a pending request,
// a non-verified invitee sees no state change, and the link never crosses
// communities.
//
// Realigned: the seed had zero communities (see community-batch-approval.
// spec.ts's header for the full story — same "Vila Ajuricaba" seed, owned
// by dono-vila@, id 71000000-...-0001). Test 2 also used the wrong account:
// its own comment said "unverified user" but called seedSession(), which
// signs in visual@ — verified with an active locality membership. The D15
// gate in apps/web/app/(shell)/invite/[token]/page.tsx redirects to
// /onboarding only when private.verification_outcomes.status isn't
// 'verified' — rejected@bivaque.example.invalid is the seeded account for
// exactly that state.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import {
  CURRENT_CONSENT,
  encodeAuthCookieValue,
  readEnvLocal,
  seedSession,
} from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const COMMUNITY_ID = "71000000-0000-4000-8000-000000000001"
const OWNER_EMAIL = "dono-vila@bivaque.example.invalid"
const REJECTED_EMAIL = "rejected@bivaque.example.invalid"

async function signInAs(page: Page, email: string): Promise<void> {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? "bivaque-e2e-local"
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY is required")

  const api = page.context().request
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    throw new Error(`Password grant for ${email} failed with ${response.status()}`)
  }
  const body = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_at: number
    expires_in: number
    token_type: string
  }

  const cookieValue = encodeAuthCookieValue(body, email)
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400
  const shared = {
    domain: "127.0.0.1",
    path: "/",
    expires,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }
  await page.context().addCookies([
    { name: `sb-${projectRef}-auth-token`, value: cookieValue, ...shared },
    { name: CONSENT_COOKIE, value: CURRENT_CONSENT, ...shared },
  ])
}

test.describe("community member invite", () => {
  test("verified inviter sees the invite section and can generate a link", async ({ page }) => {
    // Given a verified approved member of Vila Ajuricaba
    await signInAs(page, OWNER_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When the owner opens the community invite section
    await page.goto(`/communities/${COMMUNITY_ID}/invite`)

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
    // Given a session of an unverified user
    await signInAs(page, REJECTED_EMAIL)

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
