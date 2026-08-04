import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

let browserClient: SupabaseClient<Database> | null = null

// Returns a single shared browser client instance. A singleton avoids
// multiple GoTrueClient instances fighting over the same localStorage key
// when the root SupabaseAuthProvider and page components both create
// clients. The client is created lazily so module evaluation never runs
// on the server (prerender-safe).
export function createBrowserClient(): SupabaseClient<Database> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  browserClient ??= createClient<Database>(url, key)
  return browserClient
}
