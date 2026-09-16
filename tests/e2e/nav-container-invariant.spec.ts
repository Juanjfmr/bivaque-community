import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// DS-011 — Conceptual parent is responsive-invariant.
//
// Rotas secundárias pertencem a um dos quatro containers primários e DEVEM
// acender o mesmo container no BottomNav e na sidebar. A resolução vive em
// resolveNavContainer(), compartilhada pelas duas superfícies.

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
const GUIDE_ENTRY = "/guide/a0000000-0000-4000-8000-000000000001"

const SECONDARY_ROUTES = [
  { path: "/messages", container: "Perfil" },
  { path: "/notifications", container: "Perfil" },
  { path: "/configuracoes", container: "Perfil" },
  { path: GUIDE_ENTRY, container: "Explorar" },
] as const

test.describe("DS-011 mobile — secondary routes activate their conceptual container", () => {
  test.use({ viewport: { width: 375, height: 812 } })

  for (const { path, container } of SECONDARY_ROUTES) {
    test(`${path} activates '${container}' in BottomNav`, async ({ page }) => {
      await signInAndVisit(page, path)
      const tablist = page.locator(BOTTOM_NAV)
      await expect(tablist).toBeVisible({ timeout: 15000 })

      const active = page.getByRole("tab", { name: container, exact: true })
      await expect(active).toHaveAttribute("aria-selected", "true")
    })
  }
})

test.describe("DS-011 desktop — sidebar matches the same conceptual container", () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  for (const { path, container } of SECONDARY_ROUTES) {
    test(`${path} activates '${container}' in the sidebar`, async ({ page }) => {
      await signInAndVisit(page, path)
      const sidebarNav = page.locator(SIDEBAR_NAV)
      await expect(sidebarNav).toBeVisible({ timeout: 15000 })

      const active = sidebarNav.getByRole("link", { name: new RegExp(container) })
      await expect(active).toHaveAttribute("aria-current", "page")
    })
  }
})
