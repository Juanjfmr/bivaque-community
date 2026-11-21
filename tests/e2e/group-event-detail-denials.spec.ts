import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// Group and event detail pages (wave A, task 3): the pages read through the
// authenticated client so RLS decides what is visible, and a null row is a
// 404. These specs assert the boundary for private group 6 ("Mães da
// Cidade"): an approved member sees the member list; a locality member who is
// not in the group still sees the metadata (a group must be discoverable for
// someone to request to join) but no member names; an authenticated outsider
// without locality membership gets 404. Events repeat the member/outsider
// pair. Seed identities are public and disposable by design
// (supabase/seed.sql).

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"

// Seed fixtures (supabase/seed.sql): groups 6 and 8 are private; membro-4 is
// an approved member of group 6; membro-3 is a Manaus member who is not;
// rejected@ has a valid session but no locality membership. Event 6 is a
// locality-level upcoming event every Manaus member can open.
const PRIVATE_GROUP_ID = "60000000-0000-4000-8000-000000000006"
const PUBLIC_GROUP_ID = "60000000-0000-4000-8000-000000000001"
const UPCOMING_EVENT_ID = "70000000-0000-4000-8000-000000000006"

const PRIVATE_GROUP_MEMBER_EMAIL = "membro-4@bivaque.example.invalid"
const LOCALITY_MEMBER_EMAIL = "membro-3@bivaque.example.invalid"
const OUTSIDER_EMAIL = "rejected@bivaque.example.invalid"

const CONSENT_COOKIE = "bivaque-consent-version"

function readEnvLocal(key: string): string | undefined {
  try {
    const file = readFileSync(join(process.cwd(), "apps", "web", ".env.local"), "utf-8")
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

function requireCredentials(): { anonKey: string; password: string } {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const password = process.env["USER_PASSWORD"] ?? readEnvLocal("BIVAQUE_VISUAL_PASSWORD")
  if (!anonKey) {
    throw new Error(
      "SUPABASE_ANON_KEY is required. Set it in the environment or as NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local.",
    )
  }
  if (!password) {
    throw new Error(
      "USER_PASSWORD is required. Set it in the environment or as BIVAQUE_VISUAL_PASSWORD in apps/web/.env.local.",
    )
  }
  return { anonKey, password }
}

// Mints a session with the password grant and installs the cookie pair the
// callback route would have written — same flow as tests/e2e/helpers/session.ts,
// parametrised by account so the spec can sign in as more than one seed user.
async function signInAs(page: Page, email: string): Promise<string> {
  const { anonKey, password } = requireCredentials()

  const api = page.context().request
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    throw new Error(
      `Password grant for ${email} failed with ${response.status()}. Is the local Supabase stack running and seeded?`,
    )
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
  return body.access_token
}

test.describe("group detail: RLS decides, not the page", () => {
  test("approved member can see the private group", async ({ page }) => {
    const token = await signInAs(page, PRIVATE_GROUP_MEMBER_EMAIL)
    const members = await page.request.get(
      `${SUPABASE_URL}/rest/v1/group_memberships?select=user_id&group_id=eq.${PRIVATE_GROUP_ID}&status=eq.approved`,
      {
        headers: { apikey: requireCredentials().anonKey, Authorization: `Bearer ${token}` },
      },
    )
    expect(members.status()).toBe(200)
    expect((await members.json()).length).toBeGreaterThan(0)
    const redirect = await page.request.get(`${APP_URL}/groups/${PRIVATE_GROUP_ID}`, {
      maxRedirects: 0,
    })
    expect(redirect.status()).toBe(307)
    expect(new URL(redirect.headers()["location"] ?? "", "http://127.0.0.1:3000").pathname).toBe(
      `/app/grupo/${PRIVATE_GROUP_ID}`,
    )
    await page.goto(`${APP_URL}/app/grupo/${PRIVATE_GROUP_ID}`)
    await expect(page.getByRole("heading", { name: "Mães da Cidade" })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('[data-estado-participacao="membro"]')).toBeVisible()
    await expect(page.getByText("Administrar grupo")).toHaveCount(0)
  })

  test("non-member sees private metadata but no content or member actions", async ({ page }) => {
    const token = await signInAs(page, LOCALITY_MEMBER_EMAIL)
    const members = await page.request.get(
      `${SUPABASE_URL}/rest/v1/group_memberships?select=user_id&group_id=eq.${PRIVATE_GROUP_ID}&status=eq.approved`,
      {
        headers: { apikey: requireCredentials().anonKey, Authorization: `Bearer ${token}` },
      },
    )
    expect(members.status()).toBe(200)
    expect(await members.json()).toEqual([])
    const api = await page.request.get(`${APP_URL}/api/app/grupos/${PRIVATE_GROUP_ID}`)
    expect(api.status()).toBe(200)
    expect((await api.json()).publicacoes).toEqual([])
    expect(
      (await page.request.get(`${APP_URL}/api/app/grupos/${PRIVATE_GROUP_ID}/membros`)).status(),
    ).toBe(403)
    await page.goto(`${APP_URL}/app/grupo/${PRIVATE_GROUP_ID}`)
    await expect(page.getByRole("heading", { name: "Mães da Cidade" })).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByText("O conteúdo dos grupos fechados é reservado aos membros."),
    ).toBeVisible()
    await expect(page.locator('[data-publicacao-na-lista="sim"]')).toHaveCount(0)
    await expect(page.getByText("Administrar grupo")).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Sair do grupo" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Pedir entrada" })).toBeVisible()
  })

  test("outsider cannot read the private group", async ({ page }) => {
    await signInAs(page, OUTSIDER_EMAIL)
    const api = await page.request.get(`${APP_URL}/api/app/grupos/${PRIVATE_GROUP_ID}`)
    expect(api.status()).toBe(404)
    await page.goto(`${APP_URL}/app/grupo/${PRIVATE_GROUP_ID}`)
    await expect(page.locator('[data-tela="indisponivel"]')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("heading", { name: "Mães da Cidade" })).toHaveCount(0)
  })

  test("public group opens for any locality member", async ({ page }) => {
    await signInAs(page, LOCALITY_MEMBER_EMAIL)
    const redirect = await page.request.get(`${APP_URL}/groups/${PUBLIC_GROUP_ID}`, {
      maxRedirects: 0,
    })
    expect(redirect.status()).toBe(307)
    expect(new URL(redirect.headers()["location"] ?? "", "http://127.0.0.1:3000").pathname).toBe(
      `/app/grupo/${PUBLIC_GROUP_ID}`,
    )
    await page.goto(`${APP_URL}/app/grupo/${PUBLIC_GROUP_ID}`)
    await expect(page.getByRole("heading", { name: "Caminhada no Mindu" })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('[data-ordenacao-grupo="sim"]')).toBeVisible()
    await expect(page.locator('[data-publicacao-na-lista="sim"]').first()).toBeVisible()
    await expect(page.getByText("Administrar grupo")).toHaveCount(0)
  })
})

test.describe("event detail: RLS decides, not the page", () => {
  test("locality member opens the event", async ({ page }) => {
    await signInAs(page, LOCALITY_MEMBER_EMAIL)
    const response = await page.goto(`/events/${UPCOMING_EVENT_ID}`)

    // RUN-133/F05: o endereço antigo passa pelo redirect de configuração e
    // aterra no encontro do app, com o mesmo id. A resposta final é a casca do
    // SPA (200); quem decide o conteúdo é a RLS, via API.
    expect(response?.status()).toBe(200)
    await expect(page).toHaveURL(new RegExp(`/app/evento/${UPCOMING_EVENT_ID}$`))
    await expect(page.getByRole("heading", { name: "Torneio amistoso de futebol" })).toBeVisible({
      timeout: 15000,
    })
  })

  test("authenticated outsider without locality membership gets the not-found page", async ({
    page,
  }) => {
    await signInAs(page, OUTSIDER_EMAIL)
    await page.goto(`/events/${UPCOMING_EVENT_ID}`)

    // A recusa mudou de superfície com a F05, não de dono: o portão do proxy já
    // não vê este endereço (o redirect roda antes dele), então quem recusa é a
    // RLS — a API não devolve a linha para quem não é da cidade e o app mostra
    // a tela de endereço indisponível. Nenhum conteúdo do encontro renderiza.
    await expect(page).toHaveURL(new RegExp(`/app/evento/${UPCOMING_EVENT_ID}$`))
    await expect(page.locator('[data-tela="indisponivel"]')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText("Este endereço não existe")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Torneio amistoso de futebol" })).toHaveCount(0)
  })
})
