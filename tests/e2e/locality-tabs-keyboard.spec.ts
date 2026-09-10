import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// DS-021 — Native semantics first; canonical compound behavior.
//
// Phase 4 RUN-007 documented that the locality switcher at /localidade
// advertises `role="tab"` semantics but delivers no APG keyboard contract:
// no roving `tabIndex`, no `aria-controls`, no `tabpanel`, and
// ArrowLeft/ArrowRight/Home/End do not move `aria-selected`. The visible
// BottomNav uses a real HeroUI/React Aria Tabs implementation; this spec
// pins the keyboard contract for the locality switcher to match.
//
// The seed carries `membro-transferencia@bivaque.example.invalid` already
// declared as a not-yet-degraded transfer (Rio current, Manaus leaving),
// which is the only state in which the locality switcher renders.
//
// `import.meta.dirname` cannot be used here: Playwright transpiles specs
// to CJS, and the emitted `require` blows up at load time. All paths
// resolve from `process.cwd()`.

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

const TABLIST = '[role="tablist"][aria-label="Cidades"]'
const CURRENT_TAB_NAME = "Rio de Janeiro"
const OUTBOUND_TAB_NAME = /Manaus \(saindo\)/

async function loadLocalidadeTabs(page: Page) {
  await signInAs(page, TRANSFERRING_EMAIL)
  await page.goto(`${APP_URL}/localidade`, { waitUntil: "load" })
  await expect(page.locator(TABLIST)).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole("tab", { name: CURRENT_TAB_NAME, exact: true })).toBeVisible()
  await expect(page.getByRole("tab", { name: OUTBOUND_TAB_NAME })).toBeVisible()
}

test.describe("DS-021 — locality tabs keyboard and ARIA contract (APG)", () => {
  test("active tab has tabindex=0 and aria-selected=true; the others have tabindex=-1 and aria-selected=false", async ({
    page,
  }) => {
    await loadLocalidadeTabs(page)

    const current = page.getByRole("tab", { name: CURRENT_TAB_NAME, exact: true })
    const outbound = page.getByRole("tab", { name: OUTBOUND_TAB_NAME })

    await expect(current).toHaveAttribute("aria-selected", "true")
    await expect(current).toHaveAttribute("tabindex", "0")
    await expect(outbound).toHaveAttribute("aria-selected", "false")
    await expect(outbound).toHaveAttribute("tabindex", "-1")
  })

  test("each tab declares aria-controls pointing to a tabpanel with matching id", async ({
    page,
  }) => {
    await loadLocalidadeTabs(page)

    const current = page.getByRole("tab", { name: CURRENT_TAB_NAME, exact: true })
    const outbound = page.getByRole("tab", { name: OUTBOUND_TAB_NAME })

    const currentId = await current.getAttribute("id")
    const outboundId = await outbound.getAttribute("id")
    expect(currentId).toBeTruthy()
    expect(outboundId).toBeTruthy()
    expect(currentId).not.toEqual(outboundId)

    const currentControls = await current.getAttribute("aria-controls")
    expect(currentControls).toBeTruthy()
    expect(currentControls).not.toEqual(outboundId)

    const currentPanel = page.locator(`[role="tabpanel"]#${currentControls}`)
    await expect(currentPanel).toHaveCount(1)
    await expect(currentPanel).toHaveAttribute("aria-labelledby", currentId ?? "")
  })

  test("ArrowRight moves selection and focus to the next tab and updates aria-selected", async ({
    page,
  }) => {
    await loadLocalidadeTabs(page)

    const current = page.getByRole("tab", { name: CURRENT_TAB_NAME, exact: true })
    const outbound = page.getByRole("tab", { name: OUTBOUND_TAB_NAME })

    await current.focus()
    await expect(current).toBeFocused()
    await page.keyboard.press("ArrowRight")

    await expect(outbound).toBeFocused()
    await expect(outbound).toHaveAttribute("aria-selected", "true")
    await expect(outbound).toHaveAttribute("tabindex", "0")
    await expect(current).toHaveAttribute("aria-selected", "false")
    await expect(current).toHaveAttribute("tabindex", "-1")
  })

  test("ArrowLeft moves selection and focus back to the previous tab", async ({ page }) => {
    await loadLocalidadeTabs(page)

    const current = page.getByRole("tab", { name: CURRENT_TAB_NAME, exact: true })
    const outbound = page.getByRole("tab", { name: OUTBOUND_TAB_NAME })

    await outbound.focus()
    await expect(outbound).toBeFocused()
    await page.keyboard.press("ArrowLeft")

    await expect(current).toBeFocused()
    await expect(current).toHaveAttribute("aria-selected", "true")
    await expect(outbound).toHaveAttribute("aria-selected", "false")
  })

  test("Home moves selection to the first tab", async ({ page }) => {
    await loadLocalidadeTabs(page)

    const current = page.getByRole("tab", { name: CURRENT_TAB_NAME, exact: true })
    const outbound = page.getByRole("tab", { name: OUTBOUND_TAB_NAME })

    await outbound.focus()
    await page.keyboard.press("Home")

    await expect(current).toBeFocused()
    await expect(current).toHaveAttribute("aria-selected", "true")
    await expect(outbound).toHaveAttribute("aria-selected", "false")
  })

  test("End moves selection to the last tab", async ({ page }) => {
    await loadLocalidadeTabs(page)

    const current = page.getByRole("tab", { name: CURRENT_TAB_NAME, exact: true })
    const outbound = page.getByRole("tab", { name: OUTBOUND_TAB_NAME })

    await current.focus()
    await page.keyboard.press("End")

    await expect(outbound).toBeFocused()
    await expect(outbound).toHaveAttribute("aria-selected", "true")
    await expect(current).toHaveAttribute("aria-selected", "false")
  })

  test("keyboard selection swap is reflected in the rendered CityReference", async ({ page }) => {
    await loadLocalidadeTabs(page)

    const current = page.getByRole("tab", { name: CURRENT_TAB_NAME, exact: true })
    const outbound = page.getByRole("tab", { name: OUTBOUND_TAB_NAME })

    await current.focus()
    await expect(page.getByRole("heading", { name: "Rio de Janeiro" })).toBeVisible()

    await page.keyboard.press("ArrowRight")
    await expect(outbound).toBeFocused()
    await expect(page.getByText(/Você está saindo de Manaus em/)).toBeVisible()
    await expect(page.getByRole("heading", { name: "Manaus", exact: true })).toBeVisible()
  })
})
