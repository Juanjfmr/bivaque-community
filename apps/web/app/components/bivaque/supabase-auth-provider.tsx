"use client"

import { type ReactNode, useEffect, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"

// Instantiates the Supabase browser client once on the client side.
// createClient with detectSessionInUrl (default true) captures a
// #access_token fragment present on the landing URL (magic-link/OAuth
// redirect) and persists the session to localStorage. Mounting this in
// the root layout ensures the fragment is consumed exactly once before
// any page queries the session.
export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    createBrowserClient()
    setReady(true)
  }, [])

  if (!ready) {
    return null
  }

  return children
}
