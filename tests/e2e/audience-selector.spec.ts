// Onda E Task 4 — composer shows reach before submit, defaults to the vila,
// and the city-reach post is rendered with a chip in the feed.
//
// Committed without running per README "E2E precisa do dono".

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import {
  CURRENT_CONSENT,
  encodeAuthCookieValue,
  readEnvLocal,
  seedSession,
} from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
// Vila Ajuricaba's owner (see community-batch-approval.spec.ts's header for
// the full seed story). O feed da cidade (Início) rende para qualquer membro da
// localidade — o chip de alcance não depende de ter comunidade. Desde o lote 5
// N2 a Comunidade não tem mais feed: o cartão com o chip é o do Início.
const VILA_OWNER_EMAIL = "dono-vila@bivaque.example.invalid"

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

test.describe("audience selector and reach chip", () => {
  test("the audience notice describes who will read", async ({ page }) => {
    // Given an authenticated session with a seeded approved community
    await seedSession(page.context())
    await page.setViewportSize({ width: 1280, height: 800 })

    // When the composer opens
    await page.goto("/community")
    await page
      .getByRole("button", { name: /Publicar/ })
      .first()
      .click()

    // Then the audience section renders with a notice
    await expect(page.getByText(/vão ler/i).first()).toBeVisible()
  })

  test("city-reach post carries a chip with the locality name in the feed", async ({ page }) => {
    // Given a session of a member who belongs to a community, whose
    // locality has at least one city-reach post (the dev seed sets this up)
    await signInAs(page, VILA_OWNER_EMAIL)

    // When the member opens the home feed — desde o lote 5 N2 o feed da cidade
    // mora no Início, não na Comunidade.
    await page.goto("/inicio")

    // Then a city-reach chip is visible on the city-wide post. The chip
    // (feed-post-card) is a static HeroUI Chip, not an interactive
    // control — it carries no button role, so a byRole("button") locator
    // never matched even though the chip renders.
    await expect(page.locator("#secao-cidade article").first()).toBeVisible({ timeout: 20000 })
    const chip = page
      .locator("#secao-cidade")
      .getByText(/inteira$/i)
      .first()
    await expect(chip).toBeVisible()
  })
})
