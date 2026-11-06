import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, seedSession } from "./helpers/session"

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function setConsentCookie(page: import("@playwright/test").Page) {
  // Given a fresh page context
  // When the consent cookie is set
  await page
    .context()
    .addCookies([
      { name: "bivaque-consent-version", value: CURRENT_CONSENT, path: "/", domain: "127.0.0.1" },
    ])
}

// ---------------------------------------------------------------------------
// Denial 1: anonymous visitor — every protected route refuses and sends to login
//
// Realinhado em 2026-09-08 com ADR-20260907-consentimento-no-cadastro (approved,
// R3): "O portão de consentimento sai do proxy". A recusa continua existindo —
// nenhuma rota protegida renderiza sem sessão — mas o destino agora é
// /login?redirect=<pathname> (apps/web/proxy.ts:114-118), não /consent.
// O aceite passou a ser cobrado na criação da conta; a prova disso está em
// tests/e2e/onboarding-denials.spec.ts, bloco "consent is enforced at account
// creation".
// ---------------------------------------------------------------------------

test.describe("anonymous visitor: protected route denial", () => {
  const PROTECTED_ROUTES = [
    "/community",
    "/groups",
    "/events",
    "/profile",
    "/recommendations",
    "/notifications",
  ]

  for (const route of PROTECTED_ROUTES) {
    test(`${route} refuses an anonymous visitor and sends them to the app entry`, async ({
      page,
    }) => {
      // Given an unauthenticated browser
      // When the user navigates directly to a protected route
      await page.goto(route)

      // Then the proxy refuses and routes to the entry screen, keeping the
      // intended destination so the person does not lose their way
      await page.waitForURL(/\/app\/entrar/)
      expect(page.url()).toContain(`redirect=${encodeURIComponent(route)}`)
      await expect(
        page.getByRole("heading", { name: "A comunidade militar da sua cidade." }),
      ).toBeVisible()
    })
  }

  test("an anonymous visitor cannot reach community by way of login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user tries to access /community
    await page.goto("/community")

    // Then they are refused into the entry screen
    await page.waitForURL(/\/app\/entrar/)
    await expect(
      page.getByRole("heading", { name: "A comunidade militar da sua cidade." }),
    ).toBeVisible()

    // When they try to navigate back to community, passing through the entry
    await page.goto("/community")

    // Then the refusal repeats — passar pela tela de entrada não concede sessão
    await page.waitForURL(/\/app\/entrar/)
    await expect(
      page.getByRole("heading", { name: "A comunidade militar da sua cidade." }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 2: Private group admission — unauthenticated user cannot interact
// ---------------------------------------------------------------------------

test.describe("private group admission: denial paths", () => {
  test("groups page without auth is refused into the app entry", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /groups
    await page.goto("/groups")

    // Then the proxy refuses into the entry screen (ADR-20260907: o portão de
    // consentimento saiu; quem decide o acesso é a sessão)
    await page.waitForURL(/\/app\/entrar/)
    expect(page.url()).toContain("/app/entrar")
  })

  test("groups page with consent but no Supabase auth redirects to /app/entrar", async ({
    page,
  }) => {
    // Given a browser with the consent cookie but no Supabase auth session
    await setConsentCookie(page)

    // When the user navigates to the groups page
    await page.goto("/groups")

    // Grupos continua na web até o F04: sem sessão, o portão do proxy manda para a
    // entrada do app antes da página renderizar.
    await page.waitForURL(/\/app\/entrar/, { timeout: 10000 })
  })

  test("an anonymous visitor cannot reach a private group directly", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to a hypothetical private group URL
    await page.goto("/groups/some-private-group-id")

    // Then the proxy refuses antes de o Next tratar a rota — a recusa não
    // depende de o grupo existir, e por isso não vaza existência
    await page.waitForURL(/\/app\/entrar/)
  })
})

// ---------------------------------------------------------------------------
// Denial 3: DM without context — messages page requires auth
// ---------------------------------------------------------------------------

test.describe("DM without context: denial paths", () => {
  test("messages sem sessão chega ao app e recusa a leitura", async ({ page }) => {
    // Given a browser with the consent cookie but no Supabase session
    await setConsentCookie(page)

    // When the user navigates to the messages page
    await page.goto("/messages")

    // O app recebe a rota; a API recusa a leitura sem sessão.
    await expect(page).toHaveURL(/\/app\/conversas$/)
    await expect(page.locator('[data-estado="sessao-vencida"]')).toBeVisible({ timeout: 10000 })
  })
})

// ---------------------------------------------------------------------------
// Denial 4: Non-Manaus locality denial
// ---------------------------------------------------------------------------

test.describe("non-Manaus locality: denial paths", () => {
  test("onboarding API rejects invalid CPF format without auth", async ({ request }) => {
    // Given a request with an empty CPF
    // When a client POSTs to /api/onboarding without auth
    const noAuthResp = await request.post("/api/onboarding", {
      data: { action: "verify-cpf", cpf: "" },
    })

    // Then the API rejects with 401 (unauthorized — no Bearer token)
    expect(noAuthResp.status()).toBe(401)
  })

  test("onboarding API rejects requests with invalid Bearer token", async ({ request }) => {
    // Given a request with a fake Bearer token
    // When a client POSTs to /api/onboarding
    const response = await request.post("/api/onboarding", {
      headers: { Authorization: "Bearer invalid-token" },
      data: { action: "verify-cpf", cpf: "00000000000" },
    })

    // Then the API rejects with 401
    expect(response.status()).toBe(401)
  })

  test("onboarding API rejects unknown action", async ({ request }) => {
    // Given a request with a fake Bearer token
    // When a client POSTs an unknown action
    const response = await request.post("/api/onboarding", {
      headers: { Authorization: "Bearer invalid-token" },
      data: { action: "unknown-action" },
    })

    // Then the API rejects with 401 (auth check runs before action dispatch)
    expect(response.status()).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Denial 5: Absolute trust boundary — API routes never leak private data
// ---------------------------------------------------------------------------

test.describe("trust boundary: API denial paths", () => {
  test("health endpoint is always publicly accessible", async ({ request }) => {
    // Given the production Next server
    // When an unauthenticated client requests the health endpoint
    const response = await request.get("/api/health")

    // Then the endpoint returns the operational contract
    await expect(response).toBeOK()
    expect(await response.text()).toBe('{"status":"ok"}')
  })

  test("manifest endpoint is always publicly accessible", async ({ request }) => {
    // Given the production Next server
    // When an unauthenticated client requests the manifest
    const response = await request.get("/api/manifest")

    // Then the manifest is served publicly
    await expect(response).toBeOK()
    const body = await response.json()
    expect(body.name).toBe("Bivaque")
  })

  test("onboarding API requires valid Bearer token — not just any header", async ({ request }) => {
    // Given a request with an Authorization header that is not Bearer
    // When a client POSTs to /api/onboarding without "Bearer " prefix
    const response = await request.post("/api/onboarding", {
      headers: { Authorization: "Basic dGVzdDp0ZXN0" },
      data: { action: "verify-cpf", cpf: "00000000000" },
    })

    // Then the API rejects with 401
    expect(response.status()).toBe(401)
  })

  test("onboarding API rejects POST without action field", async ({ request }) => {
    // Given a request with a fake token but no action
    // When a client POSTs empty body
    const response = await request.post("/api/onboarding", {
      headers: { Authorization: "Bearer fake-token" },
      data: {},
    })

    // Then the API rejects with 401 (auth check first)
    expect(response.status()).toBe(401)
  })
})

// ---------------------------------------------------------------------------
// Denial 6: Events page denial — unauthenticated cannot RSVP
// ---------------------------------------------------------------------------

test.describe("events RSVP: denial paths", () => {
  test("events page refuses an anonymous visitor into the app entry", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /events
    await page.goto("/events")

    // Then the proxy refuses into the entry screen. ADR-20260907: o portão
    // de consentimento saiu do proxy; a recusa continua, o destino é outro.
    await page.waitForURL(/\/app\/entrar/)
    await expect(
      page.getByRole("heading", { name: "A comunidade militar da sua cidade." }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 7: Notifications page denial — non-affiliated user
// ---------------------------------------------------------------------------

test.describe("notifications: denial paths", () => {
  test("notifications page refuses an anonymous visitor into the app entry", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /notifications
    await page.goto("/notifications")

    // Then the proxy refuses into the entry screen. ADR-20260907: o portão
    // de consentimento saiu do proxy; a recusa continua, o destino é outro.
    await page.waitForURL(/\/app\/entrar/)
    await expect(
      page.getByRole("heading", { name: "A comunidade militar da sua cidade." }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 8: Recommendations page denial
// ---------------------------------------------------------------------------

test.describe("recommendations: denial paths", () => {
  test("recommendations page refuses an anonymous visitor into the app entry", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /recommendations
    await page.goto("/recommendations")

    // Then the proxy refuses into the entry screen. ADR-20260907: o portão
    // de consentimento saiu do proxy; a recusa continua, o destino é outro.
    await page.waitForURL(/\/app\/entrar/)
    await expect(
      page.getByRole("heading", { name: "A comunidade militar da sua cidade." }),
    ).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 9: Consent cookie tampering
// ---------------------------------------------------------------------------

// O cookie de consentimento deixou de ser portão (ADR-20260907-consentimento-no-
// cadastro). Estes testes provavam o portão; provar de novo seria provar
// comportamento removido. O que precisa continuar verdadeiro, e é o que eles
// verificam agora, é o contrário: **adulterar o cookie não muda nada** — não
// concede acesso a quem não tem sessão, e não expulsa quem tem. O cookie é
// atalho de navegação a partir da raiz, nunca autoridade (apps/web/proxy.ts:94-103;
// a autoridade é has_accepted_consent no servidor).
test.describe("consent cookie tampering: it is not a gate", () => {
  for (const [rotulo, valor] of [
    ["an outdated version", "0"],
    ["a garbage value", "garbage"],
  ] as const) {
    test(`${rotulo} does not grant an anonymous visitor any access`, async ({ page }) => {
      // Given a browser with a tampered consent cookie
      await page
        .context()
        .addCookies([
          { name: "bivaque-consent-version", value: valor, path: "/", domain: "127.0.0.1" },
        ])

      // When the user navigates to a protected route
      await page.goto("/community")

      // Then the refusal is exactly the same as without any cookie: the cookie
      // never granted access, and after the ADR it does not deny it either
      await page.waitForURL(/\/app\/entrar/)
      await expect(
        page.getByRole("heading", { name: "A comunidade militar da sua cidade." }),
      ).toBeVisible()
    })
  }

  test("a tampered cookie does not lock a real session out of the app", async ({ page }) => {
    // Given a real seeded session AND a garbage consent cookie
    await seedSession(page.context())
    await page
      .context()
      .addCookies([
        { name: "bivaque-consent-version", value: "garbage", path: "/", domain: "127.0.0.1" },
      ])

    // When the member opens a protected route
    await page.goto("/community")

    // Then they stay in the app. É o defeito RUN-001 que o ADR foi criado para
    // matar: cookie limpo, expirado ou de versão antiga devolvia a pessoa ao
    // portão a cada visita.
    await expect(page).not.toHaveURL(/\/consent/)
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page).not.toHaveURL(/\/app\/entrar/)
  })

  test("consent page is always accessible regardless of cookie state", async ({ page }) => {
    // Given any consent cookie state
    // When the user navigates to /consent
    await page.goto("/consent")

    // Then the consent page renders regardless of auth state. PORT-003: sem
    // sessão não há aceite a registrar, então a tela diz o que falta (entrar) em
    // vez de oferecer um botão que só falha.
    await expect(page.getByRole("heading", { name: "Antes de entrar, as regras." })).toBeVisible()

    // And the way back to the account is always offered
    await expect(page.getByRole("link", { name: "Entrar" })).toBeVisible()
  })

  test("onboarding refuses an anonymous visitor into the app entry", async ({ page }) => {
    // Given a browser without a session
    // When the user navigates to /onboarding
    await page.goto("/onboarding")

    // Then the proxy refuses before the CPF form, and the web sends the person
    // on to /app/entrar (ENTRADA-WEB-ANTIGA). O aceite não é mais cobrado aqui:
    // ele é condição de criar a conta (ver onboarding-denials.spec.ts).
    await page.waitForURL(/\/app\/entrar/)
  })
})

// ---------------------------------------------------------------------------
// Denial 10: Accessibility — no keyboard trap on denial pages
// ---------------------------------------------------------------------------

test.describe("accessibility on denial pages", () => {
  test("no keyboard trap on consent page", async ({ page }) => {
    // Given the consent page, com a sessão de quem vai registrar o aceite: sem
    // sessão a tela mostra o caminho de volta, e não haveria controle a testar.
    await seedSession(page.context())
    await page.goto("/consent")
    await page.waitForSelector("button", { timeout: 10000 })

    // Consent requires a deliberate checkbox before the submit is registered.
    // Verify keyboard users can select it and Tab moves focus away; no control
    // may trap a keyboard user on this pre-auth screen.
    const checkbox = page.getByRole("checkbox", { name: /Li e aceito a/ })
    await checkbox.focus()
    await expect(checkbox).toBeFocused()

    await page.keyboard.press("Space")
    await expect(checkbox).toBeChecked()

    await page.keyboard.press("Tab")
    await expect(checkbox).not.toBeFocused()
    await expect
      .poll(() => page.evaluate(() => document.activeElement !== document.body))
      .toBe(true)
  })

  test("no horizontal overflow on consent page at 375px", async ({ page }) => {
    // Given the mobile-375 viewport
    // When the consent page loads
    await page.goto("/consent")

    // Then there is no horizontal overflow
    await page.waitForSelector("body")
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
  })
})
