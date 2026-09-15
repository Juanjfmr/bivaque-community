import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { Database } from "supabase/database.generated"
import { log } from "../../../lib/logger"
import { sanitizeNext } from "../../../lib/security/sanitize-next"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import {
  callbackFailureTarget,
  callbackSuccessTarget,
  shouldRecordSignupConsent,
} from "./redirect-plan"

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    log.error("auth callback failed", { error: error.message })
    return NextResponse.redirect(new URL(callbackFailureTarget(next), request.url))
  }

  // Aceite do cadastro que veio por confirmação de e-mail: sem sessão no
  // momento do signUp não havia como gravar, e o ADR manda registrar na
  // criação da conta. A troca acabou de completar a criação — é aqui, com o
  // id resolvido da sessão trocada (nunca de corpo ou query), que o aceite
  // entra. Falha aqui não vira "cadastro aparentemente completo" (R03).
  if (shouldRecordSignupConsent(searchParams.get("consent"), CONSENT_VERSION)) {
    const userId = data.user?.id
    if (!userId) {
      log.error("auth callback consent recording failed: no user after exchange")
      return NextResponse.redirect(new URL("/auth/callback-error", request.url))
    }
    const service = createServiceClient()
    const { error: consentError } = await service.rpc("record_consent_acceptance", {
      p_user_id: userId,
      p_consent_version: CONSENT_VERSION,
      p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
    })
    if (consentError) {
      log.error("auth callback consent recording failed", { message: consentError.message })
      return NextResponse.redirect(new URL("/auth/callback-error", request.url))
    }
  }

  const redirectUrl = new URL(callbackSuccessTarget(next), request.url)
  const response = NextResponse.redirect(redirectUrl)
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate")
  return response
}
