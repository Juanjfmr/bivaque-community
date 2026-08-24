import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { encodeAuthCookieValue } from "./helpers/session"

// DS-011 — Conceptual parent is responsive-invariant.
//
// RUN-004/Phase 4 evidence: at desktop viewports (≥768), `/messages` and
// `/notifications` correctly activate the **Eu** nav item (because per the
// ADR they live inside the "me" container). At mobile (375), the BottomNav
// has no special fallback and falls through to `community` — so the same
// route highlights a different primary destination based purely on
// viewport. The bottom-nav must mirror the sidebar's "me" fallback so the
// active primary container stays the same across viewport changes.

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"
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
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY required")
  if (!password) throw new Error("USER_PASSWORD required")
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

async function signInAndVisit(page: Page, url: string) {
  await signInAs(page, VISUAL_EMAIL)
  await page.goto(`${APP_URL}${url}`, { waitUntil: "load" })
}

const BOTTOM_NAV = '[data-slot="tabs-list"][aria-label="Seções do aplicativo"]'
const SIDEBAR_NAV = 'aside nav[aria-label="Navegação principal"]'

test.describe("DS-011 mobile — BottomNav activates 'Eu' for /messages and /notifications", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test("/messages activates 'Eu', not 'Comunidade'", async ({ page }) => {
    await signInAndVisit(page, "/messages")
    const tablist = page.locator(BOTTOM_NAV)
    await expect(tablist).toBeVisible({ timeout: 15000 })

    const me = page.getByRole("tab", { name: "Eu", exact: true })
    const comunidade = page.getByRole("tab", { name: "Comunidade", exact: true })

    await expect(me).toHaveAttribute("aria-selected", "true")
    await expect(comunidade).toHaveAttribute("aria-selected", "false")
  })

  test("/notifications activates 'Eu', not 'Comunidade'", async ({ page }) => {
    await signInAndVisit(page, "/notifications")
    const tablist = page.locator(BOTTOM_NAV)
    await expect(tablist).toBeVisible({ timeout: 15000 })

    const me = page.getByRole("tab", { name: "Eu", exact: true })
    const comunidade = page.getByRole("tab", { name: "Comunidade", exact: true })

    await expect(me).toHaveAttribute("aria-selected", "true")
    await expect(comunidade).toHaveAttribute("aria-selected", "false")
  })
})

test.describe("DS-011 desktop — sidebar still activates 'Eu' for /messages (no regression)", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test("/messages activates 'Eu' in the sidebar", async ({ page }) => {
    await signInAndVisit(page, "/messages")
    const sidebarNav = page.locator(SIDEBAR_NAV)
    await expect(sidebarNav).toBeVisible({ timeout: 15000 })

    const me = sidebarNav.getByRole("link", { name: /Eu/ })
    await expect(me).toHaveAttribute("aria-current", "page")
  })
})
