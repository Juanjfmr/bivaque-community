"use client"

import { Button, Form, Input, Tab, TabList, TabPanel, Tabs, TextArea } from "@heroui/react"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { PILOT_LOCALITY_ID } from "../../../lib/locality"
import { createBrowserClient } from "../../../lib/supabase/client"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { EventsIllustration } from "../../components/bivaque/illustrations"
import { EventCardSkeleton } from "../../components/bivaque/skeleton"

type EventRow = {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  venue: string | null
  status: string
  organizer_id: string
}

type RsvpRow = {
  event_id: string
  user_id: string
  status: string
}

type ViewMode = "list" | "create"
type SeusTab = "host" | "going" | "interested" | "invited"

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 px-6 py-8" aria-busy="true">
          <h1 className="text-2xl font-semibold tracking-tight">Eventos</h1>
          <EventCardSkeleton />
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  )
}

// ── date badge: compact day+month block ──────────────────────────────────────

function DateBadge({ iso }: { iso: string }) {
  const d = new Date(iso)
  const day = d.getDate()
  const month = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")

  return (
    <div className="flex w-14 shrink-0 flex-col items-center rounded-lg border border-border bg-[var(--surface-sunken)] px-1 py-2 text-center">
      <span className="text-lg font-bold leading-none text-[var(--accent)]">{day}</span>
      <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
        {month}
      </span>
    </div>
  )
}

// ── formatted time helper ───────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── Nextdoor-grade event card ────────────────────────────────────────────────

function EventCard({
  event,
  interestedCount,
  goingCount,
  myRsvp,
  isOrganizer,
  onRsvp,
  onCancel,
}: {
  event: EventRow
  interestedCount: number
  goingCount: number
  myRsvp: string | null
  isOrganizer: boolean
  onRsvp: (status: "interested" | "going") => void
  onCancel: () => void
}) {
  const cancelled = event.status === "cancelled"

  return (
    <div
      className="rounded-xl border border-border bg-[var(--surface-raised)] transition-opacity"
      style={{ opacity: cancelled ? 0.55 : 1 }}
    >
      <div className="p-4">
        {/* top row: date badge + title + venue */}
        <div className="flex gap-3">
          <DateBadge iso={event.starts_at} />

          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="truncate text-sm font-semibold">
              {event.title}
              {cancelled && (
                <span className="ml-1.5 inline-block rounded bg-[var(--danger)]/10 px-1.5 py-0.5 text-[11px] font-medium text-[var(--danger)]">
                  Cancelado
                </span>
              )}
            </h2>

            <p className="text-xs text-muted">
              {formatTime(event.starts_at)}
              {event.ends_at && ` - ${formatTime(event.ends_at)}`}
            </p>

            {event.venue && <p className="truncate text-xs text-muted">📍 {event.venue}</p>}

            {event.description && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted">
                {event.description}
              </p>
            )}
          </div>
        </div>

        {/* counter row */}
        <div className="mt-3 border-t border-border/50 pt-2.5">
          <p className="text-xs text-muted">
            {interestedCount === 0 && goingCount === 0
              ? "Seja o primeiro a interagir"
              : [
                  interestedCount > 0
                    ? `${interestedCount} interessad${interestedCount === 1 ? "o" : "os"}`
                    : null,
                  goingCount > 0 ? `${goingCount} confirmad${goingCount === 1 ? "o" : "os"}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
          </p>
        </div>

        {/* CTA row */}
        {!cancelled && !isOrganizer && (
          <div className="mt-2.5 flex gap-2">
            <Button
              size="sm"
              variant={myRsvp === "interested" ? "primary" : "tertiary"}
              className="flex-1"
              onPress={() => onRsvp("interested")}
            >
              {myRsvp === "interested" ? "✓ Interessado" : "Interessado?"}
            </Button>
            <Button
              size="sm"
              variant={myRsvp === "going" ? "primary" : "tertiary"}
              className="flex-1"
              onPress={() => onRsvp("going")}
            >
              {myRsvp === "going" ? "✓ Confirmado" : "Confirmado"}
            </Button>
          </div>
        )}

        {!cancelled && isOrganizer && (
          <div className="mt-2.5">
            <Button size="sm" variant="tertiary" className="w-full text-xs" onPress={onCancel}>
              Cancelar evento
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── main page content ────────────────────────────────────────────────────────

function EventsContent() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [rsvps, setRsvps] = useState<RsvpRow[]>([])
  const [view, setView] = useState<ViewMode>("list")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [seusTab, setSeusTab] = useState<SeusTab>("host")

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [venue, setVenue] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const fetchEvents = useCallback(async () => {
    const supabase = createBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      setLoading(false)
      return
    }

    setUserId(session.user.id)

    const { data: eventsData, error: eventsError } = await supabase
      .from("events")
      .select("id, title, description, starts_at, ends_at, venue, status, organizer_id")
      .order("starts_at", { ascending: true })

    if (eventsError) {
      setError(eventsError.message)
      setLoading(false)
      return
    }

    setEvents((eventsData as EventRow[]) ?? [])

    const { data: rsvpsData } = await supabase
      .from("event_rsvps")
      .select("event_id, user_id, status")
      .in(
        "event_id",
        (eventsData as EventRow[]).map((e) => e.id),
      )

    setRsvps((rsvpsData as RsvpRow[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleCreate = async () => {
    setError(null)
    setSubmitting(true)

    const supabase = createBrowserClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) return

    const { error: insertError } = await supabase.from("events").insert({
      organizer_id: session.user.id,
      locality_id: PILOT_LOCALITY_ID,
      title,
      description: description || null,
      starts_at: new Date(startsAt).toISOString(),
      venue: venue || null,
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setTitle("")
    setDescription("")
    setStartsAt("")
    setVenue("")
    setSubmitting(false)
    setView("list")
    fetchEvents()
  }

  const handleRsvp = async (eventId: string, status: "interested" | "going") => {
    if (!userId) return

    const supabase = createBrowserClient()

    const { error: rsvpError } = await supabase.from("event_rsvps").upsert(
      {
        event_id: eventId,
        user_id: userId,
        status,
      },
      { onConflict: "event_id,user_id" },
    )

    if (rsvpError) {
      setError(rsvpError.message)
      return
    }

    fetchEvents()
  }

  const handleCancelEvent = async (eventId: string) => {
    const supabase = createBrowserClient()
    const { error: cancelError } = await supabase
      .from("events")
      .update({ status: "cancelled" })
      .eq("id", eventId)

    if (cancelError) {
      setError(cancelError.message)
      return
    }

    fetchEvents()
  }

  const getRsvpStatus = (eventId: string) => {
    return rsvps.find((r) => r.event_id === eventId && r.user_id === userId)?.status ?? null
  }

  // ── derived views for Seus eventos ──────────────────────────────────────────

  const seusFiltered = useMemo(() => {
    if (!userId) return [] as EventRow[]

    switch (seusTab) {
      case "host":
        return events.filter((e) => e.organizer_id === userId)
      case "going":
        return events.filter((e) => {
          const r = rsvps.find((r) => r.event_id === e.id && r.user_id === userId)
          return r?.status === "going"
        })
      case "interested":
        return events.filter((e) => {
          const r = rsvps.find((r) => r.event_id === e.id && r.user_id === userId)
          return r?.status === "interested"
        })
      case "invited":
        // No invite mechanism exists yet in event_rsvps schema.
        return []
    }
  }, [events, rsvps, userId, seusTab])

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-6 py-8" aria-busy="true">
        <h1 className="text-2xl font-semibold tracking-tight">Eventos</h1>
        <EventCardSkeleton />
        <EventCardSkeleton />
        <EventCardSkeleton />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Eventos</h1>
        <Button
          variant={view === "list" ? "primary" : "tertiary"}
          size="sm"
          onPress={() => setView(view === "list" ? "create" : "list")}
        >
          {view === "list" ? "Criar evento" : "Ver eventos"}
        </Button>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchEvents()} />}

      {view === "list" && (
        <div className="flex flex-col gap-4">
          {/* ── all events ──────────────────────────────────────────────── */}

          {events.length === 0 && (
            <EmptyState
              title="Nenhum evento ainda"
              description="Organize encontros e atividades para a sua comunidade."
              illustration={<EventsIllustration />}
              action={
                <Button variant="primary" size="sm" onPress={() => setView("create")}>
                  Criar evento
                </Button>
              }
            />
          )}

          {events.map((event) => {
            const myRsvp = getRsvpStatus(event.id)
            const isOrganizer = event.organizer_id === userId
            const goingCount = rsvps.filter(
              (r) => r.event_id === event.id && r.status === "going",
            ).length
            const interestedCount = rsvps.filter(
              (r) => r.event_id === event.id && r.status === "interested",
            ).length

            return (
              <EventCard
                key={event.id}
                event={event}
                interestedCount={interestedCount}
                goingCount={goingCount}
                myRsvp={myRsvp}
                isOrganizer={isOrganizer}
                onRsvp={(status) => handleRsvp(event.id, status)}
                onCancel={() => handleCancelEvent(event.id)}
              />
            )
          })}

          {/* ── Seus eventos ────────────────────────────────────────────── */}

          <section className="mt-4">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Seus eventos</h2>

            <Tabs
              selectedKey={seusTab}
              onSelectionChange={(key) => setSeusTab(key as SeusTab)}
              className="[&_[data-slot=tab]]:text-xs [&_[data-slot=tab]]:font-medium [&_[data-slot=tab]]:px-3 [&_[data-slot=tab]]:py-2"
            >
              <TabList aria-label="Seus eventos">
                <Tab key="host">Organizando</Tab>
                <Tab key="going">Confirmado</Tab>
                <Tab key="interested">Interessado</Tab>
                <Tab key="invited">Convidado</Tab>
              </TabList>

              <TabPanel key="host" className="pt-3">
                {seusFiltered.length === 0 ? (
                  <EmptyState
                    title="Você não organiza nenhum evento"
                    description="Crie um evento para sua comunidade e ele aparecerá aqui."
                    illustration={<EventsIllustration />}
                    action={
                      <Button size="sm" variant="primary" onPress={() => setView("create")}>
                        Criar evento
                      </Button>
                    }
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {seusFiltered.map((event) => {
                      const goingCount = rsvps.filter(
                        (r) => r.event_id === event.id && r.status === "going",
                      ).length
                      const interestedCount = rsvps.filter(
                        (r) => r.event_id === event.id && r.status === "interested",
                      ).length

                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          interestedCount={interestedCount}
                          goingCount={goingCount}
                          myRsvp={null}
                          isOrganizer
                          onRsvp={() => {}}
                          onCancel={() => handleCancelEvent(event.id)}
                        />
                      )
                    })}
                  </div>
                )}
              </TabPanel>

              <TabPanel key="going" className="pt-3">
                {seusFiltered.length === 0 ? (
                  <EmptyState
                    title="Nenhum evento confirmado"
                    description="Confirme presença em eventos da sua comunidade."
                    illustration={<EventsIllustration />}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {seusFiltered.map((event) => {
                      const goingCount = rsvps.filter(
                        (r) => r.event_id === event.id && r.status === "going",
                      ).length
                      const interestedCount = rsvps.filter(
                        (r) => r.event_id === event.id && r.status === "interested",
                      ).length
                      const myRsvp = getRsvpStatus(event.id)
                      const isOrganizer = event.organizer_id === userId

                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          interestedCount={interestedCount}
                          goingCount={goingCount}
                          myRsvp={myRsvp}
                          isOrganizer={isOrganizer}
                          onRsvp={(status) => handleRsvp(event.id, status)}
                          onCancel={() => handleCancelEvent(event.id)}
                        />
                      )
                    })}
                  </div>
                )}
              </TabPanel>

              <TabPanel key="interested" className="pt-3">
                {seusFiltered.length === 0 ? (
                  <EmptyState
                    title="Nenhum evento como interessado"
                    description="Marque interesse em eventos para acompanhá-los."
                    illustration={<EventsIllustration />}
                  />
                ) : (
                  <div className="flex flex-col gap-3">
                    {seusFiltered.map((event) => {
                      const goingCount = rsvps.filter(
                        (r) => r.event_id === event.id && r.status === "going",
                      ).length
                      const interestedCount = rsvps.filter(
                        (r) => r.event_id === event.id && r.status === "interested",
                      ).length
                      const myRsvp = getRsvpStatus(event.id)
                      const isOrganizer = event.organizer_id === userId

                      return (
                        <EventCard
                          key={event.id}
                          event={event}
                          interestedCount={interestedCount}
                          goingCount={goingCount}
                          myRsvp={myRsvp}
                          isOrganizer={isOrganizer}
                          onRsvp={(status) => handleRsvp(event.id, status)}
                          onCancel={() => handleCancelEvent(event.id)}
                        />
                      )
                    })}
                  </div>
                )}
              </TabPanel>

              <TabPanel key="invited" className="pt-3">
                <EmptyState
                  title="Convites em breve"
                  description="O sistema de convites para eventos ainda não está disponível. Ele será ativado em uma atualização futura."
                  illustration={<EventsIllustration />}
                />
              </TabPanel>
            </Tabs>
          </section>
        </div>
      )}

      {view === "create" && (
        <section className="flex w-full max-w-sm flex-col gap-4">
          <p className="text-sm text-muted">
            Crie um evento para sua localidade. Somente membros verificados podem criar eventos.
          </p>

          <Form
            onSubmit={(e) => {
              e.preventDefault()
              handleCreate()
            }}
            className="flex flex-col gap-3"
          >
            <Input
              aria-label="Título"
              placeholder="Título do evento"
              value={title}
              onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
              required
              minLength={2}
              maxLength={200}
            />
            <TextArea
              aria-label="Descrição"
              placeholder="Descrição (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
            />
            <Input
              aria-label="Data e hora"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt((e.target as HTMLInputElement).value)}
              required
            />
            <Input
              aria-label="Local"
              placeholder="Local (ex: Parque Municipal)"
              value={venue}
              onChange={(e) => setVenue((e.target as HTMLInputElement).value)}
              maxLength={200}
            />
            <p className="text-xs text-muted">
              O local deve ser um espa&ccedil;o p&uacute;blico. Endere&ccedil;os pessoais ou
              militares n&atilde;o s&atilde;o permitidos.
            </p>
            <Button type="submit" variant="primary" className="w-full" isDisabled={submitting}>
              {submitting ? "Criando..." : "Criar evento"}
            </Button>
          </Form>
        </section>
      )}
    </div>
  )
}
