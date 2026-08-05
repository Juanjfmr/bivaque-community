"use client"

import { type ReactNode, useEffect, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"

// Instantiates the Supabase browser client once on the client side.
// The client is wired to cookies via @supabase/ssr (not localStorage),
// so both the middleware and the browser see the same session token.
// Mounting this in the root layout ensures the GoTrueClient singleton
// is ready before any page queries the session.
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
