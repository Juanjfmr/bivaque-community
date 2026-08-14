import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"

// Group and event detail pages (wave A, task 3): the pages read through the
// authenticated client so RLS decides what is visible, and a null row is a
// 404. These specs assert the boundary for private group 6 ("Mães da
// Cidade"): an approved member sees the member list; a locality member who is
// not in the group still sees the metadata (a group must be discoverable for
// someone to request to join) but no member names; an authenticated outsider
// without locality membership gets 404. Events repeat the member/outsider
// pair. Seed identities are public and disposable by design
// (supabase/seed.sql).

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
const CURRENT_CONSENT = "1"

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

  const session = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at,
    expires_in: body.expires_in,
    token_type: body.token_type,
    user: { email },
  }
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
    { name: `sb-${projectRef}-auth-token`, value: JSON.stringify(session), ...shared },
    { name: CONSENT_COOKIE, value: CURRENT_CONSENT, ...shared },
  ])
}

test.describe("group detail: RLS decides, not the page", () => {
  test("approved member of the private group opens it and sees the member list", async ({
    page,
  }) => {
    await signInAs(page, PRIVATE_GROUP_MEMBER_EMAIL)
    const response = await page.goto(`/groups/${PRIVATE_GROUP_ID}`)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { name: "Mães da Cidade" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Membros" })).toBeVisible()
  })

  test("locality member who is not in the private group sees metadata but no member names", async ({
    page,
  }) => {
    await signInAs(page, LOCALITY_MEMBER_EMAIL)
    const response = await page.goto(`/groups/${PRIVATE_GROUP_ID}`)

    // Metadata stays readable on purpose — a group must be discoverable for
    // someone to request to join. The leak was the member list, and the
    // group_memberships_select policy hides it for non-members.
    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { name: "Mães da Cidade" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Membros" })).toHaveCount(0)
  })

  test("authenticated outsider without locality membership gets the not-found page", async ({
    page,
  }) => {
    await signInAs(page, OUTSIDER_EMAIL)
    await page.goto(`/groups/${PRIVATE_GROUP_ID}`)

    // Next streams the shell before the page segment resolves, so the HTTP
    // status commits as 200 before notFound() fires. The security property
    // is the UI: no group content, only the not-found screen.
    await expect(page.getByText("This page could not be found.")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Mães da Cidade" })).toHaveCount(0)
  })

  test("public group opens for any locality member", async ({ page }) => {
    await signInAs(page, LOCALITY_MEMBER_EMAIL)
    const response = await page.goto(`/groups/${PUBLIC_GROUP_ID}`)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { name: "Caminhada no Mindu" })).toBeVisible()
  })
})

test.describe("event detail: RLS decides, not the page", () => {
  test("locality member opens the event", async ({ page }) => {
    await signInAs(page, LOCALITY_MEMBER_EMAIL)
    const response = await page.goto(`/events/${UPCOMING_EVENT_ID}`)

    expect(response?.status()).toBe(200)
    await expect(page.getByRole("heading", { name: "Torneio amistoso de futebol" })).toBeVisible()
  })

  test("authenticated outsider without locality membership gets the not-found page", async ({
    page,
  }) => {
    await signInAs(page, OUTSIDER_EMAIL)
    await page.goto(`/events/${UPCOMING_EVENT_ID}`)

    // Same streaming constraint as the group case: assert the UI, not the
    // status. No event content may render for someone who cannot access it.
    await expect(page.getByText("This page could not be found.")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Torneio amistoso de futebol" })).toHaveCount(0)
  })
})
