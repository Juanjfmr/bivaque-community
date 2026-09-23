"use server"

import { CODE_OF_CONDUCT_VERSION, CONSENT_VERSION } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import {
  SIGNUP_CONSENT_INTENT_COOKIE,
  SIGNUP_CONSENT_INTENT_MAX_AGE_SECONDS,
  SIGNUP_CONSENT_INTENT_VALUE,
} from "../../../lib/auth/signup-intent"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

export async function prepareSignupConsentAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SIGNUP_CONSENT_INTENT_COOKIE, SIGNUP_CONSENT_INTENT_VALUE, {
    httpOnly: true,
    maxAge: SIGNUP_CONSENT_INTENT_MAX_AGE_SECONDS,
    path: "/auth",
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
  })
}

async function readSessionUserId(): Promise<string | null> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user?.id ?? null
}

export async function recordConsentAction(): Promise<void> {
  const userId = await readSessionUserId()
  if (!userId) {
    throw new Error("não autenticado")
  }

  const supabase = createServiceClient()
  const { error } = await supabase.rpc("record_consent_acceptance", {
    p_user_id: userId,
    p_consent_version: CONSENT_VERSION,
    p_code_of_conduct_version: CODE_OF_CONDUCT_VERSION,
  })

  if (error) {
    throw new Error(error.message)
  }

  // O consentimento foi gravado; o intent de curta duração não pode ser
  // reaproveitado por um callback OAuth posterior.
  const cookieStore = await cookies()
  cookieStore.delete({ name: SIGNUP_CONSENT_INTENT_COOKIE, path: "/auth" })
}
