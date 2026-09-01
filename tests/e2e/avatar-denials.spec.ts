import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// Avatar endpoint authorisation (wave A, task 2): the route lets the profiles
// RLS policy answer who may see whom, so the negative cases assert the STATUS
// only — a 404 must never become a 403, which would confirm the account
// exists. Seed identities are public and disposable by design (supabase/seed.sql):
// membro-4 is a Manaus member with a profile; rejected@ has a session but no
// locality membership and no profile.

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const MEMBER_4_ID = "30000000-0000-4000-8000-000000000004"
const OUTSIDER_EMAIL = "rejected@bivaque.example.invalid"
const CONSENT_COOKIE = "bivaque-consent-version"

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

// Mints a session with the password grant and installs the cookie pair the
// callback route would have written — same flow as tests/e2e/helpers/session.ts,
// parametrised by account so the spec can sign in as more than one seed user.
async function signInAs(page: Page, email: string): Promise<void> {
  const { anonKey, password } = requireCredentials()

  const api = await page.context().request
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

test.describe("avatar endpoint: authorisation by RLS, status only", () => {
  test("unauthenticated request is denied with 401", async ({ page }) => {
    const response = await page.request.get(`/api/avatar/${MEMBER_4_ID}`)
    expect(response.status()).toBe(401)
  })

  test("authenticated outsider gets 404 — never 403, which would confirm the id exists", async ({
    page,
  }) => {
    await signInAs(page, OUTSIDER_EMAIL)
    const response = await page.request.get(`/api/avatar/${MEMBER_4_ID}`)
    expect(response.status()).toBe(404)
  })
})
