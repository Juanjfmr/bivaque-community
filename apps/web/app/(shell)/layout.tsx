import { createServerClient as createSsrServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { ReactNode } from "react"
import { LocalityContextProvider, type LocalityCurrent } from "../../lib/locality-context"
import { AppShell } from "../components/bivaque/app-shell"
import { ToastProvider } from "../components/bivaque/toast"

type ShellLayoutProperties = Readonly<{
  children: ReactNode
}>

// P0 Task 7: resolve the member's locality once per navigation, in the
// server layout, and hand it to the client tree via the provider. The
// middleware already guarantees a member here has a membership (it
// redirects to /onboarding when there is none); the redirect below is the
// defence in depth for the case where the membership disappears between
// the middleware check and the render.
//
// The "which membership is current" question is explicitly answered here,
// and the answer is frozen: P0 delivers at most one membership per person,
// so the order is irrelevant as long as one row exists. The onda T
// (transfer) introduces the "current vs outbound" distinction and will
// change this query. Until then, do not swap the order without reading
// ADR-20260816-transferencia-e-pertencimento: silently choosing the wrong
// row is the failure mode the previous attempt made.
const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"]
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

interface MembershipRow {
  locality_id: string
  localities: { city_name: string } | null
}

export default async function ShellLayout({ children }: ShellLayoutProperties) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set")
  }

  const cookieStore = await cookies()
  const supabase = createSsrServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })

  const { data, error } = await supabase
    .from("locality_memberships")
    .select("locality_id, localities(city_name)")
    .order("joined_at", { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    // Surface the failure. The AGENTS.md / plans README rule: "read the
    // error of every query". A silent null here becomes a blank screen,
    // which is the original failure of this task.
    throw new Error(`Could not resolve the current locality: ${error.message}`)
  }

  if (data === null) {
    // The middleware should have caught this and routed the eligible-but-
    // not-provisioned member to the post-eligibility step. If we land here,
    // the gate is out of sync with the layout — fail loud, do not render.
    redirect("/onboarding/locality")
  }

  const row = data as unknown as MembershipRow
  const current: LocalityCurrent = {
    id: row.locality_id,
    cityName: row.localities?.city_name ?? row.locality_id,
  }

  return (
    <LocalityContextProvider value={{ current }}>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </LocalityContextProvider>
  )
}
