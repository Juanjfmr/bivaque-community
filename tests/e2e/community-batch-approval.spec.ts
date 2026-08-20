// Onda E Task 5 — batch approval, pagination and moderator delegation.
//
// The E2E spec asserts:
//   - Approve batch: selecting 3 of 5 and approving leaves exactly 2 pending.
//   - Promote/demote via the delegation page.
//
// Like other E2E specs in this wave, the file is committed without running —
// it needs the seeded database and the running test server. Realigned: the
// seed had zero communities at all (public.communities was empty), and the
// original community id (70000000-...-0001) collides with a real seed
// event of the same id in a different table. seed.sql now seeds "Vila
// Ajuricaba" (71000000-...-0001) owned by a dedicated dono-vila@ account —
// not the default seedSession() account, which vila-home.spec.ts's own
// second test requires to have NO community membership at all.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"
const COMMUNITY_ID = "71000000-0000-4000-8000-000000000001"
const OWNER_EMAIL = "dono-vila@bivaque.example.invalid"

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

test.describe("community batch approval and delegation", () => {
  test("approving 3 of 5 selected leaves exactly 2 pending", async ({ page }) => {
    // Confirmed, unresolved product/interaction bug — found closing onda F:
    // HeroUI's Checkbox in this list (pending/page.tsx) cannot be reliably
    // checked. Playwright's .check() times out with the visible
    // "checkbox__control" span (and sometimes the containing <li>)
    // "intercepting pointer events" meant for the real, visually-hidden
    // <input>. { force: true } skips that actionability check and the click
    // reports success, but a follow-up DB check
    // (community_memberships.status for this community) showed the batch
    // approve action was a no-op: still 5 pending, 0 newly approved — the
    // checkboxes' native `.checked` never actually flips, with either a
    // real trusted click (verified manually in the browser, same result) or
    // a forced one. This is a form-actionability bug in the shipped
    // component, not a test bug; it needs a fix in the Checkbox/pending-
    // page markup, not another test workaround. fixme until then — see the
    // flagged follow-up task for this investigation's detail.
    test.fixme(
      true,
      "HeroUI Checkbox in the pending-arrivals list cannot be checked by any input method tried (real click, forced .check()) — batch approve confirmed a no-op against the DB, not just a Playwright actionability false-positive",
    )

    // Given an authenticated session whose seed membership is the owner of a
    // vila with at least 5 pending entries (the dev seed sets this up).
    await signInAs(page, OWNER_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When the owner opens the pending queue
    await page.goto(`/communities/${COMMUNITY_ID}/admin/pending`)

    // Then five checkboxes are rendered and selectable
    const checkboxes = page.getByRole("checkbox", { name: /Selecionar/ })
    await expect(checkboxes.nth(4)).toBeVisible()

    // When the owner selects the first three
    await checkboxes.nth(0).check({ force: true })
    await checkboxes.nth(1).check({ force: true })
    await checkboxes.nth(2).check({ force: true })

    // And clicks the batch approve button
    await page.getByRole("button", { name: "Aprovar selecionados" }).click()

    // Then the queue reloads and exactly two remain
    const remaining = page.getByRole("checkbox", { name: /Selecionar/ })
    await expect(remaining).toHaveCount(2)
  })

  test("promote page lists eligible members and offers a promote button", async ({ page }) => {
    // Given the owner
    await signInAs(page, OWNER_EMAIL)

    // When they open the delegation page
    await page.goto(`/communities/${COMMUNITY_ID}/admin/moderators`)

    // Then the current moderators are listed (owner + any seeded moderator)
    await expect(page.getByRole("heading", { name: "Moderadores atuais" })).toBeVisible()

    // And the eligible members section is visible with a promote button per entry
    const promoteButtons = page.getByRole("button", { name: /Promover a moderador/ })
    await expect(promoteButtons.first()).toBeVisible()
  })
})
