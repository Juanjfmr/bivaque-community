// Onda F Task 5 — close the ask-and-answer loop: author notified on reply,
// edit/delete own reply, Explorar links to detail, request resolved.
//
// Committed without running per README "E2E precisa do dono". Two real
// gaps found running the E2E realignment: (1) the seed had zero rows in
// recommendation_requests at all — seed.sql now seeds one authored by the
// default seedSession() account (visual@bivaque.example.invalid); (2) the
// "Ajudou a resolver" button lived inside the "Pedidos" tab of the old
// /recommendations page. Since 25/09/2026 the request has its own page,
// /indicacoes/<id> (ADR-20260925-memoria-de-indicacoes).

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
// Any Manaus member other than the request's author (visual@bivaque.example.
// invalid). membro-3 (Diego Almeida) has no other role in this file's fixture.
const REPLIER_EMAIL = "membro-3@bivaque.example.invalid"
// O autor do pedido semeado. NÃO usar seedSession() aqui: ele autentica a
// dono-vila@ (ver apps/web/.env.local), enquanto o pedido do seed pertence à
// visual@ — sem esta conta o teste procura o botão de resolver na tela de quem
// não é autor, e a notificação de resposta nunca chega a quem a escreveu.
const AUTHOR_EMAIL = "visual@bivaque.example.invalid"
const REQUEST_TITLE = "Alguém conhece um bom encanador?"
const REQUEST_PATH = "/indicacoes/80000000-0000-4000-8000-000000000f00"

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

test.describe("recommendation ask-and-answer loop", { tag: "@stateful" }, () => {
  test("replying to a request notifies its author (F5 Step 5)", async ({ page, browser }) => {
    // Given a second member replies to the seeded request authored by
    // visual@bivaque.example.invalid (seed.sql's "Alguém conhece um bom
    // encanador?", 80000000-...-000f00)
    await signInAs(page, REPLIER_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto(REQUEST_PATH)
    await expect(page.getByRole("heading", { level: 1, name: REQUEST_TITLE })).toBeVisible()
    // Texto único por execução: a suíte serial passa pelos três projetos no
    // mesmo banco, e a resposta de um projeto anterior continua na página.
    const reply = `Conheço um ótimo, te mando o contato. ${Date.now().toString(36)}`
    const replyBox = page.getByLabel("Sua indicação")
    await replyBox.fill(reply)
    await page.getByRole("button", { name: "Responder", exact: true }).click()
    // Enviada: o campo esvazia e a resposta entra na lista.
    await expect(replyBox).toHaveValue("")
    await expect(page.getByRole("paragraph").filter({ hasText: reply })).toBeVisible()

    // Then the author sees a notification for it, in a fresh session so the
    // two accounts never share cookies/state
    const authorContext = await browser.newContext()
    const authorPage = await authorContext.newPage()
    // O autor do pedido do seed é a visual@; o seedSession() aponta para a
    // dono-vila@, que não receberia notificação nenhuma deste pedido.
    await signInAs(authorPage, AUTHOR_EMAIL)
    await authorPage.goto("/notifications")
    // A RECON-006 (prancha 54) trocou as abas por tema — Vizinhanca, Minha
    // atividade, Alertas — pelo filtro de leitura: Todas e Nao lidas. Nao ha
    // mais aba para clicar, e a pagina abre em "Todas", que inclui esta
    // notificacao. A assercao seguinte continua sendo a prova: o autor do
    // pedido ve que responderam.

    await expect(authorPage.getByText(/respondeu ao seu pedido de indicação/).first()).toBeVisible({
      timeout: 15000,
    })

    await authorContext.close()
  })

  test("an author can mark their request resolved", async ({ page }) => {
    // Given a session of the member who AUTHORED the seeded request. A conta
    // importa: o pedido do seed ("Alguém conhece um bom encanador?") é da
    // visual@, e o seedSession() do ambiente autentica a dono-vila@ — que não é
    // autora e por isso nunca via o botão "Ajudou a resolver".
    await signInAs(page, AUTHOR_EMAIL)
    await page.setViewportSize({ width: 1280, height: 800 })

    // When they open their request
    await page.goto(REQUEST_PATH)

    // Then the "Ajudou a resolver" action is reachable on a reply that is not
    // the marked one (the seed marks the first reply)
    await expect(page.getByRole("button", { name: /^Ajudou a resolver/ }).first()).toBeVisible()
  })

  test("the invite surface has no people search (D43)", async ({ page }) => {
    // Given a session
    await seedSession(page.context())
    await page.goto("/community?vista=indicacoes")
    await expect(page.getByRole("heading", { name: "O que você procura?" })).toBeVisible()

    // Then no people-search input is present on the recommendation surface.
    // Escopado ao conteúdo da página: o cabeçalho tem busca global de conteúdo
    // (RECON-021) e o locator global contava esse campo, medindo outra coisa.
    const surface = page.locator("main")
    await expect(surface.locator('input[type="search"]')).toHaveCount(0)
    await expect(surface.getByText(/buscar pessoas|buscar membros/i)).toHaveCount(0)
  })
})
