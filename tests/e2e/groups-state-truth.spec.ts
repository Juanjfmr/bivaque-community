import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// DS-014 / DS-015 / DS-016 / DS-027 — /groups state-truthfulness and safe
// error copy.
//
// RUN-008 (Phase 4 source evidence, not re-validated): `loadData` in
// `groups/page.tsx` destructures `data` only from the groups and
// `group_memberships` queries and coerces null data to `[]`. A failed query
// whose data is null therefore renders as a legitimate-looking empty list.
//
// RUN-009 (same source-only evidence): action handlers throw
// `new Error(rpcError.message)` and the catch sets `setError(err.message)`,
// pushing the raw Supabase/Postgres string into the shared `ErrorState`
// description. The `ErrorState` component documents this as forbidden; the
// runtime path violates it.
//
// Both defects are reproduced here by inducing a real network-level
// Supabase failure with `page.route()`. The pre-fix code is expected to
// fail these tests; the post-fix code is expected to pass.

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const VISUAL_EMAIL = process.env["BIVAQUE_E2E_VISUAL_EMAIL"] ?? "visual@bivaque.example.invalid"

function readEnvLocal(key: string): string | undefined {
  try {
    const file = readFileSync(join(process.cwd(), "apps", "web", ".env.local"), "utf-8")
    for (const line of file.split("\n")) {
      const trimmed = line.trim()
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      if (trimmed.slice(0, eq).trim() !== key) continue
      return trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    }
  } catch {
    return undefined
  }
  return undefined
}

function requireCredentials(): { anonKey: string; password: string } {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!anonKey) {
    throw new Error(
      "SUPABASE_ANON_KEY is required. Set it in the environment or as NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.",
    )
  }
  if (!password) {
    throw new Error(
      "USER_PASSWORD is required. Set it in the environment or as BIVAQUE_VISUAL_PASSWORD in apps/web/.env.local.",
    )
  }
  return { anonKey, password }
}

async function signInAs(page: Page, email: string): Promise<void> {
  const { anonKey, password } = requireCredentials()
  const api = page.context().request
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    throw new Error(
      `Password grant for ${email} failed with ${response.status()}. Is the local Supabase stack running and seeded?`,
    )
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

async function loadGroupsPage(page: Page) {
  await signInAs(page, VISUAL_EMAIL)
  await page.goto(`${APP_URL}/groups`, { waitUntil: "load" })
  await page.waitForLoadState("networkidle")
}

const FAKE_SUPABASE_500 = {
  status: 500,
  contentType: "application/json",
  body: JSON.stringify({
    message: "connection refused to 10.0.0.42:5432",
    code: "PGRST500",
    details: null,
    hint: null,
  }),
}

const FAKE_DUPLICATE_KEY = {
  status: 400,
  contentType: "application/json",
  body: JSON.stringify({
    message: 'duplicate key value violates unique constraint "groups_name_locality_id_key"',
    code: "23505",
    details: "Key (name, locality_id)=(Test group, ...) already exists.",
    hint: null,
  }),
}

test.describe("DS-014/015 — /groups query failure is NOT a false empty", () => {
  test("induced groups query failure renders ErrorState, not the empty state", async ({ page }) => {
    await page.route("**/rest/v1/groups**", (route) => route.fulfill(FAKE_SUPABASE_500))

    await loadGroupsPage(page)

    await expect(page.getByRole("alert").filter({ hasText: "Algo deu errado" })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByRole("button", { name: "Tentar novamente" })).toBeVisible()
  })

  test("induced group_memberships query failure also renders ErrorState", async ({ page }) => {
    await page.route("**/rest/v1/group_memberships**", (route) => route.fulfill(FAKE_SUPABASE_500))

    await loadGroupsPage(page)

    await expect(page.getByRole("alert").filter({ hasText: "Algo deu errado" })).toBeVisible({
      timeout: 10000,
    })
  })
})

test.describe("DS-016/027 — /groups action failure shows user-safe copy, not raw Supabase", () => {
  test("induced create_group RPC failure shows safe copy without raw constraint text", async ({
    page,
  }) => {
    await loadGroupsPage(page)

    await page.route("**/rest/v1/rpc/create_group**", (route) => route.fulfill(FAKE_DUPLICATE_KEY))

    await page.getByRole("button", { name: "Criar grupo" }).first().click()
    await page.getByRole("textbox", { name: "Nome do grupo" }).fill("Test group")
    await page.getByRole("button", { name: "Criar", exact: true }).click()

    const alert = page.getByRole("alert").filter({ hasText: "Algo deu errado" })
    await expect(alert).toBeVisible({ timeout: 10000 })

    const text = (await alert.textContent()) ?? ""
    expect(text).not.toMatch(/PGRST/)
    expect(text).not.toMatch(/duplicate key/)
    expect(text).not.toMatch(/violates unique constraint/)
    expect(text).not.toMatch(/groups_name_locality_id_key/)
    expect(text).not.toMatch(/23505/)
  })
})
