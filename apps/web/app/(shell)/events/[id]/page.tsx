import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { createServerClient as createServiceRoleClient } from "../../../../lib/supabase/server"
import { EventInviteFanoutSection } from "../event-invite-fanout-section"

type EventRow = Database["public"]["Tables"]["events"]["Row"]
// F2 added 'not_going' to event_rsvp_status (migration 029). The generated
// types do not include it until `supabase gen types` runs against a stack with
// the migration applied — the union below mirrors the SQL enum locally.
type EventRsvpRow = Omit<Database["public"]["Tables"]["event_rsvps"]["Row"], "status"> & {
  status: "going" | "interested" | "not_going"
}
type AttendeeListRow = {
  event_id: string
  user_id: string
  status: EventRsvpRow["status"]
  created_at: string
}

// ── Server actions (writes) ──────────────────────────────────────────────────
// Authenticate from cookies and write through the authenticated client so
// RLS decides. The pattern is the same as communities/actions.ts. complete_event
// stays on service_role because the RPC is granted to service_role only — the
// plan names this as one of two exceptions, with the rule that anyone who
// concludes a third exception must stop and report.

async function getAuthClient() {
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {},
    },
  })
}

async function setRsvpAction(formData: FormData) {
  "use server"
  const eventId = formData.get("eventId")
  const status = formData.get("status")
  if (typeof eventId !== "string" || eventId.length === 0) throw new Error("eventId required")
  // F2 Step 2: 'not_going' is the third state (Wave F Task 2). The server
  // is the only place that decides status — there is no client-side override.
  if (status !== "going" && status !== "interested" && status !== "not_going") {
    throw new Error("invalid status")
  }
  const validStatus = status as "going" | "interested" | "not_going"

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // event_rsvps_insert_self enforces user_id = auth.uid() and
  // can_access_event — the latter checks locality and group membership,
  // so a member of a private event's group can RSVP and an outsider cannot.
  const { error } = await supabase
    .from("event_rsvps")
    .upsert({ event_id: eventId, user_id: user.id, status: validStatus } as never, {
      onConflict: "event_id,user_id",
    })
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/events")
}

async function cancelRsvpAction(formData: FormData) {
  "use server"
  const eventId = formData.get("eventId")
  if (typeof eventId !== "string" || eventId.length === 0) throw new Error("eventId required")

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // event_rsvps has no delete policy for authenticated today (the snapshot
  // records it). The fix lands in the next commit. Today the action
  // becomes a visible RLS denial — better than the silent escalation of
  // yesterday, and the precondition for the policy that follows.
  const { error } = await supabase
    .from("event_rsvps")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id)
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/events")
}

async function completeEventAction(formData: FormData) {
  "use server"
  const eventId = formData.get("eventId")
  if (typeof eventId !== "string" || eventId.length === 0) throw new Error("eventId required")

  // complete_event stays on service_role — the RPC is granted to
  // service_role only and checks that the caller is the organiser. The
  // plan names this as one of two exceptions.
  const supabase = createServiceRoleClient()
  const { error } = await supabase.rpc("complete_event", { p_event_id: eventId })
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/events")
}

export { cancelRsvpAction, completeEventAction, setRsvpAction }

function RsvpButton({
  eventId,
  status,
  label,
  isCurrent,
  variant = "primary",
}: {
  eventId: string
  status: "going" | "interested" | "not_going"
  label: string
  isCurrent: boolean
  variant?: "primary" | "secondary" | "tertiary" | "danger"
}) {
  return (
    <form action={setRsvpAction}>
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="status" value={status} />
      <Button
        type="submit"
        size="sm"
        variant={isCurrent ? "primary" : variant}
        isDisabled={isCurrent}
        aria-pressed={isCurrent}
      >
        {isCurrent ? `${label} ✓` : label}
      </Button>
    </form>
  )
}

function formatDateTime(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
  const time = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return `${date} às ${time}`
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient<Database>(url, anonKey, {
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
  if (!user) {
    redirect(`/login?return=/events/${eventId}`)
  }

  // All reads go through the authenticated client so RLS — not this page —
  // decides what is visible: events_select_locality_member already encodes
  // can_access_event internally (locality, community and group branches). A
  // null row means the viewer may not even know the event exists: 404, never
  // a permission screen that would confirm existence. A failed read is
  // infrastructure failure, not a denial, so errors are thrown instead of
  // being swallowed.
  const { data: eventData, error: eventError } = await authClient
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle()

  if (eventError) throw new Error(`failed to read event: ${eventError.message}`)
  const event = eventData as EventRow | null
  if (!event) {
    notFound()
  }

  const { data: rsvpData, error: rsvpError } = await authClient
    .from("event_rsvps")
    .select("*")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .maybeSingle()

  if (rsvpError) throw new Error(`failed to read rsvp: ${rsvpError.message}`)
  const myRsvp: "going" | "interested" | "not_going" | null =
    (rsvpData as EventRsvpRow | null)?.status ?? null

  const { data: attendeesData, error: attendeesError } = await authClient
    .from("event_rsvps")
    .select("event_id, user_id, status, created_at")
    .eq("event_id", event.id)
    .eq("status", "going")
    .limit(20)

  if (attendeesError) throw new Error(`failed to read attendees: ${attendeesError.message}`)
  const attendees = (attendeesData as unknown as AttendeeListRow[] | null) ?? []

  // Same schema constraint as the group page: no FK between event_rsvps and
  // profiles, so PostgREST cannot embed the names; a second RLS-gated query
  // joins them in memory. Unreadable profiles simply have no name.
  const attendeeIds = attendees.map((a) => a.user_id)
  let attendeeNames = new Map<string, string>()
  if (attendeeIds.length > 0) {
    const { data: namesData, error: namesError } = await authClient
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", attendeeIds)

    if (namesError) throw new Error(`failed to read attendee names: ${namesError.message}`)
    attendeeNames = new Map(
      ((namesData as { user_id: string; display_name: string }[] | null) ?? []).map((p) => [
        p.user_id,
        p.display_name,
      ]),
    )
  }

  const isOrganizer = event.organizer_id === user.id
  const isCancelled = event.status === "cancelled"
  const isCompleted = event.status === "completed"

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6">
        <article aria-labelledby="event-heading">
          <header className="flex flex-col gap-2">
            <h1 id="event-heading" className="text-2xl font-semibold tracking-tight">
              {event.title}
            </h1>
            <p className="text-sm text-muted">
              {formatDateTime(event.starts_at)}
              {event.ends_at &&
                ` - ${new Date(event.ends_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
            </p>
            {event.venue && <p className="text-sm text-muted">{event.venue}</p>}
            {isCancelled && (
              <p className="text-sm font-medium text-danger">Este evento foi cancelado.</p>
            )}
          </header>

          {event.description && (
            <p className="mt-4 text-sm whitespace-pre-wrap">{event.description}</p>
          )}

          {!isCancelled && (
            <div className="mt-6 flex flex-wrap gap-2">
              {/* Wave F Task 2 Step 2: three mutually-exclusive states (going,
                  interested, not_going). The current selection is highlighted;
                  clicking the same one is a no-op (debouncing on the server
                  side via UPDATE OF status). "Cancelar" removes the row
                  entirely — different from "Não vou". */}
              <RsvpButton
                eventId={event.id}
                status="going"
                label="Vou"
                isCurrent={myRsvp === "going"}
              />
              <RsvpButton
                eventId={event.id}
                status="interested"
                label="Talvez"
                isCurrent={myRsvp === "interested"}
                variant="secondary"
              />
              <RsvpButton
                eventId={event.id}
                status="not_going"
                label="Não vou"
                isCurrent={myRsvp === "not_going"}
                variant="tertiary"
              />
              {myRsvp !== null && (
                <form action={cancelRsvpAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <Button type="submit" size="sm" variant="tertiary">
                    Remover meu RSVP
                  </Button>
                </form>
              )}
            </div>
          )}

          {isOrganizer && (
            <div className="mt-4 flex items-center gap-3">
              <p className="text-xs text-muted">Você é o organizador deste evento.</p>
              {!isCancelled && !isCompleted && (
                <form action={completeEventAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <Button type="submit" size="sm" variant="tertiary">
                    Encerrar evento
                  </Button>
                </form>
              )}
              {isCompleted && (
                <span className="text-xs font-medium text-muted">Evento encerrado.</span>
              )}
            </div>
          )}

          {isOrganizer && !isCancelled && !isCompleted && (
            <div className="mt-5">
              <EventInviteFanoutSection eventId={event.id} />
            </div>
          )}
        </article>

        <section aria-labelledby="attendees-heading">
          <h2 id="attendees-heading" className="mb-2 text-sm font-semibold tracking-tight">
            Quem vai ({attendees.length})
          </h2>
          {attendees.length > 0 ? (
            <ul className="space-y-1">
              {attendees.map((a) => (
                <li key={a.user_id} className="text-sm text-muted">
                  {attendeeNames.get(a.user_id) ?? "Membro"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Ninguém confirmou presença ainda.</p>
          )}
        </section>
      </div>
    </div>
  )
}
