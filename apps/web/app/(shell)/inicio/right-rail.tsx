"use client"

import { BookOpen, ChevronRight, Users } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { Card } from "../../components/bivaque/card"
import { eventDateChip, formatEventTimePtBr } from "./formatters"
import { createRequestGuard, loadNextEvent, type NextEvent } from "./home-loaders"

// RECON-002 (prancha 01): rail direito em telas largas.
//
// "Seu próximo encontro" só renderiza com evento real e upcoming da localidade
// do membro; sem evento (ou com consulta que falhou ou rejeitou) o card
// simplesmente não existe. Ao trocar de cidade o card da cidade anterior é
// limpo na hora e a resposta atrasada da consulta antiga é descartada pela
// guarda — dado de contexto anterior nunca fica pendurado na tela. A contagem
// "N pessoas vão" segue o mesmo filtro de ocorrência da lista de eventos
// (Onda F Task 4: evento recorrente acumula uma linha de event_rsvps por
// data) — contagem que não bate com a tela de detalhe é pior que nenhuma
// contagem, então erro na contagem omite a linha.
//
// Os atalhos apontam apenas para rotas com conteúdo real hoje: Guia da cidade
// (/guide) e Pedir ajuda (/recommendations). /explorar é estrutura inicial e
// não recebe atalho daqui.

type ShortcutRow = {
  href: string
  icon: typeof BookOpen
  title: string
  description: string
}

const SHORTCUTS: ShortcutRow[] = [
  {
    href: "/guide",
    icon: BookOpen,
    title: "Guia da cidade",
    description: "Escolas, saúde, transporte e utilidades",
  },
  {
    href: "/recommendations",
    icon: Users,
    title: "Pedir ajuda",
    description: "Tire dúvidas com a comunidade",
  },
]

export function InicioRightRail() {
  const [event, setEvent] = useState<NextEvent | null>(null)
  const { current } = useLocalityContext()
  const supabase = createBrowserClient()
  const guardRef = useRef(createRequestGuard())

  useEffect(() => {
    const isCurrent = guardRef.current.begin()
    setEvent(null)
    void loadNextEvent(supabase, current.id).then((next) => {
      if (isCurrent()) setEvent(next)
    })
  }, [supabase, current.id])

  return (
    <aside className="hidden w-72 shrink-0 lg:block" aria-label="Atalhos da home">
      <div className="sticky top-24 space-y-4">
        {event && <NextMeetingCard event={event} />}

        <Card className="p-4">
          <h2 className="text-sm font-semibold">Precisa de uma indicação?</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Encontre guias e peça ajuda para quem entende do assunto.
          </p>
          <ul className="mt-3">
            {SHORTCUTS.map((row) => (
              <li key={row.href}>
                <Link
                  href={row.href as Route}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                >
                  <row.icon size={20} className="shrink-0 text-accent" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{row.title}</span>
                    <span className="block text-xs text-muted">{row.description}</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </aside>
  )
}

function NextMeetingCard({ event }: { event: NextEvent }) {
  const chip = eventDateChip(event.startsAt)
  const time = formatEventTimePtBr(event.startsAt)
  const peopleLine =
    event.goingCount === null || event.goingCount === 0
      ? null
      : event.goingCount === 1
        ? "1 pessoa vai"
        : `${event.goingCount} pessoas vão`

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold">Seu próximo encontro</h2>
      <div className="mt-3 flex items-start gap-3">
        <div className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-[var(--semantic-selected)] py-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide">{chip.weekday}</span>
          <span className="text-lg font-semibold leading-tight">{chip.day}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{event.title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {event.venue ? `${time} · ${event.venue}` : time}
          </p>
          {peopleLine && <p className="mt-0.5 text-xs text-muted">{peopleLine}</p>}
        </div>
      </div>
      <Link
        href={`/events/${event.id}` as Route}
        className="mt-3 flex min-h-11 items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
      >
        Ver evento
      </Link>
    </Card>
  )
}
