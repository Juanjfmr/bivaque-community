// O compositor informa o alcance; o feed do grupo mostra a publicação.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { TEST_GROUP_FEED_URL } from "./helpers/composer"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
// Membro verificado de Manaus, aprovado num grupo no seed: é quem tem destino
// para escolher no compositor.
const MEMBER_EMAIL = "membro-1@bivaque.example.invalid"

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

test.describe("audience selector and group feed", () => {
  test("group feed shows a post without a city-reach chip", async ({ page }) => {
    // Given a member of Manaus (any verified member reads a public group)
    await signInAs(page, MEMBER_EMAIL)

    // When the member opens the group feed — é o único feed de publicação que
    // existe desde o lote 5 N2
    await page.goto(TEST_GROUP_FEED_URL, { waitUntil: "load" })

    // O cartão do app não mostra chip de alcance no feed do grupo.
    await expect(page.locator('article[data-cartao="publicacao"]').first()).toBeVisible({
      timeout: 20000,
    })
    await expect(page.locator('[aria-label$="inteira"]')).toHaveCount(0)
  })
})
