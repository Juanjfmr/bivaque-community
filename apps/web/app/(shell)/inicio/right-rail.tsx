"use client"

import { BookOpen, ChevronRight, Luggage, Search } from "lucide-react"
import Link from "next/link"
import { Panel } from "../../components/ui/panel"
import type { HubEvent, Loaded } from "./hub-loaders"
import { WeekEventsList } from "./week-events"

// Trilho direito, só de 1024px para cima — o Início como hub (25/09/2026).
//
// Contextual, não um menu: a agenda da semana (abaixo de lg ela vira carrossel
// na coluna principal), a busca no Guia antes de perguntar, e "De mudança?".
// MovingCard também é montado na coluna principal abaixo de lg.

export function InicioRightRail({
  events,
  onRetry,
}: {
  events: Loaded<HubEvent[]>
  onRetry: () => void
}) {
  return (
    <aside className="hidden w-80 shrink-0 lg:block" aria-label="Contexto da home">
      <div className="sticky top-6 space-y-5">
        <WeekEventsList state={events} onRetry={onRetry} />
        <GuideSearchCard />
        <MovingCard />
      </div>
    </aside>
  )
}

// Antes de perguntar, procurar: um GET nativo para /guide com `q`, o mesmo
// parâmetro que "Ver todos" da busca global já usa. Funciona sem JS.
function GuideSearchCard() {
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <BookOpen size={20} className="mt-0.5 shrink-0 text-ui-brand" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ui-ink">Antes de perguntar</h2>
          <p className="mt-0.5 text-sm text-ui-ink-2">
            Serviços, lugares e indicações que a comunidade já compartilhou.
          </p>
        </div>
      </div>
      <form action="/guide" method="get" className="mt-3">
        <label htmlFor="rail-guia-busca" className="sr-only">
          Buscar no Guia da cidade
        </label>
        <div className="flex items-center gap-2 rounded-full bg-ui-bg px-4 transition-colors focus-within:bg-ui-surface focus-within:outline-2 focus-within:outline-ui-brand">
          <Search size={16} aria-hidden="true" className="shrink-0 text-ui-ink-2" />
          <input
            id="rail-guia-busca"
            name="q"
            type="search"
            placeholder="Buscar no Guia"
            autoComplete="off"
            className="min-h-11 w-full bg-transparent text-sm text-ui-ink outline-none transition-colors placeholder:text-ui-ink-2"
          />
        </div>
      </form>
      <Link
        href="/guide"
        className="-ml-2 mt-2 inline-flex min-h-11 items-center gap-1 rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
      >
        Ver Guia da cidade
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </Panel>
  )
}

// "De mudança?" leva ao fluxo real de transferência (/localidade).
export function MovingCard() {
  return (
    <Panel>
      <div className="flex items-start gap-3">
        <Luggage size={20} className="mt-0.5 shrink-0 text-ui-brand" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-ui-ink">De mudança?</h2>
          <p className="mt-0.5 text-sm text-ui-ink-2">Prepare sua chegada em outra cidade.</p>
          <Link
            href="/localidade"
            className="-ml-2 mt-1 inline-flex min-h-11 items-center gap-1 rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
          >
            Explorar destino
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </Panel>
  )
}
