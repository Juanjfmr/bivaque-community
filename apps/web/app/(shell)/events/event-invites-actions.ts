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
  if (!userId) throw new Error("nÃ£o autenticado")

  const supabase = createServiceClient()
  const { error } = await supabase
    .from("event_invites")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("event_id", eventId)
    .eq("invitee_user_id", userId)

  if (error) throw new Error(error.message)
}

// â”€â”€ Onda F Task 3 â€” organizer-side fan-out â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The invitee-side (accept/decline) is above. This is the organizer surface:
// pick eligible invitees (D43 â€” no people search) and fan out.

import { allowSlidingWindow, LIMITS } from "@bivaque/domain"
import { createLimiterStore } from "../../../lib/limits"

type InvitableMemberRow = {
  user_id: string
  display_name: string | null
  is_already_invited: boolean
}

export async function listInvitableMembersAction(eventId: string): Promise<InvitableMemberRow[]> {
  const userId = await readSessionUserId()
  if (!userId) return []

  const supabase = createServiceClient()
  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("id, locality_id, community_id, group_id, organizer_id")
    .eq("id", eventId)
    .maybeSingle()
  if (eventError) return []
  const event = eventData as {
    id: string
    locality_id: string
    community_id: string | null
    group_id: string | null
    organizer_id: string
  } | null
  if (!event || event.organizer_id !== userId) return []

  const { data: localityMembers } = await supabase
    .from("locality_memberships")
    .select("user_id")
    .eq("locality_id", event.locality_id)
  const candidates = ((localityMembers ?? []) as { user_id: string }[]).map((r) => r.user_id)
  if (candidates.length === 0) return []

  // F3: the cast is intentional â€” can_receive_invite_to_event was added in the
  // same migration and is not in the generated types until `supabase gen types`.
  const rpc = supabase.rpc as unknown as (
    name: "can_receive_invite_to_event",
    args: { p_event_id: string; p_user_id: string },
  ) => Promise<{ data: boolean | null; error: { message: string } | null }>

  const allowed: string[] = []
  for (const id of candidates) {
    if (id === event.organizer_id) continue
    const { data: ok } = await rpc("can_receive_invite_to_event", {
      p_event_id: event.id,
      p_user_id: id,
    })
    if (ok === true) allowed.push(id)
  }
  if (allowed.length === 0) return []

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", allowed)

  const { data: invitedData } = await supabase
    .from("event_invites")
    .select("invitee_user_id")
    .eq("event_id", event.id)
  const invitedSet = new Set((invitedData ?? []).map((r) => r.invitee_user_id))

  return ((profilesData ?? []) as { user_id: string; display_name: string | null }[])
    .map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      is_already_invited: invitedSet.has(p.user_id),
    }))
    .sort((a, b) => (a.display_name ?? "").localeCompare(b.display_name ?? ""))
}

async function eventInviteQuota(
  eventId: string,
  batchSize: number,
  now = Date.now(),
): Promise<boolean> {
  const url = process.env["UPSTASH_REDIS_REST_URL"]
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"]
  if (!url || !token) return true
  const { Redis } = await import("@upstash/redis")
  const store = createLimiterStore(new Redis({ url, token }))
  for (let i = 0; i < batchSize; i++) {
    const ok = await allowSlidingWindow(
      store,
      `bivaque:limit:eventInvite:${eventId}`,
      LIMITS.memberInvite.limit,
      LIMITS.memberInvite.windowMs,
      now + i,
    )
    if (!ok) return false
  }
  return true
}

export async function sendEventInvitesAction(
  formData: FormData,
): Promise<{ invited: number } | undefined> {
  const eventId = formData.get("eventId")
  const inviteeIds = formData
    .getAll("inviteeId")
    .filter((v): v is string => typeof v === "string" && v.length > 0)
  if (typeof eventId !== "string" || eventId.length === 0) throw new Error("eventId required")
  if (inviteeIds.length === 0) return

  const quotaOk = await eventInviteQuota(eventId, inviteeIds.length)
  if (!quotaOk) throw new Error("cota de convites de evento atingida. Tente mais tarde.")

  // Authenticated client â€” RLS applies to the insert.
  const authUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!authUrl || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }
  const cookieStore = await cookies()
  const authClient = createServerClient(authUrl, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: () => {},
    },
  })
  const { data: session, error: sessionError } = await authClient.auth.getUser()
  if (sessionError || !session?.user) throw new Error("nÃ£o autenticado")
  const organizerId = session.user.id

  const rows = inviteeIds.map((invitee) => ({
    event_id: eventId,
    invitee_user_id: invitee,
    invited_by: organizerId,
  }))

  // The unique (event_id, invitee_user_id) constraint makes a duplicate invite
  // a no-op; we rely on it instead of an insert option.
  const { data: inserted, error: insertError } = await authClient
    .from("event_invites")
    .insert(rows as never as Array<Record<string, never>>)
  if (insertError) throw new Error(insertError.message)
  const insertedCount = Array.isArray(inserted as unknown)
    ? (inserted as unknown as unknown[]).length
    : 0

  const serviceClient = createServiceClient()
  const { error: outboxError } = await serviceClient.from("outbox").insert(
    inviteeIds.map((invitee) => ({
      recipient: `event-invite:${eventId}`,
      channel: "email",
      type: "event_invite",
      payload: { event_id: eventId, invitee_user_id: invitee },
    })),
  )
  if (outboxError) throw new Error(outboxError.message)

  return { invited: insertedCount }
}
