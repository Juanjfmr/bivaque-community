// Shared session helper for specs that need the authenticated app shell.
//
// The shell (header, sidebar, BottomNav) lives only under the app's `(shell)`
// route group, and every route in it is behind the middleware session gate.
// Preauth routes (/login, /consent, /onboarding) have no layout of their own,
// so they render no shell chrome at all — a spec that wants to assert on the
// shell has to sign in first.
//
// Mailpit's local endpoint does not serve the magic-link flow reliably, so we
// mint a session with the password grant and inject the cookie the callback
// route would have written, exactly as persistent-login.spec.ts does.
//
// The cookie VALUE must be base64url-encoded ("base64-<base64url>", the
// @supabase/ssr default since this project's pinned version). A plain
// `JSON.stringify(session)` cookie is readable by this app's own SSR layouts
// (they parse cookies by hand), which is why every spec using this pattern
// still rendered the right shell — but createBrowserClient()'s session
// storage (used by every client-side write, e.g. any `.insert()` not routed
// through a Server Action) silently fails to parse it and falls back to a
// session whose `user.id` is undefined. Found closing onda T/F: any client
// write path built off `supabase.auth.getSession().data.session.user.id`
// then sends that as `null`, which RLS correctly rejects — indistinguishable
// from a real permission bug until you inspect the actual request body.

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { type BrowserContext, request } from "@playwright/test"

export function readEnvLocal(key: string): string | undefined {
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

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "http://127.0.0.1:55321"

// Resolved lazily so specs that never call seedSession() do not fail to load
// when the local env is not configured.
function requireEnv(): { anonKey: string; email: string; password: string } {
  const anonKey =
    process.env["SUPABASE_ANON_KEY"] ??
    readEnvLocal("NEXT_PUBLIC_SUPABASE_ANON_KEY") ??
    readEnvLocal("SUPABASE_ANON_KEY")
  const email =
    process.env["USER_EMAIL"] ??
    readEnvLocal("BIVAQUE_VISUAL_EMAIL") ??
    "visual@bivaque.example.invalid"
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
  return { anonKey, email, password }
}

const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"

interface PasswordGrantBody {
  access_token: string
  refresh_token: string
  expires_at: number
  expires_in: number
  token_type: string
}

/**
 * Builds the `sb-<ref>-auth-token` cookie VALUE the way @supabase/ssr's
 * createBrowserClient actually expects to read it back: base64url-encoded,
 * "base64-" prefixed, with `user` populated from the JWT's own claims (not
 * just `email`) so client-side `getSession().data.session.user.id` resolves
 * to a real uuid instead of undefined. See the file header comment for why
 * this matters even though SSR-rendered pages tolerated the plain-JSON form.
 */
export function encodeAuthCookieValue(body: PasswordGrantBody, email: string): string {
  const payloadSegment = body.access_token.split(".")[1]
  if (!payloadSegment) {
    throw new Error(`Malformed access_token for ${email}: no JWT payload segment`)
  }
  const claims = JSON.parse(Buffer.from(payloadSegment, "base64").toString("utf8")) as {
    sub: string
    aud: string
    role: string
  }
  const session = {
    access_token: body.access_token,
    refresh_token: body.refresh_token,
    expires_at: body.expires_at,
    expires_in: body.expires_in,
    token_type: body.token_type,
    user: { id: claims.sub, email, aud: claims.aud, role: claims.role },
  }
  const base64url = Buffer.from(JSON.stringify(session), "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
  return `base64-${base64url}`
}

/**
 * Signs the shared test user in and installs the session + consent cookies on
 * `context`, so a subsequent navigation to any `(shell)` route renders the
 * authenticated shell instead of redirecting to /login.
 */
export async function seedSession(context: BrowserContext): Promise<void> {
  const { anonKey, email, password } = requireEnv()

  const api = await request.newContext()
  const response = await api.post(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    data: { email, password },
  })
  if (response.status() !== 200) {
    await api.dispose()
    throw new Error(
      `Password grant for ${email} failed with ${response.status()}. Is the local Supabase stack running and seeded?`,
    )
  }
  const body = (await response.json()) as PasswordGrantBody
  await api.dispose()

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

  await context.addCookies([
    { name: `sb-${projectRef}-auth-token`, value: cookieValue, ...shared },
    { name: CONSENT_COOKIE, value: CURRENT_CONSENT, ...shared },
  ])
}

/**
 * The sidebar and the BottomNav both carry the accessible name "Navegação
 * principal", so they pivot on the same `lg` breakpoint to keep exactly one
 * of them on screen. This locator names the BottomNav specifically — it is
 * the one wrapping the "Seções do aplicativo" tablist — so a spec can assert
 * on it without depending on which of the two the viewport happens to show.
 */
export const BOTTOM_NAV = 'nav:has([aria-label="Seções do aplicativo"])'

/**
 * The navigation sidebar, as opposed to the content asides some pages render
 * (the community feed has its own "upcoming events" aside). Width is the tell
 * for its two states: 64px as an icon rail, 256px expanded.
 */
export const SIDEBAR = 'aside:has(nav[aria-label="Navegação principal"])'
