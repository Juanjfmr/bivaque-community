// Onda E Task 2 — the home is the vila feed; without a vila, the city reference.
//
// These specs assert the visual surface described in the plan and the
// behavior of the feed/community boundary. They commit without running
// (README: "E2E requires the owner to db:reset with seed and run the
// suite once"). Both views assert the h1 of the page is the right section
// title and that the right elements are present.

// Helper: log in a Vila Ajuricaba member and navigate to /community. The
// session helper mints a session via the password grant and sets the cookie
// the middleware expects; the seed sets the user up as an approved member of
// Vila Ajuricaba.
//
// Realigned: the seed had zero communities, so seed.sql now seeds "Vila
// Ajuricaba" (71000000-...-0001, see community-batch-approval.spec.ts's
// header) owned by a dedicated dono-vila@ account. It can't be the default
// seedSession() account: this file's own second test requires that account
// to have NO approved community — mutually exclusive with test 1's need.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
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

test.describe("home is the vila feed; without a vila, the city reference", () => {
  test("approved member of Vila Ajuricaba sees the vila feed with the locality-reach post", async ({
    page,
  }) => {
    // Given an authenticated session whose seed membership is approved in
    // Vila Ajuricaba
    await signInAs(page, VILA_OWNER_EMAIL)
    await page.setViewportSize({ width: 375, height: 812 })

    // When the member opens the home
    await page.goto("/community")

    // Then the h1 is the vila name (section title), not "Bivaque" and not "Manaus, AM"
    // Timeout generoso no PRIMEIRO assert: quando este é o primeiro spec a rodar
    // contra um servidor recém-compilado (lote serial, projeto mobile), o JIT do
    // Next estoura os 5s padrão antes de qualquer dado — visto em 2026-08-25.
    await expect(page.getByRole("heading", { name: "Vila Ajuricaba" })).toBeVisible({
      timeout: 20000,
    })

    // And a locality-reach post is in the feed — E1 made it possible. The
    // card text is fixture-defined; we just assert it's there.
    await expect(page.getByText("Aviso da cidade para todas as vilas")).toBeVisible({
      timeout: 15000,
    })

    // And the composer is wired
    await expect(page.getByRole("button", { name: "Publicar" }).first()).toBeVisible()
  })

  test("member with no approved community sees the city reference, not a feed", async ({
    page,
  }) => {
    // Given an authenticated member with NO approved community. O seed reserva
    // DUAS contas justamente para estes dois testes (seed.sql:688-697): a
    // dono-vila@ é a dona da Vila Ajuricaba (o teste anterior) e a visual@
    // "permanece sem comunidade" — este. O seedSession() do ambiente aponta para
    // dono-vila@, então os dois testes caíam na mesma conta e este quebrava.
    await signInAs(page, "visual@bivaque.example.invalid")
    await page.setViewportSize({ width: 375, height: 812 })

    // When the member opens the home
    await page.goto("/community")

    // Then there is no feed list (no post cards)
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)

    // And the city reference renders the four things from §6.2. "Guia de
    // chegada" appears three times (a lead paragraph, this heading, and the
    // "Abrir o guia de chegada" link) — scoped to the heading role so the
    // locator resolves to exactly one element instead of a strict-mode
    // violation.
    await expect(page.getByRole("heading", { name: /.*/ }).first()).toBeVisible()
    await expect(page.getByText("Próximos eventos da cidade")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Guia de chegada" })).toBeVisible()
    await expect(page.getByText("Vitrine de prestadores")).toBeVisible()
    await expect(page.getByText("Entrar numa vila")).toBeVisible()

    // And the "Manaus, AM" hardcoded header that used to render when no
    // community was found is gone
    await expect(page.getByRole("heading", { name: "Manaus, AM" })).toHaveCount(0)
  })
})
