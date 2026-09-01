import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import { log } from "../../../lib/logger"
import { sanitizeNext } from "../../../lib/security/sanitize-next"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

const CONSENT_COOKIE = "bivaque-consent-version"
const COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 400,
  path: "/",
  sameSite: "lax" as const,
  secure: process.env["NODE_ENV"] === "production",
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const next = sanitizeNext(searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(new URL("/auth/callback-error", request.url))
  }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

  if (!url || !key) {
    log.error("auth callback failed: missing Supabase environment variables")
    return NextResponse.redirect(new URL("/auth/callback-error", request.url))
  }

  const cookieStore = await cookies()

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options)
        }
      },
    },
    cookieOptions: COOKIE_OPTIONS,
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    log.error("auth callback failed", { error: error.message })
    return NextResponse.redirect(new URL("/auth/callback-error", request.url))
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    log.error("auth callback failed: authenticated user unavailable")
    return NextResponse.redirect(new URL("/auth/callback-error", request.url))
  }

  const serviceClient = createServiceClient()
  const { data: hasAcceptedConsent, error: consentError } = await serviceClient.rpc(
    "has_accepted_consent",
    {
      p_user_id: user.id,
      p_consent_version: CONSENT_VERSION,
      p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
    },
  )

  if (consentError) {
    log.error("auth callback failed: consent status unavailable", { error: consentError.message })
    return NextResponse.redirect(new URL("/auth/callback-error", request.url))
  }

  const redirectUrl = new URL(next, request.url)
  const response = NextResponse.redirect(redirectUrl)
  if (hasAcceptedConsent) {
    response.cookies.set(CONSENT_COOKIE, String(CONSENT_VERSION), COOKIE_OPTIONS)
  } else {
    response.cookies.set(CONSENT_COOKIE, "", { ...COOKIE_OPTIONS, maxAge: 0 })
  }
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
  return response
}
