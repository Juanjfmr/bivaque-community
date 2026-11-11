// Onda F Task 3 — organizer event invitation fan-out.
//
// RUN-133/F05: a tela antiga de eventos saiu inteira de apps/web e os endereços
// antigos passam a chegar às telas do app (`/events/:id` → `/app/evento/:id`).
// O fan-out de convites existia SÓ nessa tela; o app não tem equivalente
// (`apps/app/src/eventos/` não tem seção de convites e não há `event_invites`
// no SPA). A jornada não some da prova: ela vira a prova de que o endereço
// antigo chega ao encontro novo e de que a antiga seção de convites — com a
// busca de pessoas que a D43 proibia — não existe mais em lugar nenhum.
//
// Comentário histórico mantido: o id original (60000000-...-0010) estava fora
// do range do seed; o evento 5 ("Piquenique das famílias") é `upcoming` e é
// organizado por membro-6.

import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue, readEnvLocal } from "./helpers/session"

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"

// "Piquenique das famílias" — upcoming (i=5 of seed.sql events); organized by
// membro-6 (30000000-...-(1 + (5 % 12)) = 30000000-...-0006).
const EVENT_ID = "70000000-0000-4000-8000-000000000005"
const ORGANIZER_EMAIL = "membro-6@bivaque.example.invalid"

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

test.describe("event invitation fan-out: endereço antigo chega ao encontro novo", () => {
  test("o organizador abre /events/:id e aterra no encontro do app", async ({ page }) => {
    // Given a session of the event's real organizer
    await signInAs(page, ORGANIZER_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open the old address of an event they organize
    await page.goto(`/events/${EVENT_ID}`)

    // Then the config redirect hands them to the app's event screen, with the id
    await expect(page).toHaveURL(new RegExp(`/app/evento/${EVENT_ID}$`))
    await expect(page.getByRole("heading", { name: "Piquenique das famílias" })).toBeVisible({
      timeout: 15000,
    })

    // And the old invite fan-out section is gone with the old screen
    await expect(page.getByRole("heading", { name: /Convidar para este evento/ })).toHaveCount(0)
  })

  test("a busca de pessoas da D43 não reapareceu no encontro do app", async ({ page }) => {
    // Given a session of the event's real organizer
    await signInAs(page, ORGANIZER_EMAIL)
    await page.goto(`/events/${EVENT_ID}`)
    await expect(page).toHaveURL(new RegExp(`/app/evento/${EVENT_ID}$`))

    // Then the event screen offers no people-search box. A D43 proibia busca de
    // pessoas na seção de convites; a seção saiu com a tela antiga, então a
    // asserção muda de superfície sem perder a propriedade. O bloco de presença
    // não é exigido: o evento do seed está concluído e a tela o esconde.
    const evento = page.locator('[data-tela="evento"]').first()
    await expect(evento).toBeVisible({ timeout: 15000 })
    await expect(evento.locator('input[type="search"]')).toHaveCount(0)
    await expect(evento.getByRole("heading", { name: /Convidar para este evento/ })).toHaveCount(0)
  })
})
