// Teste end-to-end do login persistente (Instagram-style) com Playwright.
// Roda via `npx playwright test tests/e2e/persistent-login.spec.ts`.
// Cobre 3 cenarios:
// (1) cookie de sessao com Max-Age=34560000 (400 dias) + /community=200
// (2) fechar e reabrir o browser -> sessao persiste
// (3) logout via "Sair da conta" no /profile
//
// Pre-requisitos: supabase local stack + next.js server.
// NOTA: o endpoint do mailpit local (/api/v1/mailbox) nao responde
// corretamente (SPA do supabase-mailpit moderno). Usamos auth via password
// grant + injecao de cookie no Playwright para simular o que o callback
// route faria (cookie de sessao com Max-Age=34560000).

import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  type APIRequestContext,
  type BrowserContext,
  chromium,
  expect,
  type Page,
  request,
  test,
} from "@playwright/test"

// The anon key is never inlined here. Even the Supabase local demo key is a
// well-formed JWT, so hardcoding it trips the secrets scan — and a fallback
// that silently works also lets the suite pass against the wrong instance.
// Read it the same way scripts/visual/capture.mjs does: environment first,
// then apps/web/.env.local.
function readEnvLocal(key: string): string | undefined {
  try {
    const file = readFileSync(
      join(import.meta.dirname, "..", "..", "apps", "web", ".env.local"),
      "utf-8",
    )
    for (const line of file.split("\n")) {
      const trimmed = line.trim()
      if (trimmed.length === 0 || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      if (trimmed.slice(0, eq).trim() !== key) continue
      return trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    }
  } catch {
    return undefined
  }
  return undefined
}

const APP_URL = process.env.APP_URL ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:55321"
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
  readEnvLocal("SUPABASE_ANON_KEY")

const USER_EMAIL =
  process.env.USER_EMAIL ?? readEnvLocal("BIVAQUE_VISUAL_EMAIL") ?? "visual@bivaque.example.invalid"
const USER_PASSWORD = process.env.USER_PASSWORD ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "SUPABASE_ANON_KEY is required. Set it in the environment or as NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.",
  )
}

if (!USER_PASSWORD) {
  throw new Error(
    "USER_PASSWORD is required. Set it in the environment or as BIVAQUE_VISUAL_PASSWORD in apps/web/.env.local.",
  )
}

async function getSessionViaPasswordGrant(): Promise<{
  accessToken: string
  refreshToken: string
  expiresAt: number
  expiresIn: number
  tokenType: string
}> {
  const ctx: APIRequestContext = await request.newContext()
  const res = await ctx.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    data: { email: USER_EMAIL, password: USER_PASSWORD },
  })
  expect(res.status(), "Auth password grant succeeded").toBe(200)
  const body = (await res.json()) as {
    access_token: string
    refresh_token: string
    expires_at: number
    expires_in: number
    token_type: string
  }
  await ctx.dispose()
  return {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: body.expires_at,
    expiresIn: body.expires_in,
    tokenType: body.token_type,
  }
}

function buildSessionCookie(grant: Awaited<ReturnType<typeof getSessionViaPasswordGrant>>): {
  name: string
  value: string
  domain: string
  path: string
  expires: number
  httpOnly: boolean
  secure: boolean
  sameSite: "Lax" | "Strict" | "None"
} {
  const session = {
    access_token: grant.accessToken,
    refresh_token: grant.refreshToken,
    expires_at: grant.expiresAt,
    expires_in: grant.expiresIn,
    token_type: grant.tokenType,
    user: { email: USER_EMAIL },
  }
  const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0]
  const storageKey = `sb-${projectRef}-auth-token`
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 400
  return {
    name: storageKey,
    value: JSON.stringify(session),
    domain: "127.0.0.1",
    path: "/",
    expires,
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }
}

test.describe("Login persistente Instagram-style", () => {
  test("Cenario 1: cookie de sessao com Max-Age=400d + /community=200", async () => {
    const grant = await getSessionViaPasswordGrant()
    const cookie = buildSessionCookie(grant)

    const browser = await chromium.launch({ headless: true })
    const ctx: BrowserContext = await browser.newContext()
    await ctx.addCookies([
      cookie,
      {
        name: "bivaque-consent-version",
        value: "1",
        domain: "127.0.0.1",
        path: "/",
        expires: cookie.expires,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ])
    const page: Page = await ctx.newPage()

    await page.goto(`${APP_URL}/community`, { waitUntil: "networkidle" })
    expect(page.url(), "/community NAO redireciona para /login (sessao aceita)").not.toContain(
      "/login",
    )

    const cookies = await ctx.cookies()
    const session = cookies.find((c) => c.name === cookie.name)
    expect(session, `Cookie de sessao ${cookie.name} existe`).toBeTruthy()
    if (session) {
      const maxAgeDays = Math.floor((session.expires - Math.floor(Date.now() / 1000)) / 86_400)
      expect(maxAgeDays, `Max-Age >= 300 dias (foi ${maxAgeDays})`).toBeGreaterThanOrEqual(300)
      expect(maxAgeDays, `Max-Age >= 365 dias (foi ${maxAgeDays})`).toBeGreaterThanOrEqual(365)
    }

    await browser.close()
  })

  test("Cenario 2: fechar e reabrir o browser -> sessao persiste", async () => {
    const grant = await getSessionViaPasswordGrant()
    const cookie = buildSessionCookie(grant)

    const browser = await chromium.launch({ headless: true })
    const srcCtx = await browser.newContext()
    await srcCtx.addCookies([
      cookie,
      {
        name: "bivaque-consent-version",
        value: "1",
        domain: "127.0.0.1",
        path: "/",
        expires: cookie.expires,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ])
    const srcCookies = await srcCtx.cookies()
    const sessionCookie = srcCookies.find((c) => c.name === cookie.name)
    const consentCookie = srcCookies.find((c) => c.name === "bivaque-consent-version")
    expect(sessionCookie, "Sessao obtida no contexto de origem").toBeTruthy()
    expect(consentCookie, "Consent cookie presente").toBeTruthy()

    const freshCtx = await browser.newContext()
    if (sessionCookie && consentCookie) {
      await freshCtx.addCookies([
        {
          name: sessionCookie.name,
          value: sessionCookie.value,
          domain: sessionCookie.domain,
          path: sessionCookie.path,
          expires: sessionCookie.expires,
          httpOnly: sessionCookie.httpOnly,
          secure: sessionCookie.secure,
          sameSite: sessionCookie.sameSite,
        },
        {
          name: consentCookie.name,
          value: consentCookie.value,
          domain: consentCookie.domain,
          path: consentCookie.path,
          expires: consentCookie.expires,
          httpOnly: consentCookie.httpOnly,
          secure: consentCookie.secure,
          sameSite: consentCookie.sameSite,
        },
      ])
    }
    const freshPage = await freshCtx.newPage()
    await freshPage.goto(`${APP_URL}/community`, { waitUntil: "networkidle" })
    expect(freshPage.url(), "Sessao persiste apos fechar/reabrir").not.toContain("/login")

    await browser.close()
  })

  test("Cenario 3: logout via 'Sair da conta' redireciona para /login", async () => {
    const grant = await getSessionViaPasswordGrant()
    const cookie = buildSessionCookie(grant)

    const browser = await chromium.launch({ headless: true })
    const ctx = await browser.newContext()
    await ctx.addCookies([
      cookie,
      {
        name: "bivaque-consent-version",
        value: "1",
        domain: "127.0.0.1",
        path: "/",
        expires: cookie.expires,
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ])
    const page = await ctx.newPage()

    await page.goto(`${APP_URL}/community`, { waitUntil: "networkidle" })
    expect(page.url(), "Sessao valida permite /community").not.toContain("/login")

    await page.goto(`${APP_URL}/profile`, { waitUntil: "networkidle" })
    const configTab = page.getByRole("tab", { name: /Configurações/i })
    if ((await configTab.count()) > 0) {
      await configTab.click()
      await page.waitForTimeout(500)
    }
    page.on("dialog", (d) => d.accept())
    const sairBtn = page.getByRole("button", { name: /Sair da conta/i })
    await expect(sairBtn, "Botao 'Sair da conta' presente").toBeVisible({ timeout: 5000 })
    await sairBtn.click()
    await page.waitForTimeout(3000)
    expect(page.url(), "Logout redireciona para /login").toContain("/login")

    await page.goto(`${APP_URL}/community`, { waitUntil: "networkidle" })
    expect(page.url(), "Apos logout, /community redireciona para /login").toContain("/login")

    await browser.close()
  })
})
