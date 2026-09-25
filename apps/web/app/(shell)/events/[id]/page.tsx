import { Button } from "@heroui/react"
import { createServerClient } from "@supabase/ssr"
import { ArrowLeft, Clock, MapPin } from "lucide-react"
import type { Route } from "next"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import type { Database } from "supabase/database.generated"
import { MemberAvatar } from "../../../components/bivaque/avatar"
import { EventsIllustration } from "../../../components/bivaque/illustrations"
import { EventInviteFanoutSection } from "../event-invite-fanout-section"
import { CancelPresenceControl } from "./presence-controls"

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
// RLS decides. The pattern is the same as communities/actions.ts.

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
      // occurrence_date is not in the payload: the BEFORE INSERT trigger
      // (private.default_event_rsvp_occurrence) fills it from the event's
      // current starts_at before the conflict target is matched — see
      // 20260820052745_recurring_events.sql. Listing it here anyway would
      // require this action to know the event's current occurrence itself.
      onConflict: "event_id,user_id,occurrence_date",
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

  // Onda F Task 4: event_rsvps is keyed by occurrence_date now — a recurring
  // event that has already advanced could hold an RSVP from a past
  // occurrence. Without this filter, "Remover meu RSVP" on the CURRENT
  // occurrence would delete every occurrence's row for this event. The
  // current occurrence is read fresh from the server, never trusted from
  // the client.
  const { data: eventRow, error: eventError } = await supabase
    .from("events")
    .select("starts_at")
    .eq("id", eventId)
    .single()
  if (eventError) throw new Error(eventError.message)
  const occurrenceDate = (eventRow.starts_at as string).slice(0, 10)

  // event_rsvps_delete_self (20260819010000) + the DELETE grant to
  // authenticated (20260821000017) make this a real own-row delete: the
  // current-occurrence row disappears, so the "Você vai" count and the list
  // presence line update on revalidation. An older revision of this comment
  // claimed the policy did not exist yet; it does.
  const { error } = await supabase
    .from("event_rsvps")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .eq("occurrence_date", occurrenceDate)
  if (error) throw new Error(error.message)

  revalidatePath(`/events/${eventId}`)
  revalidatePath("/events")
}

async function completeEventAction(formData: FormData) {
  "use server"
  const eventId = formData.get("eventId")
  if (typeof eventId !== "string" || eventId.length === 0) throw new Error("eventId required")

  const supabase = await getAuthClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthenticated")

  // P-02-AUTHZ fix: complete_event now accepts p_caller_user_id and grants
  // to authenticated; no longer needs service_role, so auth.uid() null is gone.
  const { error } = await supabase.rpc("complete_event", {
    p_event_id: eventId,
    p_caller_user_id: user.id,
  })
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
        className="min-h-11"
      >
        {isCurrent ? `${label} ✓` : label}
      </Button>
    </form>
  )
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Date badge reused on the hero band (mirrors the listing card so the visual
// language is consistent across list + detail). Pure: never imports anything
// outside the rendering path so the server component stays free of client
// noise.
function EventDateBadge({ iso }: { iso: string }) {
  const d = new Date(iso)
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase()
  const day = d.getDate()
  const month = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase()
  return (
    <div className="flex w-16 shrink-0 flex-col items-center rounded-lg border border-border bg-[var(--semantic-surface)] px-1.5 py-2 text-center">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">{weekday}</span>
      <span className="mt-0.5 text-xl font-bold leading-none text-[var(--semantic-action-primary)]">
        {day}
      </span>
      <span className="mt-0.5 text-xs font-semibold uppercase tracking-wider text-muted">
        {month}
      </span>
    </div>
  )
}

// "Você e mais N pessoas vão" / "Você vai" / "N pessoas vão" / "Ninguém
// confirmou presença ainda". Contract RECON-007 B.4 dictates the exact
// branches; this keeps the order explicit so future copy tweaks do not
// accidentally hide the "Você vai" case when the member is the only one.
function buildGoingCopy(goingCount: number, myRsvpIsGoing: boolean): string {
  if (goingCount === 0) return "Ninguém confirmou presença ainda"
  if (myRsvpIsGoing) {
    if (goingCount === 1) return "Você vai"
    const others = goingCount - 1
    return `Você e mais ${others} ${others === 1 ? "pessoa vai" : "pessoas vão"}`
  }
  if (goingCount === 1) return "1 pessoa vai"
  return `${goingCount} pessoas vão`
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

  // Capa do evento: bucket privado, URL assinada no servidor (1h). Sem capa,
  // coverUrl fica null e o hero mostra a ilustração.
  let coverUrl: string | null = null
  if (event.cover_path) {
    const { data: signed } = await authClient.storage
      .from("event-photos")
      .createSignedUrl(event.cover_path, 3600)
    coverUrl = signed?.signedUrl ?? null
  }

  // Onda F Task 4: event_rsvps accumulates one row per occurrence for a
  // recurring event — filtering to the event's current starts_at is what
  // keeps "who's going" and "my RSVP" about THIS occurrence, not a mix of
  // every occurrence anyone ever RSVP'd to.
  const currentOccurrenceDate = event.starts_at.slice(0, 10)

  const { data: rsvpData, error: rsvpError } = await authClient
    .from("event_rsvps")
    .select("*")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .eq("occurrence_date", currentOccurrenceDate)
    .maybeSingle()

  if (rsvpError) throw new Error(`failed to read rsvp: ${rsvpError.message}`)
  const myRsvp: "going" | "interested" | "not_going" | null =
    (rsvpData as EventRsvpRow | null)?.status ?? null

  // EXACT going count for the "Você vai" card. A separate head-only count
  // query — never derived from the capped limit(20) list of attendees — so
  // the copy "Você e mais N pessoas vão" stays accurate above 20.
  const { count: goingCount, error: goingCountError } = await authClient
    .from("event_rsvps")
    .select("user_id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "going")
    .eq("occurrence_date", currentOccurrenceDate)

  if (goingCountError) {
    throw new Error(`failed to count attendees: ${goingCountError.message}`)
  }

  // Avatar stack: up to 5 going attendees (contract B.4 — extends the names
  // map that the previous limit(20) attendees list already produced). Same
  // created_at ordering keeps the avatar order and the underlying name list
  // aligned.
  const { data: attendeesData, error: attendeesError } = await authClient
    .from("event_rsvps")
    .select("event_id, user_id, status, created_at")
    .eq("event_id", event.id)
    .eq("occurrence_date", currentOccurrenceDate)
    .eq("status", "going")
    .order("created_at", { ascending: true })
    .limit(5)

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

  // Organizer name follows the same RLS-gated profile read as the attendees.
  // The R3 privacy boundary forbids any organizer field beyond display_name
  // here (no email, no rank, no military organization, no raw CPF).
  const { data: organizerData, error: organizerError } = await authClient
    .from("profiles")
    .select("display_name")
    .eq("user_id", event.organizer_id)
    .maybeSingle()

  if (organizerError) {
    throw new Error(`failed to read organizer profile: ${organizerError.message}`)
  }
  const organizerName = (organizerData as { display_name: string } | null)?.display_name ?? null

  const isOrganizer = event.organizer_id === user.id
  const isCancelled = event.status === "cancelled"
  const isCompleted = event.status === "completed"

  // Consulta a outra cidade (migration 20260925161111): quem não é da cidade
  // do encontro o LÊ, mas confirmar presença, ver quem vai e perguntar ao
  // organizador continuam de quem é de lá — o banco recusaria. A tela diz isso
  // em vez de oferecer botões que falham e de afirmar "ninguém confirmou".
  const { data: localMembership, error: membershipError } = await authClient
    .from("locality_memberships")
    .select("locality_id")
    .eq("locality_id", event.locality_id)
    .maybeSingle()
  if (membershipError) {
    throw new Error(`failed to read locality membership: ${membershipError.message}`)
  }
  const isVisitor = localMembership === null

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6">
        <Link
          href={"/events" as Route}
          aria-label="Voltar para Explorar eventos"
          className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md px-2 text-sm text-muted transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Explorar eventos</span>
        </Link>

        <article aria-labelledby="event-heading">
          <header className="flex flex-col gap-3">
            <h1 id="event-heading" className="text-2xl font-semibold tracking-tight">
              {event.title}
            </h1>

            {/* Hero band: a capa do evento quando existe (bucket privado, URL
                assinada no servidor); sem capa, a ilustração — que é o estado
                legítimo de quem publicou sem imagem, não um retrato falso. O
                badge de data fica no canto inferior esquerdo, como no cartão do
                anúncio, para a linguagem ser a mesma nas duas telas; o badge é
                conteúdo (a única data desta tela), então só a ilustração é
                escondida de tecnologia assistiva. */}
            <div className="relative overflow-hidden rounded-2xl border border-border bg-[var(--semantic-surface-sunken)]">
              {coverUrl ? (
                // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado expira em 1h.
                <img
                  src={coverUrl}
                  alt={`Capa do evento ${event.title}`}
                  className="h-40 w-full object-cover"
                />
              ) : (
                <div className="flex h-40 items-center justify-center" aria-hidden="true">
                  <EventsIllustration className="h-16 w-24" />
                </div>
              )}
              <div className="absolute bottom-3 left-3">
                <EventDateBadge iso={event.starts_at} />
              </div>
            </div>

            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={14} aria-hidden="true" />
                <span>{formatTime(event.starts_at)}</span>
              </span>
              {event.venue ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} aria-hidden="true" />
                    <span>{event.venue}</span>
                  </span>
                </>
              ) : null}
            </p>
          </header>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex flex-col gap-6">
              <section aria-labelledby="about-heading" className="flex flex-col gap-2">
                <h2 id="about-heading" className="text-base font-semibold tracking-tight">
                  Sobre o evento
                </h2>
                {isCancelled && (
                  <p className="text-sm font-medium text-danger">Este evento foi cancelado.</p>
                )}
                {isCompleted && (
                  <p className="text-sm font-medium text-muted">Este evento foi encerrado.</p>
                )}
                {event.description ? (
                  <p className="text-sm whitespace-pre-wrap">{event.description}</p>
                ) : null}
              </section>

              <section aria-labelledby="organizer-heading" className="flex flex-col gap-3">
                <h2 id="organizer-heading" className="text-base font-semibold tracking-tight">
                  Organizador
                </h2>
                <div className="flex items-center gap-3">
                  <MemberAvatar name={organizerName} />
                  <div className="flex min-w-0 flex-col">
                    <p className="text-sm font-semibold">
                      {organizerName ?? "Organizador do evento"}
                    </p>
                    <p className="text-xs text-muted">Membro da comunidade</p>
                  </div>
                </div>
              </section>

              {/* RECON-029 (R33/R34, prancha 67): "Pedir mais informações"
                  permanece disponível ANTES e DEPOIS de confirmar presença e
                  não exige RSVP. Leva ao fio da pergunta, cujo destinatário é
                  derivado do evento e cuja conversa a RLS só abre a quem
                  participa. */}
              {!isOrganizer && !isVisitor ? (
                <section aria-labelledby="ask-organizer-heading" className="flex flex-col gap-2">
                  <h2 id="ask-organizer-heading" className="text-base font-semibold tracking-tight">
                    Pergunte ao organizador
                  </h2>
                  <Link
                    href={`/events/${event.id}/perguntas` as Route}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-[var(--semantic-surface)] px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
                  >
                    Pedir mais informações
                  </Link>
                  <p className="text-sm text-muted">
                    Envie sua dúvida para {organizerName ?? "o organizador"} sobre este evento.
                  </p>
                </section>
              ) : null}

              {/* Organizer controls — kept untouched per RECON-007 B.5: the
                  "Encerrar evento" path is distinct from canceling one's
                  own presence. The organizer cannot RSVP their own event, so
                  the RSVP block above is hidden from them by the
                  !isOrganizer guard. */}
              {isOrganizer && !isCancelled && !isCompleted ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-[var(--semantic-surface-sunken)] p-3">
                  <p className="text-xs text-muted">Você é o organizador deste evento.</p>
                  <Link
                    href={`/events/${event.id}/editar` as Route}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
                  >
                    Editar evento
                  </Link>
                  <Link
                    href={`/events/${event.id}/perguntas` as Route}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-selected)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
                  >
                    Ver perguntas
                  </Link>
                  <form action={completeEventAction}>
                    <input type="hidden" name="eventId" value={event.id} />
                    <Button type="submit" size="sm" variant="tertiary" className="min-h-11">
                      Encerrar evento
                    </Button>
                  </form>
                </div>
              ) : null}
              {isOrganizer && isCompleted ? (
                <p className="text-xs font-medium text-muted">Evento encerrado.</p>
              ) : null}

              {isOrganizer && !isCancelled && !isCompleted ? (
                <div>
                  <EventInviteFanoutSection eventId={event.id} />
                </div>
              ) : null}
            </div>

            {isVisitor ? (
              <aside
                aria-labelledby="consulta-heading"
                className="lg:sticky lg:top-20 lg:self-start"
              >
                <div className="flex flex-col gap-2 rounded-ui-lg bg-ui-brand-soft p-4 ring-1 ring-ui-line">
                  <h2 id="consulta-heading" className="text-base font-semibold text-ui-ink">
                    Encontro de outra cidade
                  </h2>
                  <p className="text-sm text-ui-ink-2">
                    Você está consultando. Confirmar presença e perguntar ao organizador ficam para
                    quem é da cidade do encontro.
                  </p>
                  <Link
                    href={"/profile#cidade" as Route}
                    className="-ml-2 inline-flex min-h-11 items-center rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
                  >
                    Vai se mudar? Mude a sua cidade
                  </Link>
                </div>
              </aside>
            ) : (
              <aside
                aria-labelledby="vou-vai-heading"
                className="lg:sticky lg:top-20 lg:self-start"
              >
                <div className="flex flex-col gap-4 rounded-2xl border border-border bg-[var(--semantic-surface)] p-4">
                  <h2 id="vou-vai-heading" className="text-base font-semibold tracking-tight">
                    Você vai
                  </h2>

                  {attendees.length > 0 ? (
                    <div className="flex -space-x-2" aria-hidden="true">
                      {attendees.map((a) => (
                        <MemberAvatar
                          key={a.user_id}
                          name={attendeeNames.get(a.user_id)}
                          size="sm"
                          className="ring-2 ring-[var(--semantic-surface)]"
                        />
                      ))}
                    </div>
                  ) : null}

                  <p className="text-sm text-muted">
                    {buildGoingCopy(goingCount ?? 0, myRsvp === "going")}
                  </p>

                  {!isOrganizer && !isCancelled ? (
                    <div className="flex flex-col gap-3">
                      {myRsvp === "going" ? (
                        <CancelPresenceControl
                          eventId={event.id}
                          cancelRsvpAction={cancelRsvpAction}
                        />
                      ) : (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <RsvpButton
                              eventId={event.id}
                              status="going"
                              label="Vou"
                              isCurrent={false}
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
                          </div>
                          {myRsvp !== null ? (
                            <form action={cancelRsvpAction}>
                              <input type="hidden" name="eventId" value={event.id} />
                              <Button
                                type="submit"
                                size="sm"
                                variant="tertiary"
                                className="min-h-11 w-full"
                              >
                                Remover meu RSVP
                              </Button>
                            </form>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                </div>
              </aside>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}
