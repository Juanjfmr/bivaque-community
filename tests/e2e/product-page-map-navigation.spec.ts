import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { encodeAuthCookieValue } from "./helpers/session"

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const MEMBER_EMAIL = process.env["BIVAQUE_VISUAL_EMAIL"] ?? "visual@bivaque.example.invalid"
const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"

function readEnvLocal(key: string): string | undefined {
  try {
    const file = readFileSync(join(process.cwd(), "apps", "web", ".env.local"), "utf8")
    for (const line of file.split("\n")) {
      const trimmed = line.trim()
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue
      const separator = trimmed.indexOf("=")
      if (separator === -1) continue
      if (trimmed.slice(0, separator).trim() !== key) continue
      return trimmed
        .slice(separator + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    }
  } catch {
    return undefined
  }
  return undefined
}

function credentials(): { anonKey: string; password: string } {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!anonKey) throw new Error("SUPABASE_ANON_KEY required")
  if (!password) throw new Error("USER_PASSWORD required")
  return { anonKey, password }
}

async function signInAsSeededMember(page: Page): Promise<void> {
  const { anonKey, password } = credentials()
  const response = await page
    .context()
    .request.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      headers: { apikey: anonKey, "Content-Type": "application/json" },
      data: { email: MEMBER_EMAIL, password },
    })

  if (response.status() !== 200) {
    throw new Error(`Password grant failed: ${response.status()}`)
  }

  const body = (await response.json()) as {
    access_token: string
    refresh_token: string
    expires_at: number
    expires_in: number
    token_type: string
  }
  const cookieValue = encodeAuthCookieValue(body, MEMBER_EMAIL)
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]
  const shared = {
    domain: "127.0.0.1",
    path: "/",
    expires: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400,
    httpOnly: false,
    secure: false,
    sameSite: "Lax" as const,
  }

  await page.context().addCookies([
    { name: `sb-${projectRef}-auth-token`, value: cookieValue, ...shared },
    { name: CONSENT_COOKIE, value: CURRENT_CONSENT, ...shared },
  ])
}

type Destination = {
  id: string
  href: string
  surface: "primary" | "header"
}

const MEMBER_SHELL_DESTINATIONS: Destination[] = [
  { id: "LOC-01", href: "/localidade", surface: "primary" },
  { id: "COM-01", href: "/community", surface: "primary" },
  { id: "GRP-01", href: "/groups", surface: "primary" },
  { id: "ME-01", href: "/profile", surface: "primary" },
  { id: "REC-01", href: "/recommendations", surface: "header" },
  { id: "NOT-01", href: "/notifications", surface: "header" },
]

function shellDestination(page: Page, destination: Destination) {
  if (destination.surface === "header") {
    return page.locator("header").first().locator(`a[href="${destination.href}"]`).first()
  }

  return page
    .locator('nav[aria-label="Navegação principal"]:visible')
    .locator(`[href="${destination.href}"]`)
    .first()
}

test.describe("product page map — member shell navigation", () => {
  test("every registered safe shell exit reaches its declared route", async ({ page }) => {
    await signInAsSeededMember(page)

    for (const destination of MEMBER_SHELL_DESTINATIONS) {
      await test.step(`${destination.id} -> ${destination.href}`, async () => {
        const start = destination.href === "/community" ? "/localidade" : "/community"
        await page.goto(`${APP_URL}${start}`, { waitUntil: "load" })

        const control = shellDestination(page, destination)
        await expect(control).toBeVisible({ timeout: 15000 })

        await control.click()
        await page.waitForURL((url) => url.pathname === destination.href, { timeout: 15000 })
        expect(new URL(page.url()).pathname).toBe(destination.href)
      })
    }
  })
})
