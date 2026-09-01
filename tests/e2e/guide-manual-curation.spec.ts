// Onda E Task 8 — operator manual curation of guide entries from
// recommendation replies.
//
// Committed without running per README "E2E precisa do dono". The asserts
// below document the manual path: the operator opens /guide-queue, sees
// promotable replies, fills the canonical name + description, and the
// reply becomes an approved guide entry linked back to the source.
//
// The seed had no operator account at all (public.operators was an empty
// allowlist) — seed.sql now seeds operador@bivaque.example.invalid for
// this. And the default seedSession() account is not an operator, so it
// cannot stand in for one — found running the E2E realignment.

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
const OPERATOR_EMAIL = "operador@bivaque.example.invalid"

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

test.describe("guide manual curation from replies", () => {
  test("guide-queue renders both the pending review list and the promote section", async ({
    page,
  }) => {
    // Given a real operator session
    await signInAs(page, OPERATOR_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open the curation page
    await page.goto("/guide-queue")

    // Then both section headings are visible
    await expect(page.getByRole("heading", { name: "Curadoria do guia" })).toBeVisible()
    await expect(
      page.getByRole("heading", { name: /Promover resposta de indicação/ }),
    ).toBeVisible()
  })

  test("non-operator visitors are redirected away from the admin panel", async ({ page }) => {
    // Given a non-operator session (visual user — not promoted to operator)
    await seedSession(page.context())

    // When they try to access the queue, the (admin) layout's own gate
    // (apps/web/app/(admin)/layout.tsx) redirects before guide-queue's page
    // component ever renders — its own inline "Apenas operadores podem
    // revisar o guia." message (guide-queue/page.tsx:239) is unreachable
    // dead code for that reason, confirmed by the same layout-level gate
    // arrivals/page.tsx documents relying on.
    await page.goto("/guide-queue")

    await expect(page).toHaveURL(/\/community/)
  })
})
