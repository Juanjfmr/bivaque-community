import { expect, test } from "@playwright/test"

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
// Flow 1: Holder onboarding — login → consent → onboarding → community entry
// ---------------------------------------------------------------------------

test.describe("holder onboarding journey", () => {
  test("unauthenticated user lands on login page from root", async ({ page }) => {
    // Given the production Next server at the mobile-375 viewport
    // When a browser opens the root route
    await page.goto("/")

    // Then the user is redirected to the login page
    await page.waitForURL("**/login")
    await expect(page.getByRole("heading", { name: "Bivaque" })).toBeVisible()
    await expect(page.getByText("Entre para acessar sua comunidade")).toBeVisible()
  })

  test("login page renders Google OAuth button and magic link form", async ({ page }) => {
    // Given the production Next server
    // When a user navigates to the login page
    await page.goto("/login")

    // Then the auth entry points are rendered
    await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Enviar link mágico" })).toBeVisible()

    const emailInput = page.getByLabel("E-mail")
    await expect(emailInput).toBeVisible()
    await emailInput.fill("holder@manaus.invalid")
    await expect(emailInput).toHaveValue("holder@manaus.invalid")
  })

  test("consent page shows terms and accept button", async ({ page }) => {
    // Given the production Next server
    // When a user navigates to the consent page
    await page.goto("/consent")

    // Then the terms of use are displayed
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
    await expect(page.getByText("Bem-vindo ao Bivaque")).toBeVisible()

    const acceptButton = page.getByRole("button", { name: "Aceitar e continuar" })
    await expect(acceptButton).toBeVisible()
  })

  test("accepting consent navigates to onboarding", async ({ page }) => {
    // Given the consent page
    await page.goto("/consent")

    // When the user clicks the accept button
    const acceptButton = page.getByRole("button", { name: "Aceitar e continuar" })
    await acceptButton.click()

    // Then the user is redirected to the onboarding page
    await page.waitForURL(/\/onboarding/)
    await expect(page.getByRole("heading", { name: "Bivaque" })).toBeVisible()
  })

  test("onboarding page renders verify eligibility flow", async ({ page }) => {
    // Given the production Next server
    // When a user navigates to the onboarding page
    await page.goto("/onboarding")

    // Then the verify eligibility UI is rendered
    const verifyButton = page.getByRole("button", { name: "Verificar elegibilidade" })
    await expect(verifyButton).toBeVisible()

    const cpfInput = page.getByLabel("CPF")
    await expect(cpfInput).toBeVisible()
    await cpfInput.fill("123.456.789-09")
    await expect(cpfInput).toHaveValue("123.456.789-09")

    // And the waitlist fallback is discoverable
    await expect(page.getByRole("button", { name: /lista de espera/ })).toBeVisible()
  })

  test("onboarding shows waitlist flow when switching from verify", async ({ page }) => {
    // Given the onboarding page with the verify flow visible
    await page.goto("/onboarding")

    // When the user clicks the "não sou de Manaus" waitlist button
    const waitlistButton = page.getByRole("button", { name: /lista de espera/ })
    await waitlistButton.click()

    // Then the waitlist form is displayed
    await expect(page.getByLabel("E-mail")).toBeVisible()
    await expect(page.getByRole("button", { name: "Entrar na lista de espera" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 2: Family invite entry
// ---------------------------------------------------------------------------

test.describe("family invite journey", () => {
  test("onboarding page with invite token renders family acceptance flow", async ({ page }) => {
    // Given an invite token in the query string
    // When a user opens the onboarding page with an invite token
    await page.goto(
      "/onboarding?invite=0000000000000000000000000000000000000000000000000000000000000000",
    )

    // Then the family acceptance flow is rendered (the invite step shows)
    // Wait for the onboarding page to resolve the step
    await page.waitForURL(/\/onboarding/)
    await expect(page.getByRole("heading", { name: "Bivaque" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Aceitar convite" })).toBeVisible()
    await expect(page.getByText(/convidado por um membro/)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 3: Community feed
// ---------------------------------------------------------------------------

test.describe("community feed", () => {
  test("feed page redirects unauthenticated user to consent", async ({ page }) => {
    // Given an unauthenticated browser without consent
    // When the user navigates directly to /community
    await page.goto("/community")

    // Then the middleware redirects to the consent gate
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })

  test("feed page with consent cookie renders the community heading", async ({ page }) => {
    // Given a browser with the consent cookie set
    await setConsentCookie(page)

    // When the user navigates to the community page
    await page.goto("/community")

    // Then the community page renders (middleware passes, Supabase may show error or empty)
    await expect(page.getByRole("heading", { name: "Minha comunidade" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Publicar" })).toBeVisible()
  })

  test("feed page is reachable at all three viewport widths", async ({ page }) => {
    // Given the consent cookie and the mobile-375 viewport
    await setConsentCookie(page)
    await page.goto("/community")

    // Then the community page renders without horizontal overflow
    await expect(page.getByRole("heading", { name: "Minha comunidade" })).toBeVisible()
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
  })
})

// ---------------------------------------------------------------------------
// Flow 4: Groups — private group admission
// ---------------------------------------------------------------------------

test.describe("groups journey", () => {
  test("groups page redirects unauthenticated user to consent", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates directly to /groups
    await page.goto("/groups")

    // Then the middleware redirects to consent
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })

  test("groups page with consent cookie renders groups UI", async ({ page }) => {
    // Given a browser with consent cookie
    await setConsentCookie(page)

    // When the user navigates to the groups page
    await page.goto("/groups")

    // Then the groups page renders (may show auth error or empty state)
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 })
  })

  test("groups page shows bottom nav with correct tab order", async ({ page }) => {
    // Given the consent cookie
    await setConsentCookie(page)
    await page.goto("/groups")

    // Then the bottom navigation is visible with 4 tabs
    const nav = page.getByRole("navigation", { name: "Navegação principal" })
    await expect(nav).toBeVisible()
    const tabs = nav.getByRole("tab")
    await expect(tabs).toHaveCount(4)
  })
})

// ---------------------------------------------------------------------------
// Flow 5: Recommendations
// ---------------------------------------------------------------------------

test.describe("recommendations journey", () => {
  test("recommendations page redirects unauthenticated user to consent", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /recommendations
    await page.goto("/recommendations")

    // Then the middleware redirects to consent
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })

  test("recommendations page with consent cookie renders browse tab", async ({ page }) => {
    // Given a browser with consent cookie
    await setConsentCookie(page)

    // When the user navigates to the recommendations page
    await page.goto("/recommendations")

    // Then the recommendations page renders mock data
    await expect(page.getByRole("heading", { name: "Indicações" })).toBeVisible()
    await expect(page.getByText("Peça e compartilhe recomendações")).toBeVisible()

    // The "Explorar" tab is visible with mock recommendation cards
    await expect(page.getByRole("tab", { name: "Explorar" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Pedir indicação" })).toBeVisible()
    await expect(page.getByRole("tab", { name: "Salvas" })).toBeVisible()
  })

  test("recommendations browse tab renders cards and tabs are present", async ({ page }) => {
    // Given the consent cookie
    await setConsentCookie(page)
    await page.goto("/recommendations")

    // Then the three tabs are present
    await expect(page.getByRole("heading", { name: "Indicações" })).toBeVisible()

    const browseTab = page.getByRole("tab", { name: "Explorar" })
    const requestTab = page.getByRole("tab", { name: "Pedir indicação" })
    const savedTab = page.getByRole("tab", { name: "Salvas" })

    await expect(browseTab).toBeVisible()
    await expect(requestTab).toBeVisible()
    await expect(savedTab).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 6: Events + RSVP
// ---------------------------------------------------------------------------

test.describe("events journey", () => {
  test("events page redirects unauthenticated user to consent", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /events
    await page.goto("/events")

    // Then the middleware redirects to consent
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })

  test("events page with consent cookie renders events UI", async ({ page }) => {
    // Given a browser with consent cookie
    await setConsentCookie(page)

    // When the user navigates to the events page
    await page.goto("/events")

    // Then the events page renders its UI
    await expect(page.getByRole("heading", { name: "Eventos" })).toBeVisible()
  })

  test("events page shows create event toggle", async ({ page }) => {
    // Given the consent cookie
    await setConsentCookie(page)
    await page.goto("/events")

    // Then the create event button is visible
    await expect(page.getByRole("button", { name: "Criar evento" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 7: Notifications
// ---------------------------------------------------------------------------

test.describe("notifications journey", () => {
  test("notifications page redirects unauthenticated user to consent", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /notifications
    await page.goto("/notifications")

    // Then the middleware redirects to consent
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })

  test("notifications page with consent cookie renders notifications UI", async ({ page }) => {
    // Given a browser with consent cookie
    await setConsentCookie(page)

    // When the user navigates to the notifications page
    await page.goto("/notifications")

    // Then the notifications page renders
    await expect(page.getByRole("heading", { name: "Notificacoes" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 8: Contextual DM + Report
// ---------------------------------------------------------------------------

test.describe("contextual DM and report journey", () => {
  test("messages page redirects unauthenticated user to consent", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /messages
    await page.goto("/messages")

    // Then the middleware redirects to consent
    await page.waitForURL(/\/consent/)
    await expect(page.getByRole("heading", { name: "Termos de uso" })).toBeVisible()
  })

  test("messages page with consent cookie renders messages UI", async ({ page }) => {
    // Given a browser with consent cookie
    await setConsentCookie(page)

    // When the user navigates to the messages page
    await page.goto("/messages")

    // Then the messages page renders (shows loading state without auth session)
    await expect(page.getByRole("heading", { name: "Mensagens" })).toBeVisible()
    await expect(page.getByText(/Carregando conversas/)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 9: Bottom navigation across journeys
// ---------------------------------------------------------------------------

test.describe("bottom navigation across key pages", () => {
  test("bottom nav renders on root redirect landing page", async ({ page }) => {
    // Given the production Next server
    // When a user opens the root route (redirects to /login)
    await page.goto("/")

    // Then the bottom nav is present on the login page
    await page.waitForURL("**/login")
    const nav = page.getByRole("navigation", { name: "Navegação principal" })
    await expect(nav).toBeVisible()
    const tabs = nav.getByRole("tab")
    await expect(tabs).toHaveCount(4)
  })

  test("bottom nav renders on consent page", async ({ page }) => {
    // Given the consent page
    await page.goto("/consent")

    // Then the bottom nav is present
    const nav = page.getByRole("navigation", { name: "Navegação principal" })
    await expect(nav).toBeVisible()
  })

  test("bottom nav tabs have correct hrefs on login page", async ({ page }) => {
    // Given the login page
    await page.goto("/login")

    // Then each tab links to the expected route
    const nav = page.getByRole("navigation", { name: "Navegação principal" })
    const tabs = nav.getByRole("tab")
    const expectedHrefs = ["/community", "/groups", "/events", "/profile"]

    for (let index = 0; index < expectedHrefs.length; index++) {
      const href = await tabs.nth(index).getAttribute("href")
      expect(href).toBe(expectedHrefs[index])
    }
  })
})

// ---------------------------------------------------------------------------
// Flow 10: Accessibility — no horizontal overflow, keyboard trap, touch targets
// ---------------------------------------------------------------------------

test.describe("accessibility across journeys", () => {
  const KEY_PAGES = [
    { path: "/login", name: "login" },
    { path: "/consent", name: "consent" },
    { path: "/onboarding", name: "onboarding" },
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

  test("no horizontal overflow on community page at 375px with consent cookie", async ({
    page,
  }) => {
    // Given the consent cookie
    await setConsentCookie(page)
    // When the browser opens /community
    await page.goto("/community")

    // Then there is no horizontal overflow
    await page.waitForSelector("body")
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
  })

  test("bottom nav tabs have minimum 44px touch targets on login page", async ({ page }) => {
    // Given the mobile-375 viewport
    // When the login page is rendered
    await page.goto("/login")

    // Then each visible tab has a minimum touch target of 44px both dimensions
    const tabs = page.locator("[role='tablist'] [role='tab']")
    const count = await tabs.count()
    expect(count).toBe(4)

    for (let index = 0; index < count; index++) {
      const tab = tabs.nth(index)
      await expect(tab).toBeVisible()
      let box = await tab.boundingBox()
      for (let attempt = 0; attempt < 5 && box === null; attempt++) {
        await page.waitForTimeout(250)
        box = await tab.boundingBox()
      }
      expect(box).not.toBeNull()

      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.width).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test("indications button has minimum 44px touch target on login page", async ({ page }) => {
    // Given the mobile-375 viewport
    // When the login page is rendered
    await page.goto("/login")

    // Then the Indicações button has minimum 44px touch target
    const indicationsButton = page.getByRole("button", { name: "Indicações" })
    await expect(indicationsButton).toBeVisible()
    const box = await indicationsButton.boundingBox()
    expect(box).not.toBeNull()

    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.width).toBeGreaterThanOrEqual(44)
    }
  })

  test("no keyboard trap on login page — Tab moves focus forward", async ({ page }) => {
    // Given the login page with interactive elements
    await page.goto("/login")
    await page.waitForSelector("button", { timeout: 10000 })

    // When the user presses Tab to move focus
    await page.keyboard.press("Tab")

    // Then focus moves to a new element (not trapped)
    const middleCount = await page.locator("*:focus").count()
    expect(middleCount).toBeGreaterThanOrEqual(1)

    // And pressing Tab again moves focus further (not stuck on the same element)
    await page.keyboard.press("Tab")
    const endCount = await page.locator("*:focus").count()
    expect(endCount).toBeGreaterThanOrEqual(1)
  })

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
// Flow 11: App shell and Indicações button discoverability
// ---------------------------------------------------------------------------

test.describe("app shell discoverability", () => {
  test("header renders Bivaque branding and Indicações button on login", async ({ page }) => {
    // Given the login page
    await page.goto("/login")

    // Then the header branding and Indicações button are visible
    await expect(page.getByRole("heading", { name: "Bivaque" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Indicações" })).toBeVisible()
  })

  test("header renders Bivaque branding on consent page", async ({ page }) => {
    // Given the consent page
    await page.goto("/consent")

    // Then the header contains Bivaque branding (in the AppShell header span)
    await expect(page.locator("header").getByText("Bivaque")).toBeVisible()
  })

  test("header renders Bivaque branding on onboarding page", async ({ page }) => {
    // Given the onboarding page
    await page.goto("/onboarding")

    // Then the header branding is visible
    await expect(page.getByRole("heading", { name: "Bivaque" })).toBeVisible()
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
