import { createClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

export function createServerClient() {
  const url = process.env["SUPABASE_URL"]
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"]

  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for server client")
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function createAnonClient() {
  const url = process.env["SUPABASE_URL"]
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

  if (!url || !key) {
    throw new Error("SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
