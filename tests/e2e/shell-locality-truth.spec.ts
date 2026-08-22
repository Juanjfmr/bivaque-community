import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { encodeAuthCookieValue } from "./helpers/session"

// DS-010 — Material scope is inspectable and real.
//
// Phase 4 RUN-005/016 records that Rio-current accounts see the literal
// `Manaus, AM` in the shell header even though their `locality_memberships`
// row has `kind = 'current'` pointing at Rio. The seed creates
// `membro-transferencia@bivaque.example.invalid` with both a Rio (current)
// and a Manaus (outbound, leaving) membership, which is the canonical
// reproduction of the bug. The fix should resolve the locality from real
// membership state — not from a hardcoded literal in the JSX.
//
// `import.meta.dirname` cannot be used here: Playwright transpiles specs
// to CJS, and the emitted `require` blows up at load time. All paths
// resolve from `process.cwd()`.

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"

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

async function loadShell(page: Page) {
  await signInAs(page, TRANSFERRING_EMAIL)
  await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
  await expect(page.locator("header").first()).toBeVisible({ timeout: 15000 })
}

test.describe("DS-010 — shell header reflects real current locality, not pilot literal", () => {
  test("Rio transfer account sees 'Rio de Janeiro' in the shell locality pill, not 'Manaus, AM'", async ({
    page,
  }) => {
    await loadShell(page)

    // The header pill — when the fix lands — exposes a stable test id; before
    // the fix lands we still assert by content. The locality text lives inside
    // the first <header> of the document, next to a MapPin icon.
    const header = page.locator("header").first()
    const headerText = (await header.textContent()) ?? ""

    // The transfer account's current locality is Rio. The shell must surface
    // that, not the historical Manaus literal.
    expect(headerText).toMatch(/Rio de Janeiro/)
    expect(headerText).not.toMatch(/Manaus, AM/)
  })

  test("Rio transfer account sees 'Rio de Janeiro' in the sidebar locality footer, not 'Manaus, AM'", async ({
    page,
  }) => {
    await loadShell(page)

    await page.setViewportSize({ width: 1440, height: 900 })
    const sidebar = page.locator('aside:has(nav[aria-label="Navegação principal"])')
    await expect(sidebar).toBeVisible({ timeout: 15000 })
    await page.waitForTimeout(500)

    const asideText = (await sidebar.textContent()) ?? ""

    expect(asideText).toMatch(/Rio de Janeiro/)
    expect(asideText).not.toMatch(/Manaus, AM/)
  })

  test("profile header also reflects the Rio current locality (no Manaus fallback)", async ({
    page,
  }) => {
    await loadShell(page)

    await page.goto(`${APP_URL}/profile`, { waitUntil: "load" })
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(500)

    const profileText = (await page.locator("main").textContent()) ?? ""

    expect(profileText).toMatch(/Rio de Janeiro/)
    expect(profileText).not.toMatch(/Manaus, AM/)
  })
})
