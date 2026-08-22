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
// Onda T Task 4: `kind = 'current'` is now the source of truth for which
// membership is current — ordering by joined_at and taking the first row
// (the P0-era query) silently picked the OLDEST membership, which after a
// declared transfer is the *origin* (kind='leaving'), not the destination.
// That is exactly the failure mode the P0-era comment warned about. The
// leaving row, if any, is fetched separately and exposed as `outbound`.
const SUPABASE_URL = process.env["NEXT_PUBLIC_SUPABASE_URL"]
const SUPABASE_ANON_KEY = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]

interface MembershipRow {
  locality_id: string
  localities: { city_name: string; state_code: string } | null
}

interface OutboundRow {
  locality_id: string
  leaving_at: string | null
  access: "active" | "read_only"
  localities: { city_name: string; state_code: string } | null
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
    .select("locality_id, localities(city_name, state_code)")
    .eq("kind", "current")
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
    stateCode: row.localities?.state_code ?? "",
  }

  const { data: outboundData, error: outboundError } = await supabase
    .from("locality_memberships")
    .select("locality_id, leaving_at, access, localities(city_name, state_code)")
    .eq("kind", "leaving")
    .maybeSingle()

  if (outboundError) {
    throw new Error(`Could not resolve the outbound locality: ${outboundError.message}`)
  }

  const outboundRow = outboundData as unknown as OutboundRow | null
  const outbound =
    outboundRow === null
      ? null
      : {
          id: outboundRow.locality_id,
          cityName: outboundRow.localities?.city_name ?? outboundRow.locality_id,
          stateCode: outboundRow.localities?.state_code ?? "",
          endsAt: outboundRow.leaving_at ?? "",
          readOnly: outboundRow.access === "read_only",
        }

  return (
    <LocalityContextProvider value={{ current, outbound }}>
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    </LocalityContextProvider>
  )
}
