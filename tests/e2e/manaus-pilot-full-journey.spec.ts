import { expect, test } from "@playwright/test"
import { stubVerificationStatus } from "./helpers/onboarding-status"
import { BOTTOM_NAV, seedSession } from "./helpers/session"

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Flow 1: Holder onboarding — login → consent → onboarding → community entry
// ---------------------------------------------------------------------------

test.describe("holder onboarding journey", () => {
  test("unauthenticated user sees the public landing at root", async ({ page }) => {
    // Given the production Next server at the mobile-375 viewport
    // When a browser opens the root route
    await page.goto("/")

    // Then the public marketing landing is served — anonymous visitors are not
    // redirected to /login (the landing is the acquisition entry point).
    // PORT-001 (R73): o texto da landing v8 é "Juntos somos mais fortes."; o
    // que o spec protege continua sendo a raiz pública, sem redirecionamento.
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText("Juntos somos mais fortes.").first()).toBeVisible()
  })

  test("consent page shows terms and accept button", async ({ page }) => {
    // Given the production Next server, com a sessão de quem vai registrar o
    // aceite (sem sessão, a rota diz o que falta em vez de oferecer o botão)
    await seedSession(page.context())
    // When a user navigates to the consent page
    await page.goto("/consent")

    // Then the terms of use are displayed. "Bem-vindo ao Bivaque" never
    // existed on this page — found realigning this spec against the real
    // rendered /consent (apps/web/app/(preauth)/consent/page.tsx). PORT-003: a
    // tela passou a ser o passo "Aceite" do protótipo, com os três documentos
    // como links na própria frase do aceite.
    await expect(page.getByRole("heading", { name: "Antes de entrar, as regras." })).toBeVisible()
    await expect(page.getByRole("link", { name: "Política de Privacidade" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Termo de Uso" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Código de Conduta" })).toBeVisible()

    const acceptButton = page.getByRole("button", { name: "Concordar e continuar" })
    await expect(acceptButton).toBeVisible()
    // PORT-003: o botão fica ativo como na especificação e o envio sem aceite é
    // recusado com a explicação; registrar o aceite é o portão de verdade.
    await acceptButton.click()
    await expect(page.locator("#en-err")).toContainText(
      "aceite a Política de Privacidade, o Termo de Uso e o Código de Conduta",
    )
  })

  test("accepting consent navigates to the app entry", async ({ page }) => {
    // Given the consent page
    await seedSession(page.context())
    await stubVerificationStatus(page, null)
    await page.goto("/consent")

    // When the user explicitly records that they read the legal documents
    const acceptButton = page.getByRole("button", { name: "Concordar e continuar" })
    const consentCheckbox = page.getByRole("checkbox", { name: /Li e aceito a/ })
    await consentCheckbox.focus()
    await page.keyboard.press("Space")
    await expect(consentCheckbox).toBeChecked()
    await acceptButton.click()

    // Then the user is sent to the entry. The web's /onboarding now redirects to
    // /app/entrar (ENTRADA-WEB-ANTIGA), so the expectation is the app entry.
    await page.waitForURL(/\/app\/entrar/)
  })
})

// ---------------------------------------------------------------------------
// Flow 2: Family invite entry
// ---------------------------------------------------------------------------

test.describe("family invite journey", () => {
  test("the legacy invite link lands on the app entry", async ({ page }) => {
    // Given someone without a session who arrives from an old invite link
    // When the forwarded address opens (SEC-017: the old web screen is gone)
    await page.goto("/convite?legado=1")

    // Then the app entry opens, without a password field
    await expect(page).toHaveURL(/\/app\/entrar/)
    await expect(
      page.getByRole("heading", { level: 1, name: "A comunidade militar da sua cidade." }),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('input[type="password"]')).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Flow 3: Community feed
// ---------------------------------------------------------------------------

test.describe("community feed", () => {
  test("feed page refuses an anonymous visitor into the app entry", async ({ page }) => {
    // Given an unauthenticated browser without consent
    // When the user navigates directly to /community
    await page.goto("/community")

    // A rota antiga redireciona ao app, que encaminha o visitante à entrada.
    await page.waitForURL(/\/app\/entrar/)
    await expect(
      page.getByRole("heading", { name: "A comunidade militar da sua cidade." }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 4: Recommendations — anonymous access
// ---------------------------------------------------------------------------

test.describe("recommendations journey", () => {
  test("recommendations page refuses an anonymous visitor into the app entry", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /recommendations
    await page.goto("/recommendations")

    // Then the proxy refuses into the entry screen. ADR-20260907-consentimento-
    // no-cadastro tirou o portão de consentimento do proxy; a recusa continua,
    // o destino mudou.
    await page.waitForURL(/\/app\/entrar/)
    await expect(
      page.getByRole("heading", { name: "A comunidade militar da sua cidade." }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 6: Events + RSVP
// ---------------------------------------------------------------------------

test.describe("events journey", () => {
  test("events page takes an anonymous visitor to the app agenda, which refuses the read", async ({
    page,
  }) => {
    // Given an unauthenticated browser
    // When the user navigates to /events
    await page.goto("/events")

    await expect(page).toHaveURL(
      (url) => url.pathname === "/app/entrar" && url.searchParams.get("redirect") === "/app/agenda",
      { timeout: 30_000 },
    )
  })

  test("events page with consent cookie renders the app agenda", async ({ page, context }) => {
    // Given a browser with consent cookie
    await seedSession(context)

    // When the user navigates to the events page
    await page.goto("/events")

    // Then the old address lands on the app's agenda, not the old screen
    await expect(page).toHaveURL(/\/app\/agenda$/)
    await expect(page.getByRole("heading", { level: 1, name: "Agenda da cidade" })).toBeVisible({
      timeout: 15000,
    })
  })

  test("events page shows the create event action", async ({ page, context }) => {
    // Given the consent cookie
    await seedSession(context)
    await page.goto("/events")

    // Then the app's agenda offers "Criar encontro" (o antigo "Criar evento"
    // morreu com a tela antiga; a ação continua existindo no app).
    await expect(page).toHaveURL(/\/app\/agenda$/)
    await expect(page.getByRole("button", { name: "Criar encontro" }).first()).toBeVisible({
      timeout: 15000,
    })
  })
})

// ---------------------------------------------------------------------------
// Flow 7: Avisos no app
// ---------------------------------------------------------------------------

test.describe("notifications journey", () => {
  test("the old notifications URL sends an anonymous visitor to app access state", async ({
    page,
  }) => {
    await page.goto("/notifications")
    await expect(page).toHaveURL(
      (url) => url.pathname === "/app/entrar" && url.searchParams.get("redirect") === "/app/avisos",
      { timeout: 30_000 },
    )
  })

  test("notifications page with consent cookie renders notifications UI", async ({
    page,
    context,
  }) => {
    // Given a browser with consent cookie
    await seedSession(context)

    // When the user navigates to the app notifications inbox
    await page.goto("/app/avisos")

    // Then the notifications page renders
    await expect(page.getByRole("heading", { name: "Avisos" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 8: Contextual DM + Report
// ---------------------------------------------------------------------------

test.describe("contextual DM and report journey", () => {
  test("messages page with consent cookie renders messages UI", async ({ page, context }) => {
    // Given a browser with consent cookie
    await seedSession(context)

    // When the user navigates to the messages page
    await page.goto("/messages")

    // Then the messages page renders its heading and primary action
    await expect(page).toHaveURL(/\/app\/conversas$/)
    await expect(page.getByRole("heading", { level: 1, name: "Conversas" })).toBeVisible()
    await expect(page.locator('[data-filtros-conversas="sim"]')).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 9: Bottom navigation across journeys
// ---------------------------------------------------------------------------

// The member shell of the site (header, sidebar, BottomNav) left with TROCA-005:
// `(shell)/layout.tsx` and `shell-navigation.spec.ts` no longer exist, and the
// authenticated app now lives in /app. What this spec still pins is the boundary
// that did not move — the root serves the anonymous landing with no app chrome,
// and /app/entrar and /consent stay chrome-free. Positive BottomNav coverage is
// `apps/app/tests/e2e` now.
test.describe("preauth routes render no app shell", () => {
  test("root serves the public landing without the app shell", async ({ page }) => {
    // Given the production Next server
    // When a user opens the root route while unauthenticated
    await page.goto("/")

    // Then the public landing renders and the authenticated app shell (BottomNav)
    // is absent — the landing is its own marketing chrome, not the (shell) layout.
    // PORT-001 (R73): o texto passou a ser o da landing v8; a fronteira que o
    // spec protege (raiz pública, sem shell do app) não mudou.
    await expect(page.getByText("Juntos somos mais fortes.").first()).toBeVisible()
    await expect(page.locator(BOTTOM_NAV)).toHaveCount(0)
  })

  for (const path of ["/app/entrar", "/consent"]) {
    test(`no shell chrome on ${path}`, async ({ page }) => {
      // Given a preauth route
      await page.goto(path)

      // Then the authenticated app shell (BottomNav) is absent. Preauth pages
      // keep their own topbar chrome, but must not render the (shell) layout.
      await expect(page.locator(BOTTOM_NAV)).toHaveCount(0)
    })
  }
})

// ---------------------------------------------------------------------------
// Flow 10: Accessibility — no horizontal overflow, keyboard trap, touch targets
// ---------------------------------------------------------------------------

test.describe("accessibility across journeys", () => {
  const KEY_PAGES = [
    { path: "/app/entrar", name: "app entry" },
    { path: "/consent", name: "consent" },
  ]

  for (const { path, name } of KEY_PAGES) {
    test(`no horizontal overflow on ${name} page at 375px`, async ({ page }) => {
      // Given the mobile-375 viewport
      // When the browser opens the page
      await page.goto(path)

      // Then there is no horizontal overflow
      await page.waitForSelector("body")
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = await page.evaluate(() => window.innerWidth)
      expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
    })
  }

  // Touch-target coverage for the BottomNav tabs and the Indicações entry used
  // to live here against /login, where neither element exists. It now runs
  // against the authenticated shell in shell-accessibility-denials.spec.ts.

  test("reduced motion preference is respected across the app", async ({ page }) => {
    // Given a browser with prefers-reduced-motion: reduce
    await page.emulateMedia({ reducedMotion: "reduce" })

    // When the page loads
    await page.goto("/")

    // Then the reduced-motion media query matches
    const motionQueryMatches = await page.evaluate(() => {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    })
    expect(motionQueryMatches).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Flow 11: Preauth pages carry their own heading
// ---------------------------------------------------------------------------

// These pages have no shell header to brand them, so each one states its own
// purpose in its H1. Indicações is a `(shell)` sidebar entry and is covered in
// shell-navigation.spec.ts.
test.describe("preauth page headings", () => {
  test("consent page leads with the terms heading", async ({ page }) => {
    // Given the consent page
    await page.goto("/consent")

    // Then the terms heading is visible
    await expect(page.getByRole("heading", { name: "Antes de entrar, as regras." })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 12: API endpoints remain operational
// ---------------------------------------------------------------------------

test.describe("API endpoints during full journey", () => {
  test("health endpoint returns operational status", async ({ request }) => {
    // Given the production Next server
    // When a client requests the health endpoint
    const response = await request.get("/api/health")

    // Then the health contract is respected
    await expect(response).toBeOK()
    expect(await response.text()).toBe('{"status":"ok"}')
  })

  test("manifest endpoint returns valid PWA manifest", async ({ request }) => {
    // Given the production Next server
    // When a client requests the PWA manifest
    const response = await request.get("/api/manifest")

    // Then the manifest is served correctly
    await expect(response).toBeOK()
    const body = await response.json()
    expect(body.name).toBe("Bivaque")
    expect(body.display).toBe("standalone")
  })

  test("onboarding API rejects unauthenticated requests", async ({ request }) => {
    // Given a request without auth headers
    // When a client POSTs to /api/onboarding
    const response = await request.post("/api/onboarding", {
      data: { action: "verify-cpf", cpf: "00000000000" },
    })

    // Then the API rejects with 401
    expect(response.status()).toBe(401)
  })
})
