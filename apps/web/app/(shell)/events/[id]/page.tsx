import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"

type EventRow = Database["public"]["Tables"]["events"]["Row"]
type EventRsvpRow = Database["public"]["Tables"]["event_rsvps"]["Row"]
type AttendeeRow = EventRsvpRow & {
  profiles: { display_name: string } | null
}

// ── Server actions (writes) ──────────────────────────────────────────────────
// These mutate through the service role, following the codebase convention
// for server actions (see event-invites-actions.ts): they authenticate via
// cookies, then write. complete_event is additionally a service_role-only
// RPC, and event_rsvps has no delete policy for authenticated — both reasons
// live in supabase/migrations, not here. The page's data reads below
// deliberately use the authenticated client so RLS decides what is visible.

async function setRsvpAction(formData: FormData) {
  "use server"
  const eventId = formData.get("eventId")
  const status = formData.get("status")
  if (typeof eventId !== "string" || eventId.length === 0) throw new Error("eventId required")
  if (status !== "going" && status !== "interested") throw new Error("invalid status")

  const supabase = createServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  await supabase
    .from("event_rsvps")
    .upsert({ event_id: eventId, user_id: user.id, status }, { onConflict: "event_id,user_id" })

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/events")
}

async function cancelRsvpAction(formData: FormData) {
  "use server"
  const eventId = formData.get("eventId")
  if (typeof eventId !== "string" || eventId.length === 0) throw new Error("eventId required")

  const supabase = createServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  await supabase.from("event_rsvps").delete().eq("event_id", eventId).eq("user_id", user.id)

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/events")
}

async function completeEventAction(formData: FormData) {
  "use server"
  const eventId = formData.get("eventId")
  if (typeof eventId !== "string" || eventId.length === 0) throw new Error("eventId required")

  const supabase = createServiceClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  const { error } = await supabase.rpc("complete_event", { p_event_id: eventId })
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/events")
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
  const myRsvp = (rsvpData as EventRsvpRow | null)?.status ?? null

  const { data: attendeesData, error: attendeesError } = await authClient
    .from("event_rsvps")
    .select("event_id, user_id, status, created_at, profiles:profiles!inner(display_name)")
    .eq("event_id", event.id)
    .eq("status", "going")
    .limit(20)

  if (attendeesError) throw new Error(`failed to read attendees: ${attendeesError.message}`)
  const attendees = (attendeesData as unknown as AttendeeRow[] | null) ?? []

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
              {myRsvp === "going" ? (
                <form action={cancelRsvpAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <Button type="submit" size="sm" variant="tertiary">
                    Não vou
                  </Button>
                </form>
              ) : (
                <form action={setRsvpAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="status" value="going" />
                  <Button type="submit" size="sm" variant="primary">
                    Vou
                  </Button>
                </form>
              )}
              {myRsvp === "interested" ? (
                <form action={cancelRsvpAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <Button type="submit" size="sm" variant="tertiary">
                    Cancelar
                  </Button>
                </form>
              ) : (
                <form action={setRsvpAction}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="status" value="interested" />
                  <Button type="submit" size="sm" variant="secondary">
                    Talvez
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
        </article>

        <section aria-labelledby="attendees-heading">
          <h2 id="attendees-heading" className="mb-2 text-sm font-semibold tracking-tight">
            Quem vai ({attendees.length})
          </h2>
          {attendees.length > 0 ? (
            <ul className="space-y-1">
              {attendees.map((a) => (
                <li key={a.user_id} className="text-sm text-muted">
                  {a.profiles?.display_name ?? "Membro"}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Ninguém confirmou presença ainda.</p>
          )}
        </section>

        <section aria-labelledby="comments-heading">
          <h2 id="comments-heading" className="mb-2 text-sm font-semibold tracking-tight">
            Comentários
          </h2>
          <p className="text-sm text-muted">Em breve.</p>
        </section>
      </div>
    </div>
  )
}
