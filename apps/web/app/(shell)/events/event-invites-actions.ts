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
  // Single round trip: list_invitable_members_for_event does the locality-
  // membership scan, the per-candidate can_receive_invite_to_event check
  // and the profile/invite join server-side. The previous version built the
  // candidate list client-side (one row per Manaus member — 300+ in the
  // real seed), called can_receive_invite_to_event once per candidate
  // (300+ sequential round trips), then queried
  // `.in("user_id", allowed)` with the survivors — which PostgREST
  // rejects outright once the id list gets long ("URI too long"). None of
  // that ever showed up against a pgTAP fixture's 5-10 users; it only
  // surfaced running against seed.sql's real member count.
  const { data, error } = await supabase.rpc("list_invitable_members_for_event", {
    p_event_id: eventId,
    p_user_id: userId,
  })
  if (error) return []

  return (data ?? []).map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name,
    is_already_invited: row.is_already_invited,
  }))
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

  // A plain insert throws on the unique (event_id, invitee_user_id)
  // constraint and aborts the whole batch, including new invitees in the
  // same call — ignoreDuplicates makes a repeat invite a no-op instead.
  const { data: inserted, error: insertError } = await authClient
    .from("event_invites")
    .upsert(rows as never as Array<Record<string, never>>, {
      onConflict: "event_id,invitee_user_id",
      ignoreDuplicates: true,
    })
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
