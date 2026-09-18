import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { CURRENT_CONSENT, encodeAuthCookieValue } from "./helpers/session"

// P0 Task 7 Step 4: two-locality end-to-end.
//
// ADR-20260816-national-localities decision 6: feeds, events, guide and other
// geographically-scoped surfaces must derive the locality from the member's
// real state, never from a pilot constant. This spec proves the property the
// refactor was meant to preserve: two authenticated members in two different
// localities each see only their own city's content, and neither sees the
// other's. The negative assertion is the one that proves the change did not
// open a cross-city leak.
//
// It also covers acceptance criterion 2 of issue #20: an eligible member in a
// second locality completes onboarding without going through the geographic
// waitlist — the two-phase admission (Task 4) routes them to the locality
// step instead.
//
// Credentials are sourced from the environment or apps/web/.env.local — never
// inlined. The second locality's seed account is parameterised so the spec
// can run as soon as the seed carries a second locality (Task 10 Step 3).
// Until then the spec is committed without execution, which the plans README
// documents as the honest state for E2E that needs a seeded database.
//
// `import.meta.dirname` cannot be used here: Playwright transpiles specs to
// CJS, and the emitted `require` blows up as "require is not defined in ES
// module scope" at load time, aborting collection for the whole suite. All
// paths resolve from `process.cwd()`, which Playwright always sets to the
// repo root.

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"

// Manaus seed account — the same one tests/e2e/helpers/session.ts reads.
const MANAUS_EMAIL = process.env["USER_EMAIL"] ?? "visual@bivaque.example.invalid"

// Manaus account that belongs to a community (Vila Ajuricaba) — needed for
// the /community feed test specifically; see its inline comment.
const VILA_OWNER_EMAIL = "dono-vila@bivaque.example.invalid"

// Second-locality seed account. The seed does not carry a second locality yet
// (Task 10 Step 3 adds it). These env vars let the operator point the spec at
// a second seeded account and locality heading without touching the spec.
const SECOND_LOCALITY_EMAIL =
  process.env["BIVAQUE_E2E_LOCALITY_TWO_EMAIL"] ?? "membro-rio@bivaque.example.invalid"

// Verified-without-membership account for the onboarding path. The two-phase
// admission (Task 4) makes this a real state; the seed needs an account in it
// for this test to run green.
const VERIFIED_NO_MEMBERSHIP_EMAIL =
  process.env["BIVAQUE_E2E_VERIFIED_NO_MEMBERSHIP_EMAIL"] ??
  "verified-no-membership@bivaque.example.invalid"

// Manaus-specific seed content used as cross-city leak markers. The second
// locality must not see these — if it does, the feed/events/guide is still
// scoped to a pilot constant instead of the member's locality. The community
// page heading cannot anchor locality (it shows the primary community name,
// with "Manaus, AM" only as a fallback), so content markers carry the proof.
// Texto-base real de um post do seed (supabase/seed.sql L516, renderizado nos
// ~33 posts de Manaus). O marcador anterior ("Alguém sabe se funciona também
// no feriado?") só existia em comments e nunca aparecia no feed — o teste
// positivo falhava e o negativo passava por vacuidade.
const MANAUS_POST_MARKER =
  "A feira do fim de semana abriu mais cedo e estava tranquila na primeira hora."
const MANAUS_EVENT_TITLE = "Torneio amistoso de futebol"
const MANAUS_GUIDE_ENTRY = "Escola Modelo do Centro"

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
async function signInAs(page: Page, email: string): Promise<void> {
  const { anonKey, password } = requireCredentials()

  const api = page.context().request
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    throw new Error(
      `Password grant for ${email} failed with ${response.status()}. Is the local Supabase stack running and seeded with two localities?`,
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
}

// ---------------------------------------------------------------------------
// Group 1: two localities — feed, events and guide are scoped to the city
// ---------------------------------------------------------------------------

test.describe("two localities: each member sees only their own city", () => {
  test("Manaus member sees Manaus feed content", async ({ page }) => {
    // Given a member whose current locality is Manaus AND who belongs to a
    // community — /community's feed_community RPC only runs when the viewer
    // has a primary community (apps/web/app/(shell)/community/page.tsx:101,
    // "Onda E Task 2"); without one the route renders <CityReference/>
    // instead, so MANAUS_EMAIL (visual@, deliberately community-less per
    // vila-home.spec.ts) can never see feed content here regardless of what
    // marker text exists in the seed. dono-vila@ (Vila Ajuricaba's owner,
    // see community-batch-approval.spec.ts's header) does have one — found
    // running the E2E realignment.
    await signInAs(page, VILA_OWNER_EMAIL)

    // When they open the community feed
    await page.goto(`${APP_URL}/community`, { waitUntil: "load" })

    // Then the page is interactive (load control — without it the negative
    // assertions in the sibling test could pass vacuously on an error page)
    await expect(page.getByRole("button", { name: "Publicar" })).toBeVisible({
      timeout: 15000,
    })

    // And seeded Manaus post content is rendered for them
    await expect(page.getByText(MANAUS_POST_MARKER).first()).toBeVisible({
      timeout: 15000,
    })
  })

  test("second-locality member sees no Manaus feed or event content", async ({ page }) => {
    // Given a member whose current locality is the second seeded city
    await signInAs(page, SECOND_LOCALITY_EMAIL)

    // When they open the community feed
    await page.goto(`${APP_URL}/community`, { waitUntil: "load" })

    // Then the page is interactive for them too
    await expect(page.getByRole("button", { name: "Publicar" })).toBeVisible({
      timeout: 15000,
    })

    // And no Manaus post content is on the page — the feed must resolve from
    // the member's locality, not a pilot constant.
    await expect(page.getByText(MANAUS_POST_MARKER)).toHaveCount(0)

    // And no Manaus event title leaks through the right rail or anywhere else
    await expect(page.getByText(MANAUS_EVENT_TITLE)).toHaveCount(0)
  })

  test("Manaus member sees Manaus events, not a cross-city leak", async ({ page }) => {
    // Given a Manaus member
    await signInAs(page, MANAUS_EMAIL)

    // When they open the events page
    await page.goto(`${APP_URL}/events`, { waitUntil: "load" })

    // Then the events heading is visible
    await expect(page.getByRole("heading", { name: "Eventos" })).toBeVisible({ timeout: 15000 })
  })

  test("second-locality member does not see Manaus event titles", async ({ page }) => {
    // Given a second-locality member
    await signInAs(page, SECOND_LOCALITY_EMAIL)

    // When they open the events page
    await page.goto(`${APP_URL}/events`, { waitUntil: "load" })

    // Then the events heading is visible for their own locality
    await expect(page.getByRole("heading", { name: "Eventos" })).toBeVisible({ timeout: 15000 })

    // And a Manaus-specific event title is not on the page. The events page
    // must scope to the member's locality; a Manaus event surfacing for a
    // second-locality member is the leak this test exists to catch.
    await expect(page.getByText(MANAUS_EVENT_TITLE)).toHaveCount(0)
  })

  test("Manaus member sees the Manaus guide entries", async ({ page }) => {
    // Given a Manaus member
    await signInAs(page, MANAUS_EMAIL)

    // When they open the guide
    await page.goto(`${APP_URL}/guide`, { waitUntil: "load" })

    // Then the guide heading is visible
    await expect(page.getByRole("heading", { name: "Guia de chegada" })).toBeVisible({
      timeout: 15000,
    })

    // And a Manaus guide entry is visible — positive proof the guide renders
    // for the member's own locality.
    //
    // Escopado à seção "Referências por assunto": desde a reconstrução da
    // tela (RECON-008) o nome de cada entrada aparece duas vezes na página,
    // uma no card da lista e outra em "Atualizados recentemente". Um
    // getByText de página inteira resolve para dois nós e estoura o strict
    // mode antes de chegar a asserção. O que este teste prova continua o
    // mesmo: uma entrada da MINHA cidade é renderizada na listagem.
    const referencias = page.locator('section[aria-labelledby="guia-referencias-titulo"]')
    await expect(referencias.getByText(MANAUS_GUIDE_ENTRY)).toBeVisible({ timeout: 15000 })
  })

  test("second-locality member does not see Manaus guide entries", async ({ page }) => {
    // Given a second-locality member
    await signInAs(page, SECOND_LOCALITY_EMAIL)

    // When they open the guide
    await page.goto(`${APP_URL}/guide`, { waitUntil: "load" })

    // Then the guide heading is visible for their own locality
    await expect(page.getByRole("heading", { name: "Guia de chegada" })).toBeVisible({
      timeout: 15000,
    })

    // And a Manaus guide entry is not on the page. The guide must scope to
    // the member's locality; a Manaus entry surfacing for a second-locality
    // member is the leak this test exists to catch.
    await expect(page.getByText(MANAUS_GUIDE_ENTRY)).toHaveCount(0)
  })
})

// ---------------------------------------------------------------------------
// Group 2: eligible second-locality onboarding — no geographic waitlist
// ---------------------------------------------------------------------------

test.describe("eligible second-locality onboarding: no geographic waitlist", () => {
  test("verified member without membership is routed to the locality step, not the waitlist", async ({
    page,
  }) => {
    // Given a verified member who has not chosen a locality yet. The
    // two-phase admission (Task 4) makes this a real state: eligibility is
    // confirmed, but no membership exists. The seed needs an account in
    // this state for the test to run green.
    await signInAs(page, VERIFIED_NO_MEMBERSHIP_EMAIL)

    // When they hit the onboarding status page
    await page.goto(`${APP_URL}/onboarding/status`, { waitUntil: "load" })

    // Then they are redirected to the post-eligibility locality step, not
    // the waitlist. This is the acceptance criterion 2 of issue #20: an
    // eligible member joins their own locality, no geographic waitlist.
    await page.waitForURL(/\/onboarding\/locality/, { timeout: 10000 })

    // And the locality chooser is rendered
    await expect(
      page.getByRole("heading", { name: "Qual cidade você quer explorar?" }),
    ).toBeVisible()

    // And the geographic waitlist form is NOT rendered on the eligible path
    await expect(page.getByRole("button", { name: "Entrar na lista de espera" })).toHaveCount(0)
    await expect(page.getByText("Entrar na lista de espera de outras localidades")).toHaveCount(0)
  })

  test("the locality step offers the catalog, not the waitlist form", async ({ page }) => {
    // Given a verified member at the locality step
    await signInAs(page, VERIFIED_NO_MEMBERSHIP_EMAIL)

    // When they open the locality step directly
    await page.goto(`${APP_URL}/onboarding/locality`, { waitUntil: "load" })

    // Then the locality chooser heading is visible
    await expect(
      page.getByRole("heading", { name: "Qual cidade você quer explorar?" }),
    ).toBeVisible({
      timeout: 15000,
    })

    // A tela foi redesenhada na reconstrução: saíram os dois Select (UF e
    // cidade) e entrou um SearchField que filtra a lista de cidades do catálogo,
    // com a lista rotulada "Cidades disponíveis". O spec continuava procurando
    // o accname composto do Select antigo ("Selecione o estado Estado"), que
    // não existe mais — por isso falhava com "element not found".
    await expect(page.getByLabel("Buscar cidade")).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole("list", { name: "Cidades disponíveis" })).toBeVisible({
      timeout: 15000,
    })

    // And the waitlist entry point is not on this page — the eligible path
    // never offers the geographic waitlist.
    await expect(page.getByRole("button", { name: /lista de espera/ })).toHaveCount(0)
  })
})
