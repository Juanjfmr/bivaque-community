import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

const PUBLIC_PATHS = [
  "/login",
  "/consent",
  "/onboarding",
  "/api",
  "/_next",
  "/favicon.ico",
  "/icon.svg",
]
const CONSENT_COOKIE = "bivaque-consent-version"
const CURRENT_CONSENT = "1"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/" || pathname === "") {
    const hasConsent = request.cookies.get(CONSENT_COOKIE)?.value === CURRENT_CONSENT
    const destination = hasConsent ? "/community" : "/login"
    return NextResponse.redirect(new URL(destination, request.url))
  }

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const hasConsent = request.cookies.get(CONSENT_COOKIE)?.value === CURRENT_CONSENT
  if (!hasConsent) {
    const consentUrl = new URL("/consent", request.url)
    consentUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(consentUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/health).*)"],
}
