import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import { log } from "../../../lib/logger"
import { sanitizeNext } from "../../../lib/security/sanitize-next"

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

  const redirectUrl = new URL(next, request.url)
  const response = NextResponse.redirect(redirectUrl)
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
  return response
}
