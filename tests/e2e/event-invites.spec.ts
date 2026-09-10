// Onda F Task 3 — organizer event invitation fan-out.
//
// Committed without running per README "E2E precisa do dono". The original
// event id (60000000-...-0010) is out of range for both the seed's groups
// (60000000-...-0001 through 0008) and its 10 events (70000000-...) —
// realigned against a real seed.sql event, signed in as its actual
// organizer (the default seedSession() account organizes nothing in the
// seed) — found running the E2E realignment.
//
// Realigned once more: the invite fan-out section (apps/web/(shell)/events/
// [id]/page.tsx) only renders when the event is not cancelled AND not
// completed; the seed marks events 1..4 as `completed` and 5..10 as
// `upcoming`. Event 1 with organizer membro-2 was unusable from this
// surface; event 5 ("Piquenique das famílias", organized by membro-6 per
// the cycle `30000000-...-(1 + (i % 12))`) is upcoming and exercises the
// invite section. event-rsvp keeps the previous event id because the
// three-state RSVP UI does NOT gate on `isCompleted` — it only gates on
// `isCancelled`.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"

// "Piquenique das famílias" — upcoming (i=5 of seed.sql events); organized by
// membro-6 (30000000-...-(1 + (5 % 12)) = 30000000-...-0006).
const EVENT_ID = "70000000-0000-4000-8000-000000000005"
const ORGANIZER_EMAIL = "membro-6@bivaque.example.invalid"

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

test.describe("event invitation fan-out", () => {
  test("the organizer sees the invite section with eligible members", async ({ page }) => {
    // Given a session of the event's real organizer
    await signInAs(page, ORGANIZER_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open an event they organize
    await page.goto(`/events/${EVENT_ID}`)

    // Then the invite fan-out section is visible
    await expect(page.getByRole("heading", { name: /Convidar para este evento/ })).toBeVisible()
  })

  test("the invite section does NOT expose a people search field", async ({ page }) => {
    // Given a session of the event's real organizer
    await signInAs(page, ORGANIZER_EMAIL)
    await page.goto(`/events/${EVENT_ID}`)

    // Then there is no search box (D43 forbids people search in the pilot)
    const search = page.locator('input[type="search"]')
    await expect(search).toHaveCount(0)
  })
})
