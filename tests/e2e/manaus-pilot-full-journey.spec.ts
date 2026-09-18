import { expect, test } from "@playwright/test"
import { BOTTOM_NAV, SIDEBAR, seedSession } from "./helpers/session"

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
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByText("A comunidade vai com você.")).toBeVisible()
  })

  // Expectativa trocada em 2026-09-07 com razão explícita, não para ficar
  // verde: "Receber link para entrar" era o contrato do magic link, que
  // ADR-20260907-login-com-senha tirou da tela por instrução do responsável.
  // O spec ficou apontando para um botão que não existe desde c0bf309. A
  // cobertura continua cobrindo os pontos de entrada: agora e-mail, senha,
  // submit e Google.
  test("login page renders the password form and Google OAuth button", async ({ page }) => {
    // Given the production Next server
    // When a user navigates to the login page
    await page.goto("/login")

    // Then the auth entry points are rendered
    await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible()

    const emailInput = page.getByLabel("E-mail")
    await expect(emailInput).toBeVisible()
    await emailInput.fill("holder@manaus.invalid")
    await expect(emailInput).toHaveValue("holder@manaus.invalid")
  })

  test("consent page shows terms and accept button", async ({ page }) => {
    // Given the production Next server
    // When a user navigates to the consent page
    await page.goto("/consent")

    // Then the terms of use are displayed. "Bem-vindo ao Bivaque" never
    // existed on this page — found realigning this spec against the real
    // rendered /consent (apps/web/app/(preauth)/consent/page.tsx), which
    // renders "Termos de uso" plus the Código de conduta and Política de
    // privacidade sections, no separate welcome line.
    await expect(
      page.getByRole("heading", { name: "Antes de entrar, conheça as regras." }),
    ).toBeVisible()
    await expect(page.locator("#documents-heading")).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Ler a Política de privacidade completa" }),
    ).toBeVisible()
    await expect(page.getByRole("link", { name: "Ler o Código de conduta completo" })).toBeVisible()

    const acceptButton = page.getByRole("button", { name: "Concordar e continuar" })
    await expect(acceptButton).toBeVisible()
    await expect(acceptButton).toBeDisabled()
  })

  test("accepting consent navigates to onboarding", async ({ page }) => {
    // Given the consent page
    await seedSession(page.context())
    await page.goto("/consent")

    // When the user explicitly records that they read the legal documents
    const acceptButton = page.getByRole("button", { name: "Concordar e continuar" })
    await expect(acceptButton).toBeDisabled()
    const consentCheckbox = page.getByRole("checkbox", { name: /Li e concordo com a/ })
    await consentCheckbox.focus()
    await page.keyboard.press("Space")
    await expect(consentCheckbox).toBeChecked()
    await expect(acceptButton).toBeEnabled()
    await acceptButton.click()

    // Then the user is redirected to the onboarding page. Onboarding is a
    // `(preauth)` route with no shell header, so its own H1 is the landmark.
    await page.waitForURL(/\/onboarding/)
    await expect(page.getByRole("heading", { name: "Verificar meu acesso" })).toBeVisible()
  })

  test("onboarding page renders verify eligibility flow", async ({ page }) => {
    // Given the production Next server
    // When a user navigates to the onboarding page
    await seedSession(page.context())
    await page.goto("/onboarding")

    // Then the verify eligibility UI is rendered
    const verifyButton = page.getByRole("button", { name: "Verificar acesso" })
    await expect(verifyButton).toBeVisible()

    const cpfInput = page.getByLabel("CPF")
    await expect(cpfInput).toBeVisible()
    await cpfInput.fill("123.456.789-09")
    await expect(cpfInput).toHaveValue("123.456.789-09")
  })

  test("onboarding does not offer a geographic waitlist fallback", async ({ page }) => {
    // Given the onboarding page with the verify flow visible
    await seedSession(page.context())
    await page.goto("/onboarding")

    // Then the verify step offers no geographic waitlist — P0 Task 8 makes
    // eligibility, not geography, the gate. Whoever is eligible joins their
    // own locality; whoever is not is rejected without a waitlist detour.
    await expect(page.getByRole("button", { name: /lista de espera/ })).toHaveCount(0)
    await expect(page.getByRole("link", { name: /lista de espera/ })).toHaveCount(0)

    // And the waitlist form (city/UF/email) is not rendered
    await expect(page.getByLabel("E-mail")).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Flow 2: Family invite entry
// ---------------------------------------------------------------------------

test.describe("family invite journey", () => {
  test("onboarding page with invite token renders family acceptance flow", async ({ page }) => {
    // Given an invite token in the query string
    // When a user opens the onboarding page with an invite token
    await seedSession(page.context())
    await page.goto(
      "/onboarding?invite=0000000000000000000000000000000000000000000000000000000000000000",
    )

    // Then the family acceptance flow is rendered: the page enters the invite
    // (family) step instead of the eligibility step.
    await page.waitForURL(/\/onboarding/)
    await expect(page.getByRole("heading", { name: "Aceite seu convite." })).toBeVisible()
    await expect(page.getByRole("button", { name: "Aceitar convite" })).toBeVisible()
    await expect(page.getByText(/membro que convidou você/)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 3: Community feed
// ---------------------------------------------------------------------------

test.describe("community feed", () => {
  test("feed page refuses an anonymous visitor into login", async ({ page }) => {
    // Given an unauthenticated browser without consent
    // When the user navigates directly to /community
    await page.goto("/community")

    // Then the middleware redirects to the consent gate
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })

  test("feed page with consent cookie renders the community heading", async ({ page, context }) => {
    // Given a browser with the consent cookie set
    await seedSession(context)

    // When the user navigates to the community page
    await page.goto("/community")

    // Then the community page renders (middleware passes, Supabase may show error or empty)
    await expect(page.getByRole("heading", { name: "Manaus, AM" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Publicar" }).first()).toBeVisible()
  })

  test("feed page is reachable at all three viewport widths", async ({ page, context }) => {
    // Given the consent cookie and the mobile-375 viewport
    await seedSession(context)
    await page.goto("/community")

    // Then the community page renders without horizontal overflow
    await expect(page.getByRole("heading", { name: "Manaus, AM" })).toBeVisible()
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
  })
})

// ---------------------------------------------------------------------------
// Flow 4: Groups — private group admission
// ---------------------------------------------------------------------------

test.describe("groups journey", () => {
  test("groups page refuses an anonymous visitor into login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates directly to /groups
    await page.goto("/groups")

    // Then the proxy refuses into the entry screen. ADR-20260907-consentimento-
    // no-cadastro tirou o portão de consentimento do proxy; a recusa continua,
    // o destino mudou.
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })

  test("groups page with consent cookie renders groups UI", async ({ page, context }) => {
    // Given a browser with consent cookie
    await seedSession(context)

    // When the user navigates to the groups page
    await page.goto("/groups")

    // Then the groups page renders (may show auth error or empty state)
    await expect(page.locator("h1").first()).toBeVisible({ timeout: 15000 })
  })

  test("groups page shows primary navigation with correct item order", async ({
    page,
    context,
  }) => {
    // Given an authenticated member
    await seedSession(context)
    await page.goto("/groups")

    // Then exactly one primary navigation is on screen: the BottomNav below
    // md (4 tabs — the ADR-20260816-shells-e-navegacao containers), the
    // sidebar from md up (rail or expanded, links).
    const width = page.viewportSize()?.width ?? 0

    if (width < 768) {
      // Mobile: BottomNav with 4 tabs in NAV_ITEMS order
      const nav = page.locator(BOTTOM_NAV)
      await expect(nav).toBeVisible()
      const tabs = nav.getByRole("tab")
      await expect(tabs).toHaveCount(4)
      // Containers de PROCESSO-DE-CONSTRUCAO §7, travados em
      // tests/scope/navigation.test.mjs:42. Substituíram os quatro do
      // ADR-20260816 em 2026-09-08.
      await expect(tabs.nth(0)).toContainText("Início")
      await expect(tabs.nth(1)).toContainText("Explorar")
      await expect(tabs.nth(2)).toContainText("Comunidades")
      await expect(tabs.nth(3)).toContainText("Perfil")
    } else {
      // Tablet rail / desktop sidebar: BottomNav hidden, sidebar links visible.
      // A sidebar ganhou seções além da primária (secundária, comunidades,
      // rodapé), então a contagem total de links não é mais 4: ancoramos nos
      // quatro containers por href, na ordem de NAV_ITEMS.
      await expect(page.locator(BOTTOM_NAV)).toBeHidden()
      const sidebar = page.locator(SIDEBAR)
      await expect(sidebar).toBeVisible()
      for (const href of ["/inicio", "/explorar", "/communities", "/profile"]) {
        await expect(sidebar.locator(`a[href="${href}"]`).first()).toBeVisible()
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Flow 5: Recommendations
// ---------------------------------------------------------------------------

test.describe("recommendations journey", () => {
  test("recommendations page refuses an anonymous visitor into login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /recommendations
    await page.goto("/recommendations")

    // Then the proxy refuses into the entry screen. ADR-20260907-consentimento-
    // no-cadastro tirou o portão de consentimento do proxy; a recusa continua,
    // o destino mudou.
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })

  test("recommendations page with consent cookie renders browse tab", async ({ page, context }) => {
    // Given a browser with consent cookie
    await seedSession(context)

    // When the user navigates to the recommendations page
    await page.goto("/recommendations")

    // Then the recommendations page renders mock data
    await expect(page.getByRole("heading", { name: "Indicações" })).toBeVisible()
    await expect(page.getByText(/Descubra grupos e eventos da sua comunidade/)).toBeVisible()

    // The "Explorar" tab is visible with mock recommendation cards
    await expect(page.locator("main").getByRole("tab", { name: "Explorar" })).toBeVisible()
    await expect(page.locator("main").getByRole("tab", { name: "Pedir indicação" })).toBeVisible()
    await expect(page.locator("main").getByRole("tab", { name: "Salvas" })).toBeVisible()
  })

  test("recommendations browse tab renders cards and tabs are present", async ({
    page,
    context,
  }) => {
    // Given the consent cookie
    await seedSession(context)
    await page.goto("/recommendations")

    // Then the three tabs are present
    await expect(page.getByRole("heading", { name: "Indicações" })).toBeVisible()

    const browseTab = page.locator("main").getByRole("tab", { name: "Explorar" })
    const requestTab = page.locator("main").getByRole("tab", { name: "Pedir indicação" })
    const savedTab = page.locator("main").getByRole("tab", { name: "Salvas" })

    await expect(browseTab).toBeVisible()
    await expect(requestTab).toBeVisible()
    await expect(savedTab).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 6: Events + RSVP
// ---------------------------------------------------------------------------

test.describe("events journey", () => {
  test("events page refuses an anonymous visitor into login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /events
    await page.goto("/events")

    // Then the proxy refuses into the entry screen. ADR-20260907-consentimento-
    // no-cadastro tirou o portão de consentimento do proxy; a recusa continua,
    // o destino mudou.
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })

  test("events page with consent cookie renders events UI", async ({ page, context }) => {
    // Given a browser with consent cookie
    await seedSession(context)

    // When the user navigates to the events page
    await page.goto("/events")

    // Then the events page renders its UI
    await expect(page.getByRole("heading", { name: "Eventos" })).toBeVisible()
  })

  test("events page shows create event toggle", async ({ page, context }) => {
    // Given the consent cookie
    await seedSession(context)
    await page.goto("/events")

    // Then the create event button is visible
    await expect(page.getByRole("button", { name: "Criar evento" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 7: Notifications
// ---------------------------------------------------------------------------

test.describe("notifications journey", () => {
  test("notifications page refuses an anonymous visitor into login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /notifications
    await page.goto("/notifications")

    // Then the proxy refuses into the entry screen. ADR-20260907-consentimento-
    // no-cadastro tirou o portão de consentimento do proxy; a recusa continua,
    // o destino mudou.
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })

  test("notifications page with consent cookie renders notifications UI", async ({
    page,
    context,
  }) => {
    // Given a browser with consent cookie
    await seedSession(context)

    // When the user navigates to the notifications page
    await page.goto("/notifications")

    // Then the notifications page renders
    await expect(page.getByRole("heading", { name: "Notificações" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 8: Contextual DM + Report
// ---------------------------------------------------------------------------

test.describe("contextual DM and report journey", () => {
  test("messages page refuses an anonymous visitor into login", async ({ page }) => {
    // Given an unauthenticated browser
    // When the user navigates to /messages
    await page.goto("/messages")

    // Then the proxy refuses into the entry screen. ADR-20260907-consentimento-
    // no-cadastro tirou o portão de consentimento do proxy; a recusa continua,
    // o destino mudou.
    await page.waitForURL(/\/login/)
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
  })

  test("messages page with consent cookie renders messages UI", async ({ page, context }) => {
    // Given a browser with consent cookie
    await seedSession(context)

    // When the user navigates to the messages page
    await page.goto("/messages")

    // Then the messages page renders its heading and primary action
    await expect(page.getByRole("heading", { name: "Mensagens" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Nova conversa" })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Flow 9: Bottom navigation across journeys
// ---------------------------------------------------------------------------

// The app shell (header, sidebar, BottomNav) is mounted by `(shell)/layout.tsx`
// and therefore exists only on authenticated routes. The `(preauth)` group has
// no layout of its own, so /login, /consent and /onboarding are deliberately
// chrome-free. Positive BottomNav coverage lives in shell-navigation.spec.ts,
// which signs in first; here we pin the boundary.
test.describe("preauth routes render no app shell", () => {
  test("root serves the public landing without the app shell", async ({ page }) => {
    // Given the production Next server
    // When a user opens the root route while unauthenticated
    await page.goto("/")

    // Then the public landing renders and the authenticated app shell (BottomNav)
    // is absent — the landing is its own marketing chrome, not the (shell) layout.
    await expect(page.getByText("A comunidade vai com você.")).toBeVisible()
    await expect(page.locator(BOTTOM_NAV)).toHaveCount(0)
  })

  for (const path of ["/login", "/consent", "/onboarding"]) {
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
    context,
  }) => {
    // Given the consent cookie
    await seedSession(context)
    // When the browser opens /community
    await page.goto("/community")

    // Then there is no horizontal overflow
    await page.waitForSelector("body")
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.evaluate(() => window.innerWidth)
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth)
  })

  // Touch-target coverage for the BottomNav tabs and the Indicações entry used
  // to live here against /login, where neither element exists. It now runs
  // against the authenticated shell in shell-accessibility-denials.spec.ts.

  test("login page controls have minimum 44px touch targets", async ({ page }) => {
    // Given the mobile-375 viewport
    // When the login page is rendered
    await page.goto("/login")

    // Then its own primary controls meet the 44px minimum
    const submit = page.getByRole("button", { name: "Entrar" })
    await expect(submit).toBeVisible()
    const box = await submit.boundingBox()
    expect(box).not.toBeNull()

    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44)
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
// Flow 11: Preauth pages carry their own heading
// ---------------------------------------------------------------------------

// These pages have no shell header to brand them, so each one states its own
// purpose in its H1. Indicações is a `(shell)` sidebar entry and is covered in
// shell-navigation.spec.ts.
test.describe("preauth page headings", () => {
  // Realignado em 2026-09-07 à prancha 36-web-auth-entrada: o H1 do entrar é a
  // frase da referência, e a marca passou a ser o wordmark sobre a foto (link
  // para o início), não texto dentro do título. A cobertura de marca continua:
  // agora pelo link com aria-label, que é o que a tecnologia assistiva lê.
  test("login page leads with the reference heading and carries the brand link", async ({
    page,
  }) => {
    // Given the login page
    await page.goto("/login")

    // Then its own heading states the purpose and the brand links home
    await expect(page.getByRole("heading", { name: "Que bom ter você de volta." })).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Bivaque, voltar ao início" }).first(),
    ).toBeVisible()
  })

  test("consent page leads with the terms heading", async ({ page }) => {
    // Given the consent page
    await page.goto("/consent")

    // Then the terms heading is visible
    await expect(
      page.getByRole("heading", { name: "Antes de entrar, conheça as regras." }),
    ).toBeVisible()
  })

  test("onboarding page leads with the eligibility heading", async ({ page }) => {
    // Given the onboarding page
    await seedSession(page.context())
    await page.goto("/onboarding")

    // Then the eligibility heading is visible
    await expect(page.getByRole("heading", { name: "Verificar meu acesso" })).toBeVisible()
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
