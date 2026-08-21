"use client"

// City reference home — BIVAQUE.md §6.2.
//
// Rendered when the member does not belong to any community, and reused by the
// dedicated /localidade route built in Wave E Task 3. The four things the city
// layer IS, none of which is a timeline:
//
//   1. Próximos eventos — quadro de avisos do que atravessa as três forças.
//   2. Guia de chegada — referência curada e buscável (rota /guide).
//   3. Vitrine de prestadores — placeholder, vazia até a onda G (aqui não finge
//      movimento).
//   4. Caminho para pedir entrada numa vila — /communities.
//
// O selo "alcance de post" não é uma seção desta tela: é uma configuração no
// composer (Task 4 da onda E). Quando o membro estiver numa vila, ele publica
// a partir de lá; quando não está, ele vê esta tela e ainda pode publicar com
// alcance da cidade a partir do modal.

import { Button } from "@heroui/react"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { type LocalityCurrent, useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { EmptyState } from "./empty-state"
import { Skeleton } from "./skeleton"

interface EventItem {
  id: string
  title: string
  starts_at: string
}

function formatDayMonth(iso: string): string {
  const d = new Date(iso)
  const day = d.getDate()
  const months = [
    "jan",
    "fev",
    "mar",
    "abr",
    "mai",
    "jun",
    "jul",
    "ago",
    "set",
    "out",
    "nov",
    "dez",
  ]
  return `${day} ${months[d.getMonth()]}`
}

export function CityReference({
  onPublish,
  locality,
}: {
  onPublish?: () => void
  // Onda T Task 4: the switcher passes the origin here to render its
  // reference content without changing which locality is canonically
  // "current" (that stays a DB fact, decided only by declare/reverse
  // transfer). Defaults to the context's current locality — every existing
  // caller (the community home fallback) keeps behaving exactly as before.
  locality?: LocalityCurrent
}) {
  const { current } = useLocalityContext()
  const viewing = locality ?? current
  const isAlternate = locality !== undefined && locality.id !== current.id
  const supabase = createBrowserClient()
  const [events, setEvents] = useState<EventItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoaded(false)
    setError("")
    const now = new Date().toISOString()
    const { data, error: eventsError } = await supabase
      .from("events")
      .select("id, title, starts_at")
      .eq("locality_id", viewing.id)
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(6)

    if (eventsError) {
      setError("Não foi possível carregar os eventos da cidade. Tente novamente.")
      setLoaded(true)
      return
    }

    setEvents((data ?? []) as unknown as EventItem[])
    setLoaded(true)
  }, [supabase, viewing.id])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="mx-auto flex w-full max-w-[56rem] flex-col gap-6 px-4 pt-6 pb-8">
      {/* Locality header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{viewing.cityName}</h1>
          <p className="text-sm text-muted">
            {isAlternate
              ? `Referência de ${viewing.cityName} — eventos, guia de chegada e o caminho para pedir entrada numa vila.`
              : `Você está em ${viewing.cityName}. Esta é a referência da cidade — eventos, guia de
            chegada e o caminho para pedir entrada numa vila.`}
          </p>
        </div>
        {onPublish ? (
          <Button size="sm" variant="primary" onPress={onPublish}>
            Publicar
          </Button>
        ) : null}
      </header>

      {/* Próximos eventos da cidade */}
      <section
        aria-labelledby="city-events-heading"
        className="rounded-xl border border-border bg-[var(--surface)] p-4"
      >
        <h2 id="city-events-heading" className="text-base font-semibold tracking-tight">
          Próximos eventos da cidade
        </h2>
        {!loaded ? (
          <div className="mt-3 space-y-2" aria-busy="true">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
        ) : error ? (
          <p className="mt-3 text-sm text-[var(--danger)]">{error}</p>
        ) : events.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nenhum evento próximo na cidade.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {events.map((evt) => (
              <li key={evt.id}>
                <Link
                  href={`/events/${evt.id}`}
                  className="flex min-h-11 items-center gap-3 rounded-md transition-colors hover:underline focus:outline-none focus-visible:underline"
                >
                  <span className="shrink-0 text-xs font-medium text-muted w-12 text-right">
                    {formatDayMonth(evt.starts_at)}
                  </span>
                  <span className="text-sm truncate">{evt.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Link
            href={isAlternate ? `/events?locality=${viewing.id}` : "/events"}
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--accent)] transition-colors hover:underline"
          >
            Ver todos os eventos
          </Link>
        </div>
      </section>

      {/* Guia de chegada */}
      <section
        aria-labelledby="city-guide-heading"
        className="rounded-xl border border-border bg-[var(--surface)] p-4"
      >
        <h2 id="city-guide-heading" className="text-base font-semibold tracking-tight">
          Guia de chegada
        </h2>
        <p className="mt-2 text-sm text-muted">
          Moradia, escola, mudança, saúde, transporte e rotina da casa — um roteiro de D-60 a
          D+60, somado às indicações locais curadas pela comunidade.
        </p>
        <div className="mt-3">
          <Link
            href={isAlternate ? `/guide?locality=${viewing.id}` : "/guide"}
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
          >
            Abrir o guia de chegada
          </Link>
        </div>
      </section>

      {/* Vitrine — placeholder honesto até a onda G */}
      <section
        aria-labelledby="city-vitrine-heading"
        className="rounded-xl border border-border bg-[var(--surface)] p-4"
      >
        <h2 id="city-vitrine-heading" className="text-base font-semibold tracking-tight">
          Vitrine de prestadores
        </h2>
        <EmptyState
          title="A vitrine ainda está vazia nesta cidade."
          description="Quando os prestadores que atendem a cidade forem cadastrados, eles aparecem aqui. Isso é trabalho da onda G."
        />
      </section>

      {/* Pedir entrada numa vila */}
      <section
        aria-labelledby="city-join-heading"
        className="rounded-xl border border-border bg-[var(--surface)] p-4"
      >
        <h2 id="city-join-heading" className="text-base font-semibold tracking-tight">
          Entrar numa vila
        </h2>
        <p className="mt-2 text-sm text-muted">
          A vila é a sala: o lugar onde o conteúdo acontece, com 500 a 600 pessoas que dividem o
          mesmo condomínio e os mesmos ciclos de transferência. Você pede entrada, o dono aprova.
        </p>
        <div className="mt-3">
          <Link
            href="/communities"
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--accent)] px-4 text-sm font-semibold text-[var(--accent-foreground)] transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
          >
            Ver vilas disponíveis
          </Link>
        </div>
      </section>
    </div>
  )
}
