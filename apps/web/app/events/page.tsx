"use client"

import { Button, Form, Input, TextArea } from "@heroui/react"
import { Suspense, useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "../../lib/supabase/client"

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

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid flex-1 place-items-center px-6 py-12">
          <p className="text-sm text-muted">Carregando eventos...</p>
        </div>
      }
    >
      <EventsContent />
    </Suspense>
  )
}

function EventsContent() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [rsvps, setRsvps] = useState<RsvpRow[]>([])
  const [view, setView] = useState<ViewMode>("list")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

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
      locality_id: "00000000-0000-4000-8000-000000000001",
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

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (loading) {
    return (
      <div className="grid flex-1 place-items-center px-6 py-12">
        <p className="text-sm text-muted">Carregando eventos...</p>
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

      {error && (
        <div
          className="rounded-lg border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {view === "list" && (
        <div className="flex flex-col gap-4">
          {events.length === 0 && (
            <p className="text-sm text-muted">Nenhum evento encontrado na sua localidade.</p>
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
              <div
                key={event.id}
                className="rounded-lg border p-4 transition-colors"
                style={{
                  opacity: event.status === "cancelled" ? 0.6 : 1,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-base font-semibold">
                      {event.title}
                      {event.status === "cancelled" && (
                        <span className="ml-2 text-xs font-normal text-[var(--danger)]">
                          Cancelado
                        </span>
                      )}
                    </h2>
                    {event.description && <p className="text-sm text-muted">{event.description}</p>}
                    <p className="text-xs text-muted">{formatDate(event.starts_at)}</p>
                    {event.venue && <p className="text-xs text-muted">Local: {event.venue}</p>}
                    <div className="mt-1 flex gap-3 text-xs text-muted">
                      <span>{goingCount} confirmados</span>
                      <span>{interestedCount} interessados</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    {event.status === "upcoming" && !isOrganizer && (
                      <>
                        <Button
                          size="sm"
                          variant={myRsvp === "going" ? "primary" : "tertiary"}
                          onPress={() => handleRsvp(event.id, "going")}
                        >
                          Confirmado
                        </Button>
                        <Button
                          size="sm"
                          variant={myRsvp === "interested" ? "primary" : "tertiary"}
                          onPress={() => handleRsvp(event.id, "interested")}
                        >
                          Interessado
                        </Button>
                      </>
                    )}
                    {event.status === "upcoming" && isOrganizer && (
                      <Button
                        size="sm"
                        variant="tertiary"
                        onPress={() => handleCancelEvent(event.id)}
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
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
