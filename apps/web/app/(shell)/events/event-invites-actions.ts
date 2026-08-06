"use server"

import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

type InvitedEventRow = {
  id: string
  title: string
  starts_at: string
  venue: string | null
  status: "pending" | "accepted" | "declined"
  organizer_name: string | null
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

export async function getInvitedEventsAction(): Promise<InvitedEventRow[]> {
  const userId = await readSessionUserId()
  if (!userId) return []

  const supabase = createServiceClient()
  const { data } = await supabase
    .from("event_invites")
    .select("event_id, status, events!inner(id, title, starts_at, venue, organizer_id)")
    .eq("invitee_user_id", userId)
    .order("created_at", { ascending: false })

  const rows = (data ?? []) as Array<{
    event_id: string
    status: "pending" | "accepted" | "declined"
    events: {
      id: string
      title: string
      starts_at: string
      venue: string | null
      organizer_id: string
    }
  }>

  const organizerIds = Array.from(new Set(rows.map((r) => r.events.organizer_id)))
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", organizerIds)

  const names = new Map((profilesData ?? []).map((p) => [p.user_id, p.display_name]))

  return rows.map((r) => ({
    id: r.events.id,
    title: r.events.title,
    starts_at: r.events.starts_at,
    venue: r.events.venue,
    status: r.status,
    organizer_name: names.get(r.events.organizer_id) ?? null,
  }))
}

export async function respondInviteAction(formData: FormData) {
  const eventId = formData.get("eventId")
  const status = formData.get("status")
  if (typeof eventId !== "string" || eventId.length === 0) throw new Error("eventId required")
  if (status !== "accepted" && status !== "declined") throw new Error("invalid status")

  const userId = await readSessionUserId()
  if (!userId) throw new Error("não autenticado")

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("event_invites")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("invitee_user_id", userId)

  if (error) throw new Error(error.message)
}
