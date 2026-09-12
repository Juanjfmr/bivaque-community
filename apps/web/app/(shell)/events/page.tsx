"use client"

import {
  Button,
  Checkbox,
  Chip,
  Form,
  Input,
  ListBox,
  Select,
  TabPanel,
  Tabs,
  TextArea,
} from "@heroui/react"
import { ChevronDown, Clock, MapPin } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { isLocalityStale } from "../../../lib/locality-density"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../../components/bivaque/avatar"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { EventsIllustration } from "../../components/bivaque/illustrations"
import { EventCardSkeleton } from "../../components/bivaque/skeleton"
import { getInvitedEventsAction } from "./event-invites-actions"
import EventInvitesSection, { type InvitedEventRow } from "./event-invites-section"

const WEEKDAY_LABELS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]
const ORDINAL_LABELS = ["1ª", "2ª", "3ª", "4ª"]

// RECON-007 (prancha 48): "Esta semana" = próximos 7 dias do momento atual;
// "Este mês" = resto do mês corrente. Janela calculada sobre o horário real do
// evento, nunca a data fixa copiada da imagem do quadro.
const PERIOD_OPTIONS = [
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mês" },
  { value: "all", label: "Todos os eventos" },
] as const
type PeriodValue = (typeof PERIOD_OPTIONS)[number]["value"]

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
  occurrence_date: string
  created_at: string
}

type GoingAttendee = { userId: string; name: string }

type ViewMode = "list" | "create"
type SeusTab = "host" | "going" | "interested" | "invited"

export default function EventsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 px-6 py-8" aria-busy="true">
          <h1 className="text-2xl font-semibold tracking-tight">Explorar eventos</h1>
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

// ── date badge: weekday + day + month block (matches the prancha 48 cards) ───

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

// ── formatted time helper ───────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ── period filter math (computed against the real current time) ──────────────

function periodBounds(period: PeriodValue, now: Date): { from: Date; to: Date } {
  if (period === "week") {
    const from = new Date(now)
    const to = new Date(now)
    to.setDate(to.getDate() + 7)
    return { from, to }
  }
  if (period === "month") {
    const from = new Date(now)
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return { from, to }
  }
  return { from: new Date(0), to: new Date(now.getFullYear() + 100, 0, 1) }
}

function inPeriod(startsAt: string, period: PeriodValue, now: Date): boolean {
  const start = new Date(startsAt)
  if (Number.isNaN(start.getTime())) return false
  const { from, to } = periodBounds(period, now)
  return start >= from && start < to
}

// ── presence line copy ──────────────────────────────────────────────────────
// "Leila, Andréa e mais 18 pessoas vão" / "2 pessoas vão" /
// "1 pessoa vai" / "Ninguém confirmou ainda"

function buildPresenceCopy(goingCount: number, names: string[]): string {
  if (goingCount === 0) return "Ninguém confirmou ainda"
  if (goingCount === 1) return "1 pessoa vai"
  if (goingCount === 2) return "2 pessoas vão"
  const shown = names.slice(0, 2).filter(Boolean)
  const more = goingCount - shown.length
  if (shown.length === 2 && more > 0) {
    return `${shown[0]}, ${shown[1]} e mais ${more} ${more === 1 ? "pessoa vai" : "pessoas vão"}`
  }
  return `${goingCount} pessoas vão`
}

// ── explorer-style event card (prancha 48) ──────────────────────────────────

function ExplorerEventCard({
  event,
  goingCount,
  goingAttendees,
  href,
}: {
  event: EventRow
  goingCount: number
  goingAttendees: GoingAttendee[]
  href: Route
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-[var(--semantic-surface)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-action-context)]"
    >
      <div className="relative">
        <div
          className="flex h-32 items-center justify-center bg-[var(--semantic-surface-sunken)]"
          aria-hidden="true"
        >
          <EventsIllustration className="h-14 w-20" />
        </div>
        <div className="absolute bottom-3 left-3">
          <EventDateBadge iso={event.starts_at} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h2 className="text-base font-semibold tracking-tight">{event.title}</h2>

        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Clock size={14} aria-hidden="true" />
          <span>{formatTime(event.starts_at)}</span>
        </p>

        {event.venue ? (
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <MapPin size={14} aria-hidden="true" />
            <span className="line-clamp-1">{event.venue}</span>
          </p>
        ) : null}

        <div className="mt-auto flex items-center gap-2 pt-2">
          {goingCount > 0 ? (
            <div className="flex -space-x-2" aria-hidden="true">
              {goingAttendees.slice(0, 3).map((attendee) => (
                <MemberAvatar
                  key={`${event.id}-${attendee.userId}`}
                  name={attendee.name}
                  size="sm"
                  className="ring-2 ring-[var(--semantic-surface)]"
                />
              ))}
            </div>
          ) : null}
          <p className="text-xs text-muted">
            {buildPresenceCopy(
              goingCount,
              goingAttendees.map((a) => a.name),
            )}
          </p>
        </div>
      </div>
    </Link>
  )
}

// ── "Seus eventos" tab card (preserves the old card with RSVP + cancel) ─────

function OwnEventCard({
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
      className="rounded-xl border border-border bg-[var(--semantic-surface)] transition-opacity"
      style={{ opacity: cancelled ? 0.55 : 1 }}
    >
      <div className="p-4">
        <div className="flex gap-3">
          <EventDateBadge iso={event.starts_at} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 className="truncate text-sm font-semibold">
              {event.title}
              {cancelled && (
                <Chip size="sm" color="danger" variant="soft" className="ml-1.5">
                  Cancelado
                </Chip>
              )}
            </h2>
            <p className="text-xs text-muted">
              {formatTime(event.starts_at)}
              {event.ends_at && ` - ${formatTime(event.ends_at)}`}
            </p>
            {event.venue && <p className="truncate text-xs text-muted">📍 {event.venue}</p>}
          </div>
        </div>

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
  // goingAttendeesByEvent is the ONE batched profiles lookup per fetch — keyed
  // by event id, with up to 3 going attendees per event (R3 / privacy
  // boundary: no email, no raw CPF, only display_name which is already public
  // through RLS).
  const [goingAttendeesByEvent, setGoingAttendeesByEvent] = useState<
    Record<string, GoingAttendee[]>
  >({})
  const [viewingCityLabel, setViewingCityLabel] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>("list")
  const [period, setPeriod] = useState<PeriodValue>("week")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [seusTab, setSeusTab] = useState<SeusTab>("host")
  const [invites, setInvites] = useState<InvitedEventRow[] | null>(null)

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startsAt, setStartsAt] = useState("")
  const [venue, setVenue] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  // Onda F Task 4: o encontro recorrente. Só dois padrões, os mesmos exemplos
  // do plano — "toda primeira sexta" (monthly_weekday_ordinal) e "todo dia 15"
  // (monthly_day_of_month). A data final é calculada no servidor
  // (next_occurrence, via o trigger de criação) — aqui só se chama a mesma
  // função pra pré-visualizar e avisar de feriado antes do publicar.
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceType, setRecurrenceType] = useState<
    "monthly_weekday_ordinal" | "monthly_day_of_month"
  >("monthly_weekday_ordinal")
  const [recurrenceWeekday, setRecurrenceWeekday] = useState(5) // sexta
  const [recurrenceOrdinal, setRecurrenceOrdinal] = useState(1)
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState(15)
  const [holidayWarning, setHolidayWarning] = useState<string | null>(null)
  const { current } = useLocalityContext()
  const searchParams = useSearchParams()
  // Onda T Task 4: without this filter, a member with a declared transfer
  // (who is a locality member of both origin and destination) saw every
  // event from both cities mixed in one list. ?locality lets the city
  // switcher (CityReference) ask for the origin's events specifically;
  // absent it, this is always the member's current city.
  const viewingLocalityId = searchParams.get("locality") ?? current.id

  // City label: mirror the viewingCityLabel pattern from
  // apps/web/app/(shell)/communities/communities-screen.tsx. Common case is
  // "viewing = current" — fall straight to the locality context (no extra
  // round trip). For the rarer ?locality override, fetch the locality row.
  useEffect(() => {
    let cancelled = false
    if (viewingLocalityId === current.id) {
      setViewingCityLabel(
        current.stateCode ? `${current.cityName}, ${current.stateCode}` : current.cityName,
      )
      return () => {
        cancelled = true
      }
    }
    const supabase = createBrowserClient()
    ;(async () => {
      const { data, error: localityError } = await supabase
        .from("localities")
        .select("city_name, state_code")
        .eq("id", viewingLocalityId)
        .maybeSingle()
      if (cancelled) return
      if (localityError || !data) {
        setViewingCityLabel(null)
        return
      }
      const row = data as { city_name: string; state_code: string }
      setViewingCityLabel(row.state_code ? `${row.city_name}, ${row.state_code}` : row.city_name)
    })()
    return () => {
      cancelled = true
    }
  }, [viewingLocalityId, current.id, current.cityName, current.stateCode])

  // Onda F Task 4 Step 4: "a tela avisa o organizador no momento de
  // publicar a recorrência, e ele decide" — não move a data sozinho, só
  // avisa. Roda no momento em que os campos de recorrência mudam, não só no
  // submit, porque é aí que a pessoa ainda pode reconsiderar.
  useEffect(() => {
    if (!isRecurring || !startsAt) {
      setHolidayWarning(null)
      return
    }
    let cancelled = false
    const supabase = createBrowserClient()
    ;(async () => {
      const anchor = startsAt.slice(0, 10)
      const { data: nextDate, error: nextError } = await supabase.rpc("next_occurrence", {
        p_from: anchor,
        p_recurrence_type: recurrenceType,
        // exactOptionalPropertyTypes rejects an explicit `undefined` for an
        // optional key — the conditional spreads omit the key entirely
        // instead, for whichever pattern is not selected.
        ...(recurrenceType === "monthly_weekday_ordinal"
          ? { p_recurrence_weekday: recurrenceWeekday, p_recurrence_ordinal: recurrenceOrdinal }
          : { p_recurrence_day_of_month: recurrenceDayOfMonth }),
      })
      if (nextError || !nextDate || cancelled) return

      const { data: holidayData } = await supabase.rpc("check_recurrence_holiday", {
        p_date: nextDate,
      })
      if (cancelled) return
      const holiday = (
        holidayData as { is_holiday: boolean; holiday_name: string | null }[] | null
      )?.[0]
      setHolidayWarning(holiday?.is_holiday ? holiday.holiday_name : null)
    })()
    return () => {
      cancelled = true
    }
  }, [
    isRecurring,
    startsAt,
    recurrenceType,
    recurrenceWeekday,
    recurrenceOrdinal,
    recurrenceDayOfMonth,
  ])

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
      .eq("locality_id", viewingLocalityId)
      .order("starts_at", { ascending: true })

    if (eventsError) {
      setError(eventsError.message)
      setLoading(false)
      return
    }

    const events = (eventsData as EventRow[]) ?? []
    setEvents(events)

    // Determinism for the grid + tabs: order by created_at within each event.
    // Without it, two RSVP rows for the same event in the same occurrence
    // could swap order between requests and the "Leila, Andréa, João" name
    // order would flicker. See RECON-007 contract item A.3.
    const { data: rsvpsData } = await supabase
      .from("event_rsvps")
      .select("event_id, user_id, status, occurrence_date, created_at")
      .in(
        "event_id",
        events.map((e) => e.id),
      )
      .order("created_at", { ascending: true })

    // Onda F Task 4: a recurring event accumulates one event_rsvps row per
    // occurrence. Without this filter, "quem vai"/counts on the list mix
    // every occurrence anyone ever RSVP'd to into one number.
    const currentOccurrenceByEvent = new Map(events.map((e) => [e.id, e.starts_at.slice(0, 10)]))
    const currentRsvps = ((rsvpsData as RsvpRow[]) ?? []).filter(
      (r) => r.occurrence_date === currentOccurrenceByEvent.get(r.event_id),
    )

    setRsvps(currentRsvps)
    setLoading(false)

    // ONE batched profiles lookup for the going display_names shown on the
    // grid cards. Top 3 going per event (by created_at) — same order as the
    // RSVP fetch — so the name list and the avatar stack stay consistent.
    // Falls back to "Membro" if a profile is missing or the RLS-gated read
    // returns nothing.
    const goingByEvent = new Map<string, string[]>()
    const allGoingUserIds = new Set<string>()
    for (const r of currentRsvps) {
      if (r.status !== "going") continue
      const list = goingByEvent.get(r.event_id) ?? []
      if (list.length < 3) {
        list.push(r.user_id)
        allGoingUserIds.add(r.user_id)
      }
      goingByEvent.set(r.event_id, list)
    }

    if (allGoingUserIds.size > 0) {
      const { data: namesData, error: namesError } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", Array.from(allGoingUserIds))

      if (namesError) {
        console.error("explorar/eventos: could not load going names", namesError.message)
        // Fall through: cards render with "Membro" fallbacks.
      }

      const namesByUser = new Map(
        ((namesData as { user_id: string; display_name: string }[] | null) ?? []).map((p) => [
          p.user_id,
          p.display_name,
        ]),
      )

      const result: Record<string, GoingAttendee[]> = {}
      for (const [eventId, ids] of goingByEvent) {
        result[eventId] = ids.map((id) => ({ userId: id, name: namesByUser.get(id) ?? "Membro" }))
      }
      setGoingAttendeesByEvent(result)
    } else {
      setGoingAttendeesByEvent({})
    }
  }, [viewingLocalityId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  // RECON-043: "Seus eventos" decide entre as abas e o vazio com o mesmo
  // conjunto que ela mostra. Convite e um dos quatro estados (a aba Convidado),
  // entao a leitura precisa subir para a pagina em vez de viver no painel.
  const loadInvites = useCallback(() => {
    getInvitedEventsAction()
      .then((rows) => setInvites(rows))
      .catch(() => setInvites([]))
  }, [])

  useEffect(() => {
    loadInvites()
  }, [loadInvites])

  // P0 Task 9: load the locality member count to branch the empty state on the
  // §3.4 density threshold. The metric is a proxy (membership count, not weekly
  // active) — see comment in lib/locality-density.ts.
  useEffect(() => {
    let cancelled = false
    const supabase = createBrowserClient()
    ;(async () => {
      try {
        const { count } = await supabase
          .from("locality_memberships")
          .select("*", { count: "exact", head: true })
          .eq("locality_id", viewingLocalityId)
        if (!cancelled && count !== null) {
          setMemberCount(count)
        }
      } catch {
        /* silently fail — the empty state falls back to the standard copy */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [viewingLocalityId])

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
      locality_id: viewingLocalityId,
      title,
      description: description || null,
      // The server snaps this to the actual next occurrence of the pattern
      // (private.snap_recurring_event_start) — this is only the search
      // anchor and the time-of-day when isRecurring is set.
      starts_at: new Date(startsAt).toISOString(),
      venue: venue || null,
      recurrence_type: isRecurring ? recurrenceType : null,
      recurrence_weekday:
        isRecurring && recurrenceType === "monthly_weekday_ordinal" ? recurrenceWeekday : null,
      recurrence_ordinal:
        isRecurring && recurrenceType === "monthly_weekday_ordinal" ? recurrenceOrdinal : null,
      recurrence_day_of_month:
        isRecurring && recurrenceType === "monthly_day_of_month" ? recurrenceDayOfMonth : null,
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
    setIsRecurring(false)
    setHolidayWarning(null)
    setSubmitting(false)
    setView("list")
    fetchEvents()
  }

  const handleRsvp = async (eventId: string, status: "interested" | "going") => {
    if (!userId) return

    const supabase = createBrowserClient()

    const { error: rsvpError } = await supabase.from("event_rsvps").upsert(
      // occurrence_date is filled by the BEFORE INSERT trigger from the
      // event's current starts_at — see the comment in events/[id]/page.tsx.
      // The generated Insert type marks it required because it has no SQL
      // DEFAULT (only a trigger); `as never` matches the same override
      // events/[id]/page.tsx already uses for this exact shape.
      { event_id: eventId, user_id: userId, status } as never,
      { onConflict: "event_id,user_id,occurrence_date" },
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

  // ── derived views for the "Explorar" grid and "Seus eventos" tabs ────────

  const now = useMemo(() => new Date(), [])

  const activeEvents = useMemo(
    // Cancelled events never appear in the explorer grid (RECON-007 contract
    // A.2). They still appear in "Organizando" and "Confirmado" tabs of "Seus
    // eventos" — that semantic is owned by the existing OwnEventCard.
    () => events.filter((e) => e.status !== "cancelled"),
    [events],
  )

  const filteredEvents = useMemo(
    () => activeEvents.filter((e) => inPeriod(e.starts_at, period, now)),
    [activeEvents, period, now],
  )

  const goingCountByEvent = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rsvps) {
      if (r.status !== "going") continue
      map.set(r.event_id, (map.get(r.event_id) ?? 0) + 1)
    }
    return map
  }, [rsvps])

  const interestedCountByEvent = useMemo(() => {
    const map = new Map<string, number>()
    for (const r of rsvps) {
      if (r.status !== "interested") continue
      map.set(r.event_id, (map.get(r.event_id) ?? 0) + 1)
    }
    return map
  }, [rsvps])

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

  // RECON-043: um convite tambem e um evento proprio (aba Convidado), entao a
  // decisao de mostrar as abas ou o vazio considera os quatro estados. Enquanto
  // a leitura de convite nao chegou, a area nao declara vazio: o vazio e
  // informacao e apareceria cedo demais para quem tem convite.
  const hasOwnEvents = useMemo(() => {
    if (!userId) return (invites?.length ?? 0) > 0
    return (
      events.some((event) => event.organizer_id === userId) ||
      rsvps.some(
        (rsvp) =>
          rsvp.user_id === userId && (rsvp.status === "going" || rsvp.status === "interested"),
      ) ||
      (invites?.length ?? 0) > 0
    )
  }, [events, rsvps, userId, invites])

  const ownAreaPending = invites === null && !hasOwnEvents

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-6 py-8" aria-busy="true">
        <h1 className="text-2xl font-semibold tracking-tight">Explorar eventos</h1>
        <EventCardSkeleton />
        <EventCardSkeleton />
        <EventCardSkeleton />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Explorar eventos</h1>
            {viewingCityLabel ? <p className="text-sm text-muted">{viewingCityLabel}</p> : null}
          </div>
          <Button
            variant={view === "list" ? "primary" : "tertiary"}
            size="sm"
            className="min-h-11"
            onPress={() => setView(view === "list" ? "create" : "list")}
          >
            {view === "list" ? "Criar evento" : "Ver eventos"}
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => fetchEvents()} />}

      {view === "list" && (
        <div className="flex flex-col gap-6">
          {/* ── period filter (prancha 48 left panel) ────────────────────── */}

          {activeEvents.length > 0 ? (
            <div className="flex flex-col gap-1">
              <label htmlFor="filtro-periodo" className="text-xs font-medium text-muted">
                Período
              </label>
              <div className="relative max-w-xs">
                <select
                  id="filtro-periodo"
                  value={period}
                  onChange={(event) => setPeriod(event.target.value as PeriodValue)}
                  className="min-h-11 w-full appearance-none rounded-lg border border-border bg-[var(--semantic-surface)] px-3 pr-9 text-sm transition-colors duration-[var(--semantic-motion-duration-instant)]"
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                />
              </div>
            </div>
          ) : null}

          {/* ── explorer grid ────────────────────────────────────────────── */}

          {activeEvents.length === 0 ? (
            error !== null ? null : (
              <EmptyState
                title={
                  isLocalityStale(memberCount)
                    ? "Você é dos primeiros aqui."
                    : "Nenhum evento ainda"
                }
                description={
                  isLocalityStale(memberCount)
                    ? "Esta comunidade está começando. Crie o primeiro evento para abrir caminho para quem chegar depois."
                    : "Organize encontros e atividades para a sua comunidade."
                }
                illustration={<EventsIllustration />}
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    className="min-h-11"
                    onPress={() => setView("create")}
                  >
                    Criar evento
                  </Button>
                }
              />
            )
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              title="Nenhum evento neste período"
              description={
                period === "week"
                  ? "Não há eventos nos próximos 7 dias. Amplie o período para ver mais."
                  : "Não há eventos até o fim deste mês. Amplie o período para ver mais."
              }
              illustration={<EventsIllustration />}
              action={
                <Button
                  variant="primary"
                  size="sm"
                  className="min-h-11"
                  onPress={() => setPeriod("all")}
                >
                  Ampliar período
                </Button>
              }
            />
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredEvents.map((event) => {
                const goingCount = goingCountByEvent.get(event.id) ?? 0
                return (
                  <li key={event.id} className="flex">
                    <ExplorerEventCard
                      event={event}
                      goingCount={goingCount}
                      goingAttendees={goingAttendeesByEvent[event.id] ?? []}
                      href={`/events/${event.id}` as Route}
                    />
                  </li>
                )
              })}
            </ul>
          )}

          {/* ── Seus eventos ────────────────────────────────────────────── */}

          <section className="mt-2">
            <h2 className="mb-3 text-lg font-semibold tracking-tight">Seus eventos</h2>

            {ownAreaPending ? (
              <EventCardSkeleton />
            ) : hasOwnEvents ? (
              <Tabs
                aria-label="Seus eventos"
                selectedKey={seusTab}
                onSelectionChange={(key) => setSeusTab(key as SeusTab)}
                variant="secondary"
                className="tabs--secondary"
              >
                <Tabs.ListContainer>
                  <Tabs.List>
                    <Tabs.Tab id="host">Organizando</Tabs.Tab>
                    <Tabs.Tab id="going">Confirmado</Tabs.Tab>
                    <Tabs.Tab id="interested">Interessado</Tabs.Tab>
                    <Tabs.Tab id="invited">Convidado</Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>

                <TabPanel id="host" className="pt-3">
                  {seusFiltered.length === 0 ? (
                    <EmptyState
                      title="Você não organiza nenhum evento"
                      description="Crie um evento para sua comunidade e ele aparecerá aqui."
                      illustration={<EventsIllustration />}
                      action={
                        <Button
                          size="sm"
                          variant="primary"
                          className="min-h-11"
                          onPress={() => setView("create")}
                        >
                          Criar evento
                        </Button>
                      }
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {seusFiltered.map((event) => (
                        <OwnEventCard
                          key={event.id}
                          event={event}
                          interestedCount={interestedCountByEvent.get(event.id) ?? 0}
                          goingCount={goingCountByEvent.get(event.id) ?? 0}
                          myRsvp={null}
                          isOrganizer
                          onRsvp={() => {}}
                          onCancel={() => handleCancelEvent(event.id)}
                        />
                      ))}
                    </div>
                  )}
                </TabPanel>

                <TabPanel id="going" className="pt-3">
                  {seusFiltered.length === 0 ? (
                    <EmptyState
                      title="Nenhum evento confirmado"
                      description="Confirme presença em eventos da sua comunidade."
                      illustration={<EventsIllustration />}
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {seusFiltered.map((event) => {
                        const myRsvp = getRsvpStatus(event.id)
                        const isOrganizer = event.organizer_id === userId
                        return (
                          <OwnEventCard
                            key={event.id}
                            event={event}
                            interestedCount={interestedCountByEvent.get(event.id) ?? 0}
                            goingCount={goingCountByEvent.get(event.id) ?? 0}
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

                <TabPanel id="interested" className="pt-3">
                  {seusFiltered.length === 0 ? (
                    <EmptyState
                      title="Nenhum evento como interessado"
                      description="Marque interesse em eventos para acompanhá-los."
                      illustration={<EventsIllustration />}
                    />
                  ) : (
                    <div className="flex flex-col gap-3">
                      {seusFiltered.map((event) => {
                        const myRsvp = getRsvpStatus(event.id)
                        const isOrganizer = event.organizer_id === userId
                        return (
                          <OwnEventCard
                            key={event.id}
                            event={event}
                            interestedCount={interestedCountByEvent.get(event.id) ?? 0}
                            goingCount={goingCountByEvent.get(event.id) ?? 0}
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

                <TabPanel id="invited" className="pt-3">
                  <EventInvitesSection
                    invites={invites ?? []}
                    loaded={invites !== null}
                    onReload={loadInvites}
                  />
                </TabPanel>
              </Tabs>
            ) : (
              <EmptyState
                title="Nenhum evento seu ainda"
                description="Quando você organizar, confirmar presença, marcar interesse ou receber um convite, o evento aparece aqui."
                illustration={<EventsIllustration />}
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    className="min-h-11"
                    onPress={() => setView("create")}
                  >
                    Criar evento
                  </Button>
                }
              />
            )}
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

            {/* HeroUI v3 Checkbox is a compound component: the bare
                <Checkbox>label</Checkbox> shape renders only the layout
                field, with no clickable control — the interactive button
                lives in Checkbox.Content, and the visual box in
                Checkbox.Control/Indicator. Every other Checkbox call site in
                this app is missing this too (flagged separately). */}
            <Checkbox isSelected={isRecurring} onChange={setIsRecurring}>
              <Checkbox.Content>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                Este é um encontro recorrente
              </Checkbox.Content>
            </Checkbox>

            {isRecurring && (
              <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <Select
                  aria-label="Tipo de recorrência"
                  selectedKey={recurrenceType}
                  onSelectionChange={(key) => {
                    if (typeof key === "string") {
                      setRecurrenceType(key as typeof recurrenceType)
                    }
                  }}
                >
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item key="monthly_weekday_ordinal" id="monthly_weekday_ordinal">
                        Dia da semana do mês (ex: toda primeira sexta)
                      </ListBox.Item>
                      <ListBox.Item key="monthly_day_of_month" id="monthly_day_of_month">
                        Dia fixo do mês (ex: todo dia 15)
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>

                {recurrenceType === "monthly_weekday_ordinal" ? (
                  <div className="flex gap-2">
                    <Select
                      aria-label="Qual ocorrência do mês"
                      selectedKey={String(recurrenceOrdinal)}
                      onSelectionChange={(key) => {
                        if (typeof key === "string") setRecurrenceOrdinal(Number(key))
                      }}
                      className="flex-1"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {ORDINAL_LABELS.map((label, i) => (
                            <ListBox.Item key={label} id={String(i + 1)}>
                              {label}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <Select
                      aria-label="Dia da semana"
                      selectedKey={String(recurrenceWeekday)}
                      onSelectionChange={(key) => {
                        if (typeof key === "string") setRecurrenceWeekday(Number(key))
                      }}
                      className="flex-1"
                    >
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {WEEKDAY_LABELS.map((label, i) => (
                            <ListBox.Item key={label} id={String(i)}>
                              {label}
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </div>
                ) : (
                  <Input
                    aria-label="Dia do mês"
                    type="number"
                    min={1}
                    max={31}
                    value={String(recurrenceDayOfMonth)}
                    onChange={(e) =>
                      setRecurrenceDayOfMonth(Number((e.target as HTMLInputElement).value))
                    }
                  />
                )}

                <p className="text-xs text-muted">
                  A data acima só define o horário e o ponto de partida — o dia real é calculado
                  pelo padrão escolhido. Em meses mais curtos, o dia fixo é ajustado para o último
                  dia do mês, nunca para uma data inválida.
                </p>

                {holidayWarning && (
                  <FeedbackAlert
                    variant="warning"
                    description={`A próxima ocorrência cai em ${holidayWarning}. A data não é alterada automaticamente — mantenha, pule esta ocorrência depois de criar, ou escolha outro padrão.`}
                  />
                )}
              </div>
            )}

            <Button type="submit" variant="primary" className="w-full" isDisabled={submitting}>
              {submitting ? "Criando..." : "Criar evento"}
            </Button>
          </Form>
        </section>
      )}
    </div>
  )
}
