import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// Onda T Task 4 — o seletor de localidade.
//
// The seed carries `membro-transferencia@bivaque.example.invalid` already
// declared: Manaus (origin, kind='leaving', still active) and the seeded
// Rio (destination, kind='current') — see supabase/seed.sql. Declaring
// through the seed, rather than calling declare_locality_transfer from the
// spec, keeps this test from mutating the shared `visual@` account that
// other specs assume is a simple, single-locality member.
//
// `import.meta.dirname` cannot be used here: Playwright transpiles specs to
// CJS, and the emitted `require` blows up at load time. All paths resolve
// from `process.cwd()`, which Playwright always sets to the repo root.

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"

const TRANSFERRING_EMAIL =
  process.env["BIVAQUE_E2E_TRANSFERRING_EMAIL"] ?? "membro-transferencia@bivaque.example.invalid"

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

test.describe("locality switcher: declared transfer surfaces both cities", () => {
  test("both cities appear, and switching changes the rendered reference", async ({ page }) => {
    // Given a member with a declared, not-yet-degraded transfer
    await signInAs(page, TRANSFERRING_EMAIL)

    // When they open the "cidade" container
    await page.goto(`${APP_URL}/localidade`, { waitUntil: "load" })

    // Then both cities are offered as tabs
    const currentTab = page.getByRole("tab", { name: "Rio de Janeiro", exact: true })
    const originTab = page.getByRole("tab", { name: /Manaus \(saindo\)/ })
    await expect(currentTab).toBeVisible({ timeout: 15000 })
    await expect(originTab).toBeVisible()

    // And the destination reference renders by default
    await expect(page.getByRole("heading", { name: "Rio de Janeiro" })).toBeVisible()

    // When they switch to the origin
    await originTab.click()

    // Then the origin identifies itself before any attempt to publish
    await expect(page.getByText(/Você está saindo de Manaus em/)).toBeVisible()

    // And the feed changes to the origin's reference
    await expect(page.getByRole("heading", { name: "Manaus", exact: true })).toBeVisible()
  })
})
