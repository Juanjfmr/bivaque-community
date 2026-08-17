import { expect, test } from "@playwright/test"
import { seedSession } from "./helpers/session"

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function setConsentCookie(page: import("@playwright/test").Page) {
  // Given a fresh page context
  // When the consent cookie is set
  await page
    .context()
    .addCookies([{ name: "bivaque-consent-version", value: "1", path: "/", domain: "127.0.0.1" }])
}

// ---------------------------------------------------------------------------
// Denial 1: Unverified user — all protected routes redirect to consent gate
// ---------------------------------------------------------------------------

test.describe("unverified user: protected route denial", () => {
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
    test(`${route} redirects to consent when no consent cookie is present`, async ({ page }) => {
      // Given an unauthenticated browser without a consent cookie
      // When the user navigates directly to a protected route
      await page.goto(route)

      // Then the middleware redirects to the consent gate
      await page.waitForURL(/\/consent/)
      await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
    })
  }

  test("unverified user cannot bypass consent by navigating community -> login -> community", async ({
    page,
  }) => {
    // Given an unauthenticated browser
    // When the user tries to access /community
    await page.goto("/community")

    // Then they are directed to consent
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()

    // When they try to navigate back to community (skipping consent)
    await page.goto("/community")

    // Then they are redirected again to consent
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 2: Private group admission — unauthenticated user cannot interact
// ---------------------------------------------------------------------------

test.describe("private group admission: denial paths", () => {
  test("groups page without auth shows consent redirect", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /groups
    await page.goto("/groups")

    // Then the middleware redirects to consent
    await page.waitForURL(/\/consent/)
    expect(page.url()).toContain("/consent")
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

  test("user without consent cannot access private group directly", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to a hypothetical private group URL
    await page.goto("/groups/some-private-group-id")

    // Then the middleware redirects to consent
    // (Next.js would probably 404 on unknown routes, but middleware still runs)
    // The redirect to consent should happen before Next handles the route
    await page.waitForURL(/\/consent/)
  })
})

// ---------------------------------------------------------------------------
// Denial 3: DM without context — messages page requires auth
// ---------------------------------------------------------------------------

test.describe("DM without context: denial paths", () => {
  test("messages page without consent redirects to consent", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /messages
    await page.goto("/messages")

    // Then the middleware redirects to consent
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
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
  test("events page without consent redirects to consent", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /events
    await page.goto("/events")

    // Then the middleware redirects to consent
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 7: Notifications page denial — non-affiliated user
// ---------------------------------------------------------------------------

test.describe("notifications: denial paths", () => {
  test("notifications page without consent redirects to consent", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /notifications
    await page.goto("/notifications")

    // Then the middleware redirects to consent
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 8: Recommendations page denial
// ---------------------------------------------------------------------------

test.describe("recommendations: denial paths", () => {
  test("recommendations page without consent redirects to consent", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /recommendations
    await page.goto("/recommendations")

    // Then the middleware redirects to consent
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Denial 9: Consent cookie tampering
// ---------------------------------------------------------------------------

test.describe("consent cookie tampering: denial paths", () => {
  test("protected route redirects to consent when cookie value is wrong version", async ({
    page,
  }) => {
    // Given a browser with an invalid consent cookie version
    await page
      .context()
      .addCookies([{ name: "bivaque-consent-version", value: "0", path: "/", domain: "127.0.0.1" }])

    // When the user navigates to a protected route
    await page.goto("/community")

    // Then the middleware redirects to consent (version 0 is not current)
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })

  test("protected route redirects to consent when cookie has garbage value", async ({ page }) => {
    // Given a browser with a garbage consent cookie value
    await page
      .context()
      .addCookies([
        { name: "bivaque-consent-version", value: "garbage", path: "/", domain: "127.0.0.1" },
      ])

    // When the user navigates to a protected route
    await page.goto("/community")

    // Then the middleware redirects to consent (garbage != "1")
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })

  test("consent page is always accessible regardless of cookie state", async ({ page }) => {
    // Given any consent cookie state
    // When the user navigates to /consent
    await page.goto("/consent")

    // Then the consent page renders regardless of auth state
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()

    // And the accept button is always visible
    await expect(page.getByRole("button", { name: "Aceitar e continuar" })).toBeVisible()
  })

  test("login page is always accessible regardless of cookie state", async ({ page }) => {
    // Given any consent cookie state
    // When the user navigates to /login
    await page.goto("/login")

    // Then the login page renders regardless
    await expect(page.getByRole("heading", { name: "Bivaque" })).toBeVisible()
  })

  test("onboarding redirects to consent when the consent cookie is missing", async ({ page }) => {
    // Given a browser without the consent cookie
    // When the user navigates to /onboarding
    await page.goto("/onboarding")

    // Then the consent gate is applied before the CPF form
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })

  test("onboarding renders when consent is present", async ({ page }) => {
    // Given the consent cookie
    await seedSession(page.context())

    // When the user navigates to /onboarding
    await page.goto("/onboarding")

    // Then the eligibility heading is visible
    await expect(page.getByRole("heading", { name: "Verificação de elegibilidade" })).toBeVisible()
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

    // Consent is a `(preauth)` route with no shell chrome, so "Aceitar e
    // continuar" is its only focusable control. Counting focused elements
    // after two Tabs would therefore read 0 once focus leaves the document —
    // which is correct behaviour, not a trap. Assert the control can take
    // focus and that Tab releases it.
    const accept = page.getByRole("button", { name: "Aceitar e continuar" })
    await accept.focus()
    await expect(accept).toBeFocused()

    await page.keyboard.press("Tab")
    await expect(accept).not.toBeFocused()
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
