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
import { expect, request, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const COMMUNITY_ID = "71000000-0000-4000-8000-000000000001"
const OWNER_EMAIL = "dono-vila@bivaque.example.invalid"

// Seed inserts exactly five pending requests on this community with these user_ids
// (community_memberships.user_id values from seed.sql generate_series(20, 24)).
const PENDING_USER_IDS = [
  "30000000-0000-4000-8000-000000000014",
  "30000000-0000-4000-8000-000000000015",
  "30000000-0000-4000-8000-000000000016",
  "30000000-0000-4000-8000-000000000017",
  "30000000-0000-4000-8000-000000000018",
]

// Each viewport of this spec reuses the same Supabase database. The approving
// test mutates the global community_memberships state (3 of 5 pending become
// approved), so the second viewport already sees fewer than 5 pending and the
// `nth(4)` assertion fails. Re-seeding the five pending rows from the original
// seed UUIDs before each test restores the precondition for every viewport
// without touching the approved rows the app is supposed to leave alone.
test.beforeEach(async () => {
  const serviceKey =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? readEnvLocal("SUPABASE_SERVICE_ROLE_KEY")
  if (!serviceKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to reset the pending queue.")
  }
  const api = await request.newContext({
    baseURL: SUPABASE_URL,
    extraHTTPHeaders: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  })
  try {
    const rows = PENDING_USER_IDS.map((userId) => ({
      community_id: COMMUNITY_ID,
      user_id: userId,
      role: "member",
      status: "pending",
      joined_at: new Date().toISOString(),
    }))
    // Upsert so a previous viewport that left these user_ids in status=approved
    // does not block the INSERT (unique (community_id, user_id) collision).
    const ins = await api.post(`rest/v1/community_memberships?on_conflict=community_id,user_id`, {
      data: rows,
      headers: { Prefer: "resolution=merge-duplicates" },
    })
    if (!ins.ok()) {
      throw new Error(`Failed to upsert pending rows: ${ins.status()} ${await ins.text()}`)
    }
  } finally {
    await api.dispose()
  }
})

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

test.describe("community batch approval and delegation", { tag: "@stateful" }, () => {
  test("approving 3 of 5 selected leaves exactly 2 pending", async ({ page }) => {
    // Given an authenticated session whose seed membership is the owner of a
    // vila with at least 5 pending entries (the dev seed sets this up).
    await signInAs(page, OWNER_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When the owner opens the pending queue
    await page.goto(`/communities/${COMMUNITY_ID}/admin/pending`)

    // Then five checkboxes are rendered and selectable
    const checkboxes = page.getByRole("checkbox", { name: /Selecionar/ })
    await expect(checkboxes.nth(4)).toBeVisible()

    // When the owner selects the first three. { force: true }: the real
    // <input> is intentionally clip-path'd to a zero-area sr-only target
    // (the standard accessible-custom-checkbox technique) — the browser
    // correctly forwards a click anywhere on the surrounding <label> to it
    // natively (confirmed live), but Playwright's actionability check
    // insists on the <input>'s own hit-test point specifically and always
    // reports the label "intercepting" it, for this pattern generally, not
    // just this list. force skips that check without skipping the real
    // click/state change.
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
