// Onda F Task 8 — complete the group administrator cycle.
//
// Committed without running per README "E2E precisa do dono". The original
// group ids (40000000-...) are the seed's DEPENDENTS uuid range, not groups
// (60000000-...) — realigned against real seed.sql groups. Group owners in
// the real seed are the 30000000-... members (membro-<i>@bivaque.example.
// invalid, password bivaque-e2e-local for all 300), not the default
// seedSession() account — found running the E2E realignment.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { encodeAuthCookieValue, readEnvLocal, seedSession } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"

// Group 1 "Caminhada no Mindu" is owned by membro-1 (30000000-...-0001).
const GROUP_OWNER_EMAIL = "membro-1@bivaque.example.invalid"
const GROUP_ID = "60000000-0000-4000-8000-000000000001"
const GROUP_NAME = "Caminhada no Mindu"
// Group 6 "Mães da Cidade" is private, so joining lands as 'pending' —
// used to exercise the real request/cancel flow instead of pre-seeding a
// fake pending row (the seed never inserts non-approved memberships).
const PRIVATE_GROUP_ID = "60000000-0000-4000-8000-000000000006"

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

test.describe("group admin cycle", () => {
  test("the owner sees delete and transfer options", async ({ page }) => {
    // Given a session of the group's actual owner
    await signInAs(page, GROUP_OWNER_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open their own group detail
    await page.goto(`/groups/${GROUP_ID}`)

    // Then the admin actions are visible
    await expect(page.getByRole("button", { name: /Excluir grupo/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Transferir/i })).toBeVisible()
  })

  test("the owner deletes their own group and it disappears", async ({ page }) => {
    // deleteGroupAction used to write is_deleted through the authenticated
    // client directly and always threw — block_soft_delete_groups only
    // allows the toggle from service_role. delete_group (a security definer
    // RPC) is the fix; this asserts the button's actual effect, not just
    // its visibility.
    await signInAs(page, GROUP_OWNER_EMAIL)
    await page.goto(`/groups/${GROUP_ID}`)

    const heading = page.getByRole("heading", { name: GROUP_NAME })
    await expect(heading).toBeVisible()

    await page.getByRole("button", { name: /Excluir grupo/i }).click()

    // Then the group is excluded by RLS (is_deleted = false filter) even
    // for its own owner — the page renders the not-found UI. We assert
    // the UI, not the HTTP status — next 16 notFound() responds 200 per
    // the E2E lesson in the plan README.
    await expect(heading).toHaveCount(0)
  })

  test("a pending member can cancel their request", async ({ page }) => {
    // Given the default seedSession() account, which the seed places in no
    // groups at all — a clean slate to exercise the real request flow.
    await seedSession(page.context())

    // When they request entry to a private group
    await page.goto(`/groups/${PRIVATE_GROUP_ID}`)

    const pedir = page.getByRole("button", { name: "Pedir entrada" })
    const cancelar = page.getByRole("button", { name: "Cancelar pedido" })

    // Wait for the server-rendered membership state before branching. A bare
    // locator.isVisible() does not auto-wait and could miss "Pedir entrada"
    // during the first cold navigation.
    await expect(pedir.or(cancelar)).toBeVisible({ timeout: 15000 })

    // Normalize residue from an interrupted run so every project exercises
    // the same request -> pending -> cancel cycle.
    if (await cancelar.isVisible()) {
      await cancelar.click()
      await expect(pedir).toBeVisible()
    }

    await pedir.click()
    await expect(cancelar).toBeVisible({ timeout: 15000 })

    // Exercise the behavior named by the test and restore the shared seed.
    await cancelar.click()
    await expect(pedir).toBeVisible({ timeout: 15000 })
  })
})
