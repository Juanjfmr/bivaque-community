"use client"

import { CalendarDays, ChevronDown, ChevronRight, ShieldCheck, Users } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { type ReactNode, useEffect, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { eventDateChip } from "../../(shell)/inicio/formatters"
import { Skeleton } from "./skeleton"

// O trilho da Comunidade (25/09/2026, sistema visual mínimo). Referências do
// Mobbin: as regras da comunidade no trilho do X, os próximos encontros do
// Circle. Três painéis, cada linha leva a algum lugar.

interface EventItem {
  id: string
  title: string
  starts_at: string
}

interface GroupItem {
  id: string
  name: string
}

export interface FeedRailData {
  events: EventItem[]
  groups: GroupItem[]
  loaded: boolean
  /** Leitura que falhou não vira "nenhum evento": o painel diz que não carregou. */
  failed: boolean
}

// A leitura do trilho mora aqui, uma vez só: o trilho (≥1024px) e o disclosure
// do telefone (<1024px) são duas montagens do MESMO dado, e duas instâncias
// buscando por conta própria dobrariam as consultas sem necessidade.
//
// A consulta dispara na MONTAGEM, sem portão. Um `enabled` derivado de
// `hasResolved && primaryCommunityId` parecia econômico — evita a consulta
// quando a rota cai em CityReference — mas serializava a leitura do trilho
// atrás da resolução de membership da página. Medido a 1440 e 375, tempo até o
// dado do trilho aparecer: 2.360 ms antes, ~4.700 ms com o portão, 2.264/2.370
// ms sem ele. Latência no caminho principal custa mais caro do que duas
// consultas ociosas no estado de exceção (membro sem comunidade aprovada).
export function useFeedRailData(): FeedRailData {
  const [state, setState] = useState<FeedRailData>({
    events: [],
    groups: [],
    loaded: false,
    failed: false,
  })
  const { current } = useLocalityContext()

  useEffect(() => {
    let cancelled = false
    const supabase = createBrowserClient()

    async function load() {
      const now = new Date().toISOString()
      const [eventsResult, groupsResult] = await Promise.all([
        supabase
          .from("events")
          .select("id, title, starts_at")
          .eq("locality_id", current.id)
          .gte("starts_at", now)
          .order("starts_at", { ascending: true })
          .limit(3),
        supabase.from("groups").select("id, name").eq("locality_id", current.id).limit(3),
      ])
      if (cancelled) return
      setState({
        events: (eventsResult.data ?? []) as EventItem[],
        groups: (groupsResult.data ?? []) as GroupItem[],
        loaded: true,
        failed: Boolean(eventsResult.error || groupsResult.error),
      })
    }

    void load().catch(() => {
      if (!cancelled) setState({ events: [], groups: [], loaded: true, failed: true })
    })
    return () => {
      cancelled = true
    }
  }, [current.id])

  return state
}

// Trilho do desktop (≥1024px). Abaixo disso o mesmo painel desce como
// disclosure na coluna do feed.
export function FeedRightRail({ data }: { data: FeedRailData }) {
  return (
    <aside className="hidden w-80 shrink-0 lg:block" aria-label="Contexto da comunidade">
      <div className="sticky top-6 space-y-5">
        <FeedRailPanels data={data} />
      </div>
    </aside>
  )
}

// Abaixo de 1024px o trilho não existe, e o que ele carrega aqui é informação
// que a rota não dá em nenhum outro lugar: o feed da vila é compositor, ordem e
// publicações — não lista eventos, não lista grupos e não enuncia as regras. Por
// isso ele desce fechado para a coluna principal: um toque abre, e o feed (que
// não tem limite de itens) não é empurrado para baixo de uma lista de contexto.
export function FeedRailDisclosure({ data }: { data: FeedRailData }) {
  return (
    <details data-p2="feed-painel" className="group lg:hidden">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-ui-lg bg-ui-surface px-4 py-2 text-sm font-semibold text-ui-ink shadow-ui ring-1 ring-ui-line transition-colors hover:bg-ui-subtle [&::-webkit-details-marker]:hidden">
        Encontros, grupos e boas práticas
        <ChevronDown
          size={18}
          className="shrink-0 text-ui-ink-2 transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="mt-3 space-y-4">
        <FeedRailPanels data={data} />
      </div>
    </details>
  )
}

function RailPanel({
  title,
  icon: Icon,
  href,
  linkLabel,
  children,
}: {
  title: string
  icon: typeof CalendarDays
  href?: string
  linkLabel?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-ui-lg border border-ui-line bg-ui-surface py-4 shadow-ui">
      <header className="flex items-center justify-between gap-2 px-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ui-ink">
          <Icon size={16} className="text-ui-brand" aria-hidden="true" />
          {title}
        </h2>
        {href && linkLabel ? (
          <Link
            href={href as Route}
            className="-mr-2 inline-flex min-h-11 items-center gap-1 rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
          >
            {linkLabel}
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </header>
      <div className="mt-1 px-3">{children}</div>
    </section>
  )
}

function RailMessage({ children }: { children: ReactNode }) {
  return <p className="px-2 py-1 text-sm text-ui-ink-2">{children}</p>
}

function FeedRailPanels({ data }: { data: FeedRailData }) {
  const { events, groups, loaded, failed } = data

  return (
    <>
      <RailPanel title="Próximos encontros" icon={CalendarDays} href="/events" linkLabel="Agenda">
        {!loaded ? (
          <div className="space-y-2 px-2" aria-busy="true">
            <Skeleton className="h-12 w-full rounded-ui" />
            <Skeleton className="h-12 w-full rounded-ui" />
          </div>
        ) : failed && events.length === 0 ? (
          <RailMessage>Não foi possível carregar os encontros.</RailMessage>
        ) : events.length === 0 ? (
          <RailMessage>Nenhum encontro marcado por enquanto.</RailMessage>
        ) : (
          <ul>
            {events.map((event) => {
              const chip = eventDateChip(event.starts_at)
              return (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}` as Route}
                    className="flex min-h-11 items-center gap-3 rounded-ui px-2 py-2 transition-colors hover:bg-ui-subtle"
                  >
                    <span className="flex w-11 shrink-0 flex-col items-center rounded-ui bg-ui-brand-soft py-1">
                      <span className="text-xs font-semibold text-ui-brand uppercase">
                        {chip.weekday}
                      </span>
                      <span className="text-base leading-tight font-semibold text-ui-ink">
                        {chip.day}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-sm font-medium text-ui-ink">
                      {event.title}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </RailPanel>

      <RailPanel title="Grupos ativos" icon={Users} href="/groups" linkLabel="Ver todos">
        {!loaded ? (
          <div className="space-y-2 px-2" aria-busy="true">
            <Skeleton className="h-5 w-full rounded-ui" />
            <Skeleton className="h-5 w-3/4 rounded-ui" />
          </div>
        ) : failed && groups.length === 0 ? (
          <RailMessage>Não foi possível carregar os grupos.</RailMessage>
        ) : groups.length === 0 ? (
          <RailMessage>Nenhum grupo ainda.</RailMessage>
        ) : (
          <ul>
            {groups.map((group) => (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.id}` as Route}
                  className="flex min-h-11 items-center gap-3 rounded-ui px-2 py-1.5 transition-colors hover:bg-ui-subtle"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-ui bg-ui-brand-soft text-sm font-semibold text-ui-brand"
                  >
                    {group.name.trim().charAt(0).toUpperCase() || "?"}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-ui-ink">
                    {group.name}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ui-ink-2" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </RailPanel>

      <RailPanel title="Boas práticas" icon={ShieldCheck}>
        <ol className="space-y-3 px-2 pt-1 pb-1 text-sm text-ui-ink-2">
          {[
            "Respeite todos os membros da comunidade.",
            "Venda e anúncio vão no Mercado, não no feed.",
            "Não compartilhe dados pessoais militares de outra pessoa.",
          ].map((rule, index) => (
            <li key={rule} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ui-brand-soft text-xs font-semibold text-ui-brand"
              >
                {index + 1}
              </span>
              <span className="pt-0.5">{rule}</span>
            </li>
          ))}
        </ol>
      </RailPanel>
    </>
  )
}
