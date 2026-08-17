import { createServerClient } from "@supabase/ssr"
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = [
  "/login",
  "/auth/callback",
  "/consent",
  "/api",
  "/_next",
  "/favicon.ico",
  "/icon.svg",
]
const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"

const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"]
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

// Test-only escape hatch: set BIVAQUE_AUTH_BYPASS=true in apps/web/.env.local
// (gitignored) to disable the auth/consent gate while developing/QA'ing.
// It is never set in CI or production, so the gate stays enforced there.
const AUTH_BYPASS = process.env["BIVAQUE_AUTH_BYPASS"] === "true"

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Test-only: skip every gate when the bypass env var is enabled.
  if (AUTH_BYPASS) {
    return NextResponse.next()
  }

  // Public paths bypass all checks — no session round-trip needed.
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Build a Supabase server client wired to the request cookies so
  // getUser() can read the session token the browser sent. Any
  // Set-Cookie headers emitted by Supabase (token refresh, etc.) are
  // forwarded onto the response.
  const supabaseResponse = NextResponse.next({ request })

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set")
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 400,
      path: "/",
      sameSite: "lax",
      secure: process.env["NODE_ENV"] === "production",
    },
  })

  // Verify the session. An AuthError (expired / tampered / missing token)
  // is treated as unauthenticated — user stays null and the redirect logic
  // below handles it.
  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // no-op — user remains null
  }

  // Root redirect — session-aware (new behaviour).
  if (pathname === "/" || pathname === "") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url))
    }
    const hasConsent = request.cookies.get(CONSENT_COOKIE)?.value === CURRENT_CONSENT
    return NextResponse.redirect(new URL(hasConsent ? "/community" : "/consent", request.url))
  }

  // Protected paths: consent gate first (unchanged from original), then
  // the session gate (new).
  const hasConsent = request.cookies.get(CONSENT_COOKIE)?.value === CURRENT_CONSENT
  if (!hasConsent) {
    const consentUrl = new URL("/consent", request.url)
    consentUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(consentUrl)
  }

  if (!user) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Onboarding keeps its own screen and is not part of the verified shell.
  // /onboarding/locality is the post-eligibility step (P0 Task 5): an
  // eligible-but-not-yet-provisioned member lands there, not on the feed.
  if (
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/status") ||
    pathname.startsWith("/onboarding/locality")
  ) {
    return supabaseResponse
  }

  // The welcome screen is a reward for a verified membership, not a public page.
  const isMember = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (isMember.data === null) {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/health).*)"],
}
