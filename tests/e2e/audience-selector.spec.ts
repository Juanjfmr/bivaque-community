// Onda E Task 4 — composer shows reach before submit, and a post of a group
// carries its reach chip in the group feed.
//
// Reescrito no lote 5, tarefa N2 (ADR-20261023): publicação passou a existir SÓ
// dentro de um grupo. Cidade inteira e vila saíram do seletor, então o chip
// provado é o de GRUPO, no feed do grupo — não há mais publicação de cidade
// para carregar chip de cidade.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { chooseTestGroup, openComposer, TEST_GROUP_FEED_URL } from "./helpers/composer"
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

test.describe("audience selector and reach chip", () => {
  test("the audience notice describes who will read", async ({ page }) => {
    // Given an authenticated member who belongs to a group
    await signInAs(page, MEMBER_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When the composer opens and the group is chosen
    await openComposer(page)
    const dialog = page.getByRole("dialog")
    await chooseTestGroup(dialog)

    // Then the audience section renders with the notice of the chosen group
    await expect(dialog.getByText(/aprovados deste grupo vão ler/i)).toBeVisible()
  })

  test("group post carries a chip with the group reach in the group feed", async ({ page }) => {
    // Given a member of Manaus (any verified member reads a public group)
    await signInAs(page, MEMBER_EMAIL)

    // When the member opens the group feed — é o único feed de publicação que
    // existe desde o lote 5 N2
    await page.goto(TEST_GROUP_FEED_URL, { waitUntil: "load" })

    // Then a post of the group carries the group chip. The chip
    // (feed-post-card) is a static HeroUI Chip, not an interactive
    // control — it carries no button role, so a byRole("button") locator
    // never matched even though the chip renders.
    await expect(page.locator("article").first()).toBeVisible({ timeout: 20000 })
    await expect(page.locator('[aria-label="Alcance: só o grupo"]').first()).toBeVisible()
    // And no city-reach chip is offered: publicar para a cidade inteira deixou
    // de existir.
    await expect(page.locator('[aria-label$="inteira"]')).toHaveCount(0)
  })
})
