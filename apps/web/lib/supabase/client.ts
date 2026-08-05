import { createBrowserClient as _createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "supabase/database.generated"

let browserClient: SupabaseClient<Database> | null = null

// Cookie options for the browser client. The server-side middleware and
// auth callback route also use these same options so the session cookie
// persists for ~400 days. This mirrors the behaviour that Instagram,
// Facebook and Reddit have on mobile: log in once and never see the
// login screen again unless you explicitly log out.
const COOKIE_OPTIONS = {
  maxAge: 60 * 60 * 24 * 400,
  path: "/" as const,
  sameSite: "lax" as const,
  secure: process.env["NODE_ENV"] === "production",
}

// Returns a single shared browser client instance wired to cookies
// (not localStorage). Using cookies means the middleware — which reads
// the same auth cookies from every request — always sees the session,
// eliminating the disconnect between browser and server session state.
//
// A singleton avoids multiple GoTrueClient instances fighting over the
// same cookie key when the root SupabaseAuthProvider and page components
// both create clients. The client is created lazily so module evaluation
// never runs on the server (prerender-safe).
export function createBrowserClient(): SupabaseClient<Database> {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const key = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  if (!browserClient) {
    browserClient = _createBrowserClient<Database>(url, key, {
      cookieOptions: COOKIE_OPTIONS,
      auth: {
        detectSessionInUrl: true,
      },
    })
  }

  return browserClient
}
