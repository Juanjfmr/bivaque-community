"use client"

import { BookOpen, ChevronDown, ChevronRight, Luggage, Users, Wrench } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { MemberAvatar } from "../../components/bivaque/avatar"
import { Card } from "../../components/bivaque/card"
import { eventDateChip, formatEventTimePtBr } from "./formatters"
import { buildGoingLine, type NextEvent } from "./home-loaders"

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
// (/guide), Pedir ajuda (/recommendations) e Serviços (/explorar/servicos),
// a terceira entrada que a prancha 01 desenha e o runtime não mostrava.

type ShortcutRow = {
  href: string
  icon: typeof BookOpen
  title: string
  description: string
}

const SHORTCUTS: ShortcutRow[] = [
  {
    href: "/explorar/servicos",
    icon: Wrench,
    title: "Serviços",
    description: "Encontre quem faz o serviço perto de você",
  },
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

export function InicioRightRail({ event }: { event: NextEvent | null }) {
  return (
    <aside className="hidden w-72 shrink-0 lg:block" aria-label="Atalhos da home">
      <div className="sticky top-24 space-y-4">
        {event && <NextMeetingCard event={event} />}

        <HomeShortcutCards />
      </div>
    </aside>
  )
}

// Abaixo de 1024px a prancha não desenha rail (`hidden lg:block`): o trilho some
// inteiro, e sumir com o que é complemento é decisão de densidade legítima. O
// que NÃO pode sumir é o que só existe ali — os três atalhos e "De mudança?"
// não têm contraparte visível em nenhum outro lugar de /inicio nessa largura
// (medido: os hrefs visíveis da rota a 375/768 são /recommendations,
// /recommendations?aba=request, /events/<id>, /inicio, /explorar, /communities —
// /guide, /explorar/servicos e /localidade não estão entre eles).
//
// O disclosure fechado desce para a coluna principal logo depois do lançador de
// intenções: um toque abre, o primeiro item do feed continua dentro da dobra
// (a razão de o lançador compacto existir, DS-006) e a composição de ≥1024px
// não muda em nada — o trilho continua sendo o mesmo <aside>.
export function InicioRailDisclosure() {
  return (
    <details data-p2="home-atalhos" className="lg:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-xl border border-border bg-[var(--semantic-surface)] px-4 py-2 text-sm font-medium">
        Atalhos da home
        <ChevronDown size={18} className="shrink-0 text-muted" aria-hidden="true" />
      </summary>
      <div className="mt-3 space-y-4">
        <HomeShortcutCards />
      </div>
    </details>
  )
}

// Os dois cards de atalho, uma única fonte para o trilho (≥1024px) e para o
// disclosure (<1024px). O card "Seu próximo encontro" fica de fora de propósito:
// o mesmo evento, do mesmo loader, já é desenhado no feed como FeedEventCard
// (community-section.tsx), então repeti-lo no telefone seria só ruído.
function HomeShortcutCards() {
  return (
    <>
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

      {/* Prancha 01, módulo inferior do rail: "De mudança?" leva ao fluxo de
          transferência de localidade (/localidade, RECON-082) — a rota real
          do declare_locality_transfer, nunca uma promessa de destino. */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--semantic-selected)] text-accent">
            <Luggage size={20} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold">De mudança?</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Prepare sua chegada em outra cidade.
            </p>
            <Link
              href="/localidade"
              className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-medium text-accent transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
            >
              Explorar destino
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Card>
    </>
  )
}

function NextMeetingCard({ event }: { event: NextEvent }) {
  const chip = eventDateChip(event.startsAt)
  const time = formatEventTimePtBr(event.startsAt)
  const goingAttendees = event.goingAttendees.slice(0, 4)
  const peopleLine = buildGoingLine(
    goingAttendees.map((attendee) => attendee.name),
    event.goingCount ?? 0,
  )

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
        </div>
      </div>
      {goingAttendees.length > 0 && (
        <div className="mt-3 flex -space-x-2" aria-hidden="true">
          {goingAttendees.map((attendee) => (
            <MemberAvatar
              key={attendee.userId}
              name={attendee.name}
              size="sm"
              className="ring-2 ring-[var(--semantic-surface)]"
            />
          ))}
        </div>
      )}
      {peopleLine && <p className="mt-2 text-xs text-muted">{peopleLine}</p>}
      <Link
        href={`/events/${event.id}` as Route}
        className="mt-3 flex min-h-11 items-center justify-center rounded-lg border border-border text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
      >
        Ver evento
      </Link>
    </Card>
  )
}
