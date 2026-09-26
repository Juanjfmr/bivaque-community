"use client"

import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  CalendarDays,
  House,
  MessageCircleQuestion,
  ShoppingBag,
  Wrench,
} from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { forwardRef } from "react"
import { countThisWeek, formatCount, type Loaded, weekAgo } from "./hub-loaders"
import { type HubNovelty, newLabel } from "./hub-view"
import { countInWindow } from "./novelty"
import type { HubData } from "./use-hub-data"

// Os atalhos das verticais (referências: Grab, Careem, DICE): tudo que o
// Bivaque oferece a um toque, sem passar pelo Explorar. Cada atalho diz o que
// está acontecendo ali — "3 esta semana", "12 novos" — o que faz desta grade
// o resumo do dia e não só um menu (a faixa de números do HoneyBook, fundida
// aos atalhos para não virar um bloco a mais).
//
// Contador é contexto, não conteúdo: se a leitura falha ou ainda carrega, o
// atalho mostra a descrição fixa e continua funcionando. Nunca "0" inventado.
//
// Com visita anterior, o número passa a ser "desde a última visita" e o atalho
// ganha o ponto de novidade; sem ela (primeira visita), vale o retrato da semana.

interface Live {
  text: string
  /** Chegou desde a última visita: ponto no ícone. */
  fresh: boolean
}

interface LiveInput {
  data: HubData
  now: Date
  novelty: HubNovelty
  hasVisit: boolean
}

interface Shortcut {
  href: string
  label: string
  icon: LucideIcon
  fallback: string
  live: (input: LiveInput) => Live | null
}

function fresh(count: number, gender: "m" | "f"): Live | null {
  return count > 0 ? { text: newLabel(count, gender), fresh: true } : null
}

function readyCount<T>(state: Loaded<T>, pick: (data: T) => number): number | null {
  return state.status === "ready" ? pick(state.data) : null
}

const SHORTCUTS: Shortcut[] = [
  {
    href: "/indicacoes",
    label: "Perguntas",
    icon: MessageCircleQuestion,
    fallback: "À cidade",
    live: ({ data, novelty }) => {
      const recent = fresh(novelty.questions, "f")
      if (recent) return recent
      const count = readyCount(data.questions, (q) => q.count)
      if (count === null || count === 0) return null
      return { text: `${formatCount(count)} ${count === 1 ? "aberta" : "abertas"}`, fresh: false }
    },
  },
  {
    href: "/events",
    label: "Encontros",
    icon: CalendarDays,
    fallback: "Agenda",
    live: ({ data, now }) => {
      const count = readyCount(data.events, (events) => countThisWeek(events, now))
      if (count === null || count === 0) return null
      return { text: `${count} esta semana`, fresh: false }
    },
  },
  {
    href: "/mercado",
    label: "Mercado",
    icon: ShoppingBag,
    fallback: "Compra e venda",
    live: ({ data, now, novelty, hasVisit }) => {
      if (hasVisit) return fresh(novelty.market, "m")
      const count = readyCount(data.listingTimes, (times) =>
        countInWindow(times, { since: weekAgo(now), until: now }),
      )
      if (count === null || count === 0) return null
      return { text: newLabel(count, "m"), fresh: false }
    },
  },
  {
    href: "/guide",
    label: "Guia",
    icon: BookOpen,
    fallback: "Da cidade",
    live: ({ novelty }) => fresh(novelty.guide, "m"),
  },
  {
    href: "/explorar/servicos",
    label: "Serviços",
    icon: Wrench,
    fallback: "Perto de você",
    live: () => null,
  },
  {
    href: "/imoveis",
    label: "Imóveis",
    icon: House,
    fallback: "Para morar",
    live: ({ novelty }) => fresh(novelty.properties, "m"),
  },
]

export const HubShortcuts = forwardRef<HTMLElement, LiveInput>(function HubShortcuts(input, ref) {
  return (
    <section ref={ref} aria-label="Atalhos do Bivaque" id="hub-atalhos">
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        {SHORTCUTS.map((shortcut) => {
          const live = shortcut.live(input)
          return (
            <li key={shortcut.href}>
              <Link
                href={shortcut.href as Route}
                className="group flex h-full flex-col items-center gap-2 rounded-ui-lg bg-ui-surface px-2 py-3 text-center shadow-ui ring-1 ring-ui-line transition-shadow duration-200 hover:shadow-ui-hover"
              >
                <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-ui-brand-soft text-ui-brand transition-transform duration-200 group-hover:scale-105">
                  <shortcut.icon size={20} aria-hidden="true" />
                  {live?.fresh ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-0 right-0 h-3 w-3 rounded-full bg-ui-brand ring-2 ring-ui-surface"
                    />
                  ) : null}
                </span>
                <span className="text-sm font-semibold text-ui-ink">{shortcut.label}</span>
                <span
                  className={`-mt-1 line-clamp-1 text-xs ${live ? "font-medium text-ui-brand" : "text-ui-ink-2"}`}
                >
                  {live?.text ?? shortcut.fallback}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
})
