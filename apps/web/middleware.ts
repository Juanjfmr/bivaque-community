import { CONSENT_VERSION } from "@bivaque/domain"
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
    const hasConsent = request.cookies.get(CONSENT_COOKIE)?.value === String(CONSENT_VERSION)
    return NextResponse.redirect(new URL(hasConsent ? "/community" : "/consent", request.url))
  }

  // Protected paths: consent gate first (unchanged from original), then
  // the session gate (new).
  const hasConsent = request.cookies.get(CONSENT_COOKIE)?.value === String(CONSENT_VERSION)
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

  // D2 Task 1 — the gate now reads the real verification state, not just
  // the membership row. The previous behaviour was: pending and
  // temporary_error and rejected all looked the same as "never
  // verified" because the redirect was the same, and the person
  // burned a verification attempt to find that out. The new path routes
  // each state to its own screen:
  //   - never verified  -> /onboarding
  //   - pending, rejected, temporary_error -> /onboarding/status
  //   - verified, no membership -> /onboarding/locality
  //     (P0 Task 4 two-phase admission step; verified is the gap
  //      between eligibility and provisioning)
  //
  // The cookie that consent/page.tsx writes is a navigation shortcut, not
  // the authority — /api/onboarding reconfirms with has_accepted_consent.
  // The verification status is read through a SECURITY DEFINER RPC that
  // scopes by auth.uid() server-side (no p_user_id parameter to get
  // wrong). One extra round trip only when membership is missing.
  const isMember = await supabase
    .from("locality_memberships")
    .select("locality_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle()

  if (isMember.data === null) {
    // No membership yet — read the verification state to route by it.
    const { data: statusRows, error: statusError } = await supabase.rpc("my_verification_status")
    if (statusError) {
      // We cannot route safely. Fail closed to /onboarding so the user
      // sees a deterministic page rather than a half-decision. The error
      // reaches the server logger; the page does not surface it.
      return NextResponse.redirect(new URL("/onboarding", request.url))
    }
    const status = (statusRows?.[0]?.status ?? null) as string | null
    if (status === "verified") {
      return NextResponse.redirect(new URL("/onboarding/locality", request.url))
    }
    if (status === "pending" || status === "temporary_error" || status === "rejected") {
      return NextResponse.redirect(new URL("/onboarding/status", request.url))
    }
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/health).*)"],
}
