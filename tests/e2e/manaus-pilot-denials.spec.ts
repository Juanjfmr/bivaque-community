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
    "/messages",
  ]

  for (const route of PROTECTED_ROUTES) {
    test(`${route} refuses an anonymous visitor and sends them to login`, async ({ page }) => {
      // Given an unauthenticated browser
      // When the user navigates directly to a protected route
      await page.goto(route)

      // Then the proxy refuses and routes to the entry screen, keeping the
      // intended destination so the person does not lose their way
      await page.waitForURL(/\/login/)
      expect(page.url()).toContain(`redirect=${encodeURIComponent(route)}`)
      await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
    })
  }

  test("an anonymous visitor cannot reach community by way of login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user tries to access /community
    await page.goto("/community")

    // Then they are refused into the entry screen
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()

    // When they try to navigate back to community, passing through the entry
    await page.goto("/community")

    // Then the refusal repeats — passar pela tela de entrada não concede sessão
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 2: Private group admission — unauthenticated user cannot interact
// ---------------------------------------------------------------------------

test.describe("private group admission: denial paths", () => {
  test("groups page without auth is refused into login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /groups
    await page.goto("/groups")

    // Then the proxy refuses into the entry screen (ADR-20260907: o portão de
    // consentimento saiu; quem decide o acesso é a sessão)
    await page.waitForURL(/\/login/)
    expect(page.url()).toContain("/login")
  })

  test("groups page with consent but no Supabase auth redirects to /login", async ({ page }) => {
    // Given a browser with the consent cookie but no Supabase auth session
    await setConsentCookie(page)

    // When the user navigates to the groups page
    await page.goto("/groups")

    // Then the middleware session gate (apps/web/middleware.ts) sends them
    // to /login antes da pagina renderizar; o setError("Voce precisa
    // entrar para acessar os grupos.") de apps/web/app/(shell)/groups/page.tsx
    // nunca tem chance de aparecer.
    await page.waitForURL(/\/login/, { timeout: 10000 })
  })

  test("an anonymous visitor cannot reach a private group directly", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to a hypothetical private group URL
    await page.goto("/groups/some-private-group-id")

    // Then the proxy refuses antes de o Next tratar a rota — a recusa não
    // depende de o grupo existir, e por isso não vaza existência
    await page.waitForURL(/\/login/)
  })
})

// ---------------------------------------------------------------------------
// Denial 3: DM without context — messages page requires auth
// ---------------------------------------------------------------------------

test.describe("DM without context: denial paths", () => {
  test("messages page refuses an anonymous visitor into login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /messages
    await page.goto("/messages")

    // Then the proxy refuses into the entry screen. ADR-20260907: o portão
    // de consentimento saiu do proxy; a recusa continua, o destino é outro.
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })

  test("messages page with consent but no auth redirects to /login", async ({ page }) => {
    // Given a browser with the consent cookie but no Supabase session
    await setConsentCookie(page)

    // When the user navigates to the messages page
    await page.goto("/messages")

    // Then the middleware session gate (apps/web/middleware.ts) sends them
    // to /login; o heading "Mensagens" e o loading "Carregando conversas"
    // de apps/web/app/(shell)/messages/page.tsx nunca renderizam.
    await page.waitForURL(/\/login/, { timeout: 10000 })
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

  test("onboarding does not offer a geographic waitlist for non-Manaus users", async ({ page }) => {
    // Given the onboarding page
    // When a non-Manaus user visits the onboarding page
    await seedSession(page.context())
    await page.goto("/onboarding")

    // Then the geographic waitlist entry point is gone — P0 Task 8 makes
    // eligibility, not geography, the gate. Whoever is eligible joins their
    // own locality; whoever is not is rejected without a waitlist detour.
    await expect(page.getByRole("button", { name: /lista de espera/ })).toHaveCount(0)
    await expect(page.getByRole("link", { name: /lista de espera/ })).toHaveCount(0)

    // And the waitlist form (which used to load on click) is not rendered
    await expect(page.getByLabel("E-mail")).toHaveCount(0)
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
  test("events page refuses an anonymous visitor into login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /events
    await page.goto("/events")

    // Then the proxy refuses into the entry screen. ADR-20260907: o portão
    // de consentimento saiu do proxy; a recusa continua, o destino é outro.
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 7: Notifications page denial — non-affiliated user
// ---------------------------------------------------------------------------

test.describe("notifications: denial paths", () => {
  test("notifications page refuses an anonymous visitor into login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /notifications
    await page.goto("/notifications")

    // Then the proxy refuses into the entry screen. ADR-20260907: o portão
    // de consentimento saiu do proxy; a recusa continua, o destino é outro.
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 8: Recommendations page denial
// ---------------------------------------------------------------------------

test.describe("recommendations: denial paths", () => {
  test("recommendations page refuses an anonymous visitor into login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /recommendations
    await page.goto("/recommendations")

    // Then the proxy refuses into the entry screen. ADR-20260907: o portão
    // de consentimento saiu do proxy; a recusa continua, o destino é outro.
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
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
      await page.waitForURL(/\/login/)
      await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
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
  })

  test("consent page is always accessible regardless of cookie state", async ({ page }) => {
    // Given any consent cookie state
    // When the user navigates to /consent
    await page.goto("/consent")

    // Then the consent page renders regardless of auth state
    await expect(
      page.getByRole("heading", { name: "Antes de entrar, conheça as regras." }),
    ).toBeVisible()

    // And the accept button is always visible
    await expect(page.getByRole("button", { name: "Concordar e continuar" })).toBeVisible()
  })

  test("login page is always accessible regardless of cookie state", async ({ page }) => {
    // Given any consent cookie state
    // When the user navigates to /login
    await page.goto("/login")

    // Then the login page renders regardless. O título é o da prancha
    // 36-web-auth-entrada, fixado por ADR-20260907-login-com-senha — o heading
    // "Bivaque" pertencia à tela anterior.
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })

  test("onboarding refuses an anonymous visitor into login", async ({ page }) => {
    // Given a browser without a session
    // When the user navigates to /onboarding
    await page.goto("/onboarding")

    // Then the proxy refuses before the CPF form. O aceite não é mais cobrado
    // aqui: ele é condição de criar a conta (ver onboarding-denials.spec.ts).
    await page.waitForURL(/\/login/)
  })

  test("onboarding renders when consent is present", async ({ page }) => {
    // Given the consent cookie
    await seedSession(page.context())

    // When the user navigates to /onboarding
    await page.goto("/onboarding")

    // Then the eligibility heading is visible
    await expect(page.getByRole("heading", { name: "Confirme sua elegibilidade." })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 10: Accessibility — no keyboard trap on denial pages
// ---------------------------------------------------------------------------

test.describe("accessibility on denial pages", () => {
  test("no keyboard trap on consent page", async ({ page }) => {
    // Given the consent page
    await page.goto("/consent")
    await page.waitForSelector("button", { timeout: 10000 })

    // Consent requires a deliberate checkbox before the submit control is
    // enabled. Verify keyboard users can select it and Tab moves focus away;
    // no control may trap a keyboard user on this pre-auth screen.
    const checkbox = page.getByRole("checkbox", { name: /Li e concordo com a/ })
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
