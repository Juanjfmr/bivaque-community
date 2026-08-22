import { readFileSync } from "node:fs"
import { join } from "node:path"
import type { Page } from "@playwright/test"
import { expect, test } from "@playwright/test"
import { encodeAuthCookieValue } from "./helpers/session"

// DS-035 — Locale/copy correctness.
//
// Phase 4 RUN-024 records user-visible `Pagina nao encontrada — O endereco
// que voce acessou nao existe nesta comunidade. Voltar para a comunidade`
// in `apps/web/app/components/bivaque/segment-fallbacks.tsx`. The same file
// also strips diacritics from the segment error copy. Portuguese diacritics
// are required by `DS-035` (`Trace: CUR-293 KEEP; RT-ADD-007`) — they are
// not an optional refinement. The test visits a not-found route in the
// shell and asserts the rendered copy uses correct PT-BR diacritics.
//
// `import.meta.dirname` cannot be used here: Playwright transpiles specs
// to CJS, and the emitted `require` blows up at load time. All paths
// resolve from `process.cwd()`.

const APP_URL = process.env["APP_URL"] ?? "http://127.0.0.1:3000"
const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"
const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"
const VISUAL_EMAIL = process.env["BIVAQUE_E2E_VISUAL_EMAIL"] ?? "visual@bivaque.example.invalid"

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

const NOT_FOUND_GROUP_ID = "00000000-0000-4000-8000-000000000000"

async function signInAndVisit(page: Page, url: string) {
  await signInAs(page, VISUAL_EMAIL)
  await page.goto(`${APP_URL}${url}`, { waitUntil: "load" })
  await page.waitForLoadState("networkidle")
}

test.describe("DS-035 — Portuguese diacritics in segment fallbacks", () => {
  test("/groups/<unknown> renders 'Página não encontrada' with full diacritics", async ({
    page,
  }) => {
    await signInAndVisit(page, `/groups/${NOT_FOUND_GROUP_ID}`)

    const body = page.locator("main")
    await expect(body).toBeVisible({ timeout: 15000 })
    await expect(body).toContainText("Página não encontrada")
    await expect(body).toContainText("O endereço que você acessou não existe")

    const text = (await body.textContent()) ?? ""
    expect(text).not.toMatch(/Pagina nao/)
    expect(text).not.toMatch(/endereco/)
    expect(text).not.toMatch(/voce acessou/)
    expect(text).not.toMatch(/nao existe/)
  })

  test("/events/<unknown> segment not-found also renders the diacritized title", async ({
    page,
  }) => {
    await signInAndVisit(page, `/events/${NOT_FOUND_GROUP_ID}`)

    const body = page.locator("main")
    await expect(body).toContainText("Página não encontrada", { timeout: 15000 })
  })
})
