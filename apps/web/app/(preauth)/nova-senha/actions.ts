"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { passwordProblem } from "../../../lib/auth/password-auth"
import { hasRecoveryIntent, RECOVERY_INTENT_COOKIE } from "../../../lib/auth/recovery-intent"

export type RecoveryUpdateResult =
  | { ok: true }
  | { ok: false; reason: "expired" | "invalid" | "provider" }

export async function updatePasswordFromRecoveryAction(
  password: string,
): Promise<RecoveryUpdateResult> {
  const cookieStore = await cookies()
  if (!hasRecoveryIntent(cookieStore.get(RECOVERY_INTENT_COOKIE)?.value)) {
    return { ok: false, reason: "expired" }
  }

  const passwordError = passwordProblem(password)
  if (passwordError) return { ok: false, reason: "invalid" }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) return { ok: false, reason: "provider" }

  const supabase = createServerClient(url, anonKey, {
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
  })

  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { ok: false, reason: "provider" }

  cookieStore.delete({ name: RECOVERY_INTENT_COOKIE, path: "/nova-senha" })
  return { ok: true }
}
