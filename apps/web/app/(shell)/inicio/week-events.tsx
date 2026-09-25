"use client"

import { CalendarDays, ChevronRight, Clock, MapPin } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { Skeleton } from "../../components/bivaque/skeleton"
import { eventDateChip, formatEventTimePtBr } from "./formatters"
import type { HubEvent, Loaded } from "./hub-loaders"
import { HubError, HubSection } from "./hub-section"

// "Esta semana" — os encontros das próximas duas semanas na cidade. Duas
// montagens do MESMO dado (o hook do Início lê uma vez): carrossel na coluna
// principal abaixo de 1024px (referências: Meetup "Incoming", Fixtured "Coming
// up") e lista compacta no trilho do desktop. Sem encontro nas duas semanas,
// nenhuma das duas aparece: a agenda continua a um toque, no atalho Encontros.

function DateBadge({ startsAt }: { startsAt: string }) {
  const chip = eventDateChip(startsAt)
  return (
    <div className="flex w-12 shrink-0 flex-col items-center rounded-ui bg-ui-brand-soft py-1.5">
      <span className="text-xs font-semibold tracking-wide text-ui-brand uppercase">
        {chip.weekday}
      </span>
      <span className="text-xl leading-tight font-semibold text-ui-ink">{chip.day}</span>
    </div>
  )
}

function EventLine({ event }: { event: HubEvent }) {
  const time = formatEventTimePtBr(event.startsAt)
  return (
    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-ui-ink-2">
      <Clock size={12} className="shrink-0" aria-hidden="true" />
      <span className="shrink-0">{time}</span>
      {event.venue ? (
        <>
          <MapPin size={12} className="ml-1 shrink-0" aria-hidden="true" />
          <span className="truncate">{event.venue}</span>
        </>
      ) : null}
    </p>
  )
}

export function WeekEventsCarousel({
  state,
  onRetry,
  consult = false,
}: {
  state: Loaded<HubEvent[]>
  onRetry: () => void
  /** Consulta a outra cidade: sem o atalho "Agenda", que é da sua cidade. */
  consult?: boolean
}) {
  if (state.status === "ready" && state.data.length === 0) return null
  return (
    <HubSection
      id="secao-semana"
      title={consult ? "Próximos encontros" : "Esta semana"}
      icon={CalendarDays}
      href={consult ? null : "/events"}
      linkLabel="Agenda"
      flush
    >
      {state.status === "loading" ? (
        <div className="flex gap-3 overflow-hidden px-4 sm:px-5" aria-busy="true">
          {[0, 1].map((key) => (
            <Skeleton key={key} className="h-20 w-64 shrink-0 rounded-ui" />
          ))}
        </div>
      ) : state.status === "error" ? (
        <HubError what="os encontros" onRetry={onRetry} />
      ) : (
        <div className="px-4 sm:px-5">
          <ul className="-mb-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
            {state.data.map((event) => (
              <li key={event.id} className="w-64 shrink-0 snap-start">
                <Link
                  href={`/events/${event.id}` as Route}
                  className="flex h-full items-start gap-3 rounded-ui bg-ui-bg p-3 transition-colors hover:bg-ui-subtle"
                >
                  <DateBadge startsAt={event.startsAt} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-ui-ink">{event.title}</p>
                    <EventLine event={event} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </HubSection>
  )
}

export function WeekEventsList({
  state,
  onRetry,
}: {
  state: Loaded<HubEvent[]>
  onRetry: () => void
}) {
  if (state.status === "ready" && state.data.length === 0) return null
  return (
    <section
      aria-labelledby="rail-semana-titulo"
      className="rounded-ui-lg border border-ui-line bg-ui-surface py-4 shadow-ui"
    >
      <header className="flex items-center justify-between gap-2 px-5">
        <h2 id="rail-semana-titulo" className="text-sm font-semibold text-ui-ink">
          Esta semana
        </h2>
        <Link
          href="/events"
          className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
        >
          Agenda
          <ChevronRight size={16} aria-hidden="true" />
        </Link>
      </header>
      {state.status === "loading" ? (
        <div className="space-y-2 px-5" aria-busy="true">
          <Skeleton className="h-14 w-full rounded-ui" />
          <Skeleton className="h-14 w-full rounded-ui" />
        </div>
      ) : state.status === "error" ? (
        <HubError what="os encontros" onRetry={onRetry} />
      ) : (
        <div className="px-3">
          <ul>
            {state.data.slice(0, 4).map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}` as Route}
                  className="flex items-start gap-3 rounded-ui px-2 py-2 transition-colors hover:bg-ui-subtle"
                >
                  <DateBadge startsAt={event.startsAt} />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-ui-ink">{event.title}</p>
                    <EventLine event={event} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
