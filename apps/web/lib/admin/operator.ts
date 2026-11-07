import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { log } from "../logger"
import type { createServerClient as createServiceClient } from "../supabase/server"

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function requireOperatorId(
  client: ReturnType<typeof createServiceClient>,
): Promise<string | null> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !key) throw new Error("Supabase público não configurado")
  const store = await cookies()
  const auth = createServerClient(url, key, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  })
  const {
    data: { user },
    error: authError,
  } = await auth.auth.getUser()
  if (authError || !user) return null
  const { data, error } = await client.rpc("is_current_user_operator", { p_user_id: user.id })
  if (error) log.error("operator check failed", { caller_id: user.id, error: error.message })
  return !error && data === true ? user.id : null
}
