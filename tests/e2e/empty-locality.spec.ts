import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { encodeAuthCookieValue } from "./helpers/session"

// P0 Task 9 Step 4: honest empty state for localities that are just starting.
//
// BIVAQUE.md §3.4 says a feed needs 30 to 40 weekly active members to stop
// looking deserted; below that, an empty surface must say "você é dos primeiros
// aqui" instead of "nenhuma publicação" — the second sentence describes a quiet
// room, not a beginning. The implementation branches on the locality member
// count via lib/locality-density.ts (`STALE_LOCALITY_THRESHOLD = 30`).
//
// This spec proves the property end-to-end: a member in a locality with fewer
// than 30 members sees the honest empty state on feed, events and guide, with
// an action path forward ("Publicar" / "Criar evento"), and **does not** see
// the standard "nenhuma ..." copy that would describe a quiet room.
//
// The spec needs a second-locality seed account whose locality has fewer than
// 30 members. Task 10 Step 3 adds the second locality to the seed; until then
// the spec is committed without execution, which the plans README documents as
// the honest state for E2E that needs a seeded database.
//
// `import.meta.dirname` cannot be used here: Playwright transpiles specs to
// CJS, and the emitted `require` blows up as "require is not defined in ES
// module scope" at load time, aborting collection for the whole suite. All
// paths resolve from `process.cwd()`, which Playwright always sets to the
// repo root.

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"

// Second-locality seed account whose locality has fewer than 30 members — the
// §3.4 threshold. The seed does not carry a second locality yet (Task 10
// Step 3 adds it). These env vars let the operator point the spec at a
// second seeded account without touching the spec.
const EMPTY_LOCALITY_EMAIL =
  process.env["BIVAQUE_E2E_EMPTY_LOCALITY_EMAIL"] ?? "membro-vazia@bivaque.example.invalid"

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
// parametrised by account so the spec can sign in as the second-locality user.
async function signInAs(page: Page, email: string): Promise<void> {
  const { anonKey, password } = requireCredentials()

  const api = page.context().request
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    throw new Error(
      `Password grant for ${email} failed with ${response.status()}. Is the local Supabase stack running and seeded with a second locality?`,
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
// Below the §3.4 threshold: the empty state is honest, not quiet-room
// ---------------------------------------------------------------------------

test.describe("locality below the §3.4 density threshold: honest empty state", () => {
  test("feed renders the honest empty state with an action path", async ({ page }) => {
    // Given a member whose locality has fewer than 30 members
    await signInAs(page, EMPTY_LOCALITY_EMAIL)

    // When they open the feed
    await page.goto(`${APP_URL}/community`, { waitUntil: "load" })

    // Then the honest copy is rendered instead of "Nenhuma publicação ainda"
    await expect(page.getByText("Você é dos primeiros aqui.")).toBeVisible({ timeout: 15000 })

    // And the standard quiet-room copy is **not** rendered — that would
    // describe a quiet room, not a beginning, and is the failure this spec
    // exists to catch.
    await expect(page.getByText("Nenhuma publicação ainda")).toHaveCount(0)

    // And the action path (Publicar) is rendered, so the member can be the
    // first instead of staring at a blank room
    await expect(page.getByRole("button", { name: "Publicar" }).first()).toBeVisible()
  })

  test("events renders the honest empty state with an action path", async ({ page }) => {
    // Given a member whose locality has fewer than 30 members
    await signInAs(page, EMPTY_LOCALITY_EMAIL)

    // When they open the events page
    await page.goto(`${APP_URL}/events`, { waitUntil: "load" })

    // Then the events heading is visible
    await expect(page.getByRole("heading", { name: "Eventos" })).toBeVisible({ timeout: 15000 })

    // And the honest empty state is rendered
    await expect(page.getByText("Você é dos primeiros aqui.")).toBeVisible()

    // And the standard "Nenhum evento ainda" copy is not rendered
    await expect(page.getByText("Nenhum evento ainda")).toHaveCount(0)

    // And the action path (Criar evento) is rendered
    await expect(page.getByRole("button", { name: "Criar evento" }).first()).toBeVisible()
  })

  test("guide renders the honest empty state without a fake action", async ({ page }) => {
    // Given a member whose locality has fewer than 30 members
    await signInAs(page, EMPTY_LOCALITY_EMAIL)

    // When they open the guide
    await page.goto(`${APP_URL}/guide`, { waitUntil: "load" })

    // Then the guide heading is visible
    await expect(page.getByRole("heading", { name: "Guia de chegada" })).toBeVisible({
      timeout: 15000,
    })

    // And the honest empty state is rendered
    await expect(page.getByText("Você é dos primeiros aqui.")).toBeVisible()

    // And the standard "O guia desta cidade está vazio." copy is not rendered
    await expect(page.getByText("O guia desta cidade está vazio.")).toHaveCount(0)

    // And there is no action button — suggestions do not enter the public
    // guide directly; the operator curates from indications as F arrives.
    // The empty state must not pretend otherwise. Scoped to <main>: the
    // global AppShell header carries a "Criar publicação" button outside the
    // page content, which must not count here.
    await expect(
      page.getByRole("main").getByRole("button", { name: /sugerir|criar|adicionar/i }),
    ).toHaveCount(0)
  })

  test("the empty state is not a blank page or an error message", async ({ page }) => {
    // Given a member whose locality has fewer than 30 members
    await signInAs(page, EMPTY_LOCALITY_EMAIL)

    // When they open the feed
    await page.goto(`${APP_URL}/community`, { waitUntil: "load" })

    // Then the page is interactive
    await expect(page.getByRole("button", { name: "Publicar" }).first()).toBeVisible({
      timeout: 15000,
    })

    // And there is no error banner — the empty state must not look like a
    // failure to the member; the absence of content is the locality's state,
    // not the app's
    await expect(page.getByText(/erro|error/i)).toHaveCount(0)
  })
})
