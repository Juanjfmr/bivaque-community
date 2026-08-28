import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { encodeAuthCookieValue } from "./helpers/session"

// DS-029 — WCAG 2.2 AA conformance gate (probe wave 2).
//
// VER-006 documented that six of the ten post-remediation checks are now
// satisfied and three remain not re-run. This spec exercises those three
// plus the additional objective checks that VER-006 also flagged as
// required before DS-029 can move from FAIL-EVIDENCED to PASS-EVIDENCED:
//
//   1. modal focus lifecycle (DS-023 PARTIAL → DS-029 check);
//   2. reflow at 320 CSS-px;
//   3. target-size 24×24 minimum;
//   4. visible focus on non-tablist controls;
//   5. non-color state cues (selected/error/success/disabled);
//   6. prefers-reduced-motion contract (DS-025).
//
// Each describe block corresponds to one Phase 6 "After remediation" check.
// Tests use the seeded `visual@bivaque.example.invalid` account so the
// shell, composer modal, and groups page are all reachable with real
// data. The reduced-motion probe emulates the media feature via
// Playwright; the others read computed styles or geometry.

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
  if (response.status() !== 200) throw new Error(`Password grant failed: ${response.status()}`)
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

test.describe("DS-029 modal focus lifecycle (CreatePostModal)", () => {
  test("opening the composer moves focus into the dialog", async ({ page }) => {
    await signInAs(page, TRANSFERRING_EMAIL)
    await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
    await page.waitForLoadState("networkidle")

    const trigger = page.getByRole("button", { name: "Criar publicação" })
    await expect(trigger).toBeVisible({ timeout: 15000 })
    await trigger.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 10000 })

    const activeIsInsideDialog = await dialog
      .evaluate((el) => el.contains(document.activeElement))
      .catch(() => false)
    expect(activeIsInsideDialog).toBe(true)
  })

  test("Escape closes the modal and focus returns to the trigger", async ({ page }) => {
    await signInAs(page, TRANSFERRING_EMAIL)
    await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
    await page.waitForLoadState("networkidle")

    const trigger = page.getByRole("button", { name: "Criar publicação" })
    await trigger.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible({ timeout: 10000 })

    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden({ timeout: 5000 })

    // A restauração de foco pelo overlay do HeroUI é assíncrona: `toBeHidden()`
    // resolver não garante que o foco já voltou ao gatilho. Um retrato único de
    // document.activeElement amostra um instante arbitrário e falha em corrida —
    // foi o que quebrou a CI no head 51fd42a, num commit que só mexeu em markdown.
    // `toBeFocused()` repete até o timeout, então continua vermelho se o foco
    // realmente não voltar: tolera a espera, não esconde o defeito.
    await expect(trigger).toBeFocused({ timeout: 5000 })
  })
})

test.describe("DS-029 reflow at 320 CSS-px", () => {
  test.use({ viewport: { width: 320, height: 568 } })

  test("/community does not produce horizontal scroll at 320px", async ({ page }) => {
    await signInAs(page, TRANSFERRING_EMAIL)
    await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
    await page.waitForLoadState("networkidle")

    const overflow = await page.evaluate(() => {
      const root = document.documentElement
      return {
        scrollWidth: root.scrollWidth,
        clientWidth: root.clientWidth,
      }
    })
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
  })
})

test.describe("DS-029 target-size 24×24 minimum on representative controls", () => {
  test("interactive controls on /community meet the 24×24 floor", async ({ page }) => {
    await signInAs(page, TRANSFERRING_EMAIL)
    await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
    await page.waitForLoadState("networkidle")

    const sizes = await page.evaluate(() => {
      const targets = Array.from(
        document.querySelectorAll(
          'a[href], button:not([disabled]), [role="button"]:not([aria-disabled="true"]), input, select, textarea',
        ),
      ).filter((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      })
      return targets.slice(0, 30).map((el) => {
        const rect = (el as HTMLElement).getBoundingClientRect()
        return {
          tag: el.tagName.toLowerCase(),
          label:
            el.getAttribute("aria-label") ??
            (el as HTMLElement).textContent?.trim().slice(0, 40) ??
            "",
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        }
      })
    })

    const undersized = sizes.filter((s) => s.width < 24 || s.height < 24)
    expect(undersized).toEqual([])
  })
})

test.describe("DS-029 visible focus on non-tablist controls", () => {
  test("Tab from the shell puts a real focus ring on the next control", async ({ page }) => {
    await signInAs(page, TRANSFERRING_EMAIL)
    await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
    await page.waitForLoadState("networkidle")

    await page.locator("header").first().click()
    await page.keyboard.press("Tab")
    await page.keyboard.press("Tab")

    const focusInfo = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const style = window.getComputedStyle(el)
      return {
        tag: el.tagName.toLowerCase(),
        label: el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 40) ?? "",
        outlineWidth: style.outlineWidth,
        outlineStyle: style.outlineStyle,
        outlineColor: style.outlineColor,
        boxShadow: style.boxShadow,
      }
    })
    expect(focusInfo).not.toBeNull()
    const hasOutline =
      focusInfo &&
      focusInfo.outlineStyle !== "none" &&
      focusInfo.outlineWidth !== "0px" &&
      focusInfo.outlineWidth !== "0"
    const hasRing = focusInfo && focusInfo.boxShadow !== "none" && focusInfo.boxShadow.length > 0
    expect(hasOutline || hasRing).toBe(true)
  })
})

test.describe("DS-029 non-color state cues", () => {
  test("error state carries an icon and text, not color alone", async ({ page }) => {
    await signInAs(page, TRANSFERRING_EMAIL)
    await page.route("**/rest/v1/community_memberships**", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          message: "induced failure",
          code: "PGRST500",
          details: null,
          hint: null,
        }),
      }),
    )
    await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
    await page.waitForLoadState("networkidle")

    const alert = page.getByRole("alert").filter({ hasText: "Algo deu errado" })
    await expect(alert).toBeVisible({ timeout: 10000 })

    const hasIcon = await alert.locator("svg").count()
    expect(hasIcon).toBeGreaterThan(0)
  })
})

test.describe("DS-029 prefers-reduced-motion contract", () => {
  test("emulating prefers-reduced-motion zeroes animation/transition durations", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await signInAs(page, TRANSFERRING_EMAIL)
    await page.goto(`${APP_URL}/community`, { waitUntil: "load" })
    await page.waitForLoadState("networkidle")

    const durations = await page.evaluate(() => {
      const sample = Array.from(document.querySelectorAll("*")).slice(0, 50)
      return sample.map((el) => {
        const s = window.getComputedStyle(el as HTMLElement)
        return {
          ad: s.animationDuration,
          td: s.transitionDuration,
        }
      })
    })

    const nonZero = durations.filter((d) => {
      const ad = d.ad.split(",").map((x) => x.trim())
      const td = d.td.split(",").map((x) => x.trim())
      const isZero = (v: string) => v === "0s" || v === "0ms"
      return !(ad.every(isZero) && td.every(isZero))
    })

    expect(nonZero).toEqual([])
  })
})
