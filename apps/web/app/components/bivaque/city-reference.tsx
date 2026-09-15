"use client"

// City reference home — BIVAQUE.md §6.2.
//
// Rendered when the member does not belong to any community, and reused by the
// dedicated /localidade route built in Wave E Task 3. The four things the city
// layer IS, none of which is a timeline:
//
//   1. Próximos eventos — quadro de avisos do que atravessa as três forças.
//   2. Guia de chegada — referência curada e buscável (rota /guide).
//   3. Vitrine de prestadores — busca viva por nome/categoria dentro do
//      alcance do chamador (onda G Task 5); vazia é o estado normal do dia um.
//   4. Caminho para pedir entrada numa vila — /communities.
//
// O selo "alcance de post" não é uma seção desta tela: é uma configuração no
// composer (Task 4 da onda E). Quando o membro estiver numa vila, ele publica
// a partir de lá; quando não está, ele vê esta tela e ainda pode publicar com
// alcance da cidade a partir do modal.

import {
  PROVIDER_CATEGORIES,
  PROVIDER_CATEGORY_LABELS,
  type ProviderCategory,
} from "@bivaque/domain"
import { Button } from "@heroui/react"
import type { Route } from "next"
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

interface ProviderHit {
  id: string
  display_name: string
  category: ProviderCategory
  bio: string | null
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

  // Onda G Task 5 — vitrine viva na cidade. A primeira carga busca tudo que o
  // chamador alcança (a RLS da busca decide); os filtros só aparecem quando
  // existe ficha — §3.4 avisa que categoria demais com prestador de menos faz
  // tudo parecer vazio ao mesmo tempo.
  const [providers, setProviders] = useState<ProviderHit[]>([])
  const [providersLoaded, setProvidersLoaded] = useState(false)
  const [providersError, setProvidersError] = useState("")
  const [providerQuery, setProviderQuery] = useState("")
  const [providerCategory, setProviderCategory] = useState<"" | ProviderCategory>("")

  const loadProviders = useCallback(
    async (query: string, category: "" | ProviderCategory) => {
      setProvidersError("")
      // exactOptionalPropertyTypes: chaves ausentes, não undefined explícito.
      const args: { p_query?: string; p_category?: ProviderCategory } = {}
      if (query.trim().length > 0) args.p_query = query.trim()
      if (category !== "") args.p_category = category
      const { data, error: rpcError } = await supabase.rpc("search_providers", args)
      if (rpcError) {
        setProvidersError("Não foi possível carregar a vitrine agora. Tente novamente.")
        setProvidersLoaded(true)
        return
      }
      setProviders((data ?? []) as unknown as ProviderHit[])
      setProvidersLoaded(true)
    },
    [supabase],
  )

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

  useEffect(() => {
    void loadProviders("", "")
  }, [loadProviders])

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
        className="rounded-xl border border-border bg-[var(--semantic-surface)] p-4"
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
          <p className="mt-3 text-sm text-[var(--semantic-danger)]">{error}</p>
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
            className="inline-flex min-h-11 items-center text-sm font-medium text-[var(--semantic-action-primary)] transition-colors hover:underline"
          >
            Ver todos os eventos
          </Link>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Guia de chegada */}
        <section
          aria-labelledby="city-guide-heading"
          className="rounded-xl border border-border bg-[var(--semantic-surface)] p-4"
        >
          <h2 id="city-guide-heading" className="text-base font-semibold tracking-tight">
            Guia de chegada
          </h2>
          <p className="mt-2 text-sm text-muted">
            Colégio, hospital, transportadora, despachante — referência curada para quem chega ou
            precisa de informação permanente sobre a cidade.
          </p>
          <div className="mt-3">
            <Link
              href={isAlternate ? `/guide?locality=${viewing.id}` : "/guide"}
              className="inline-flex min-h-11 items-center rounded-full bg-[var(--semantic-action-primary)] px-4 text-sm font-semibold text-[var(--semantic-action-on-strong)] transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
            >
              Abrir o guia de chegada
            </Link>
          </div>
        </section>

        {/* Vitrine de prestadores — onda G Task 5 */}
        <section
          aria-labelledby="city-vitrine-heading"
          className="rounded-xl border border-border bg-[var(--semantic-surface)] p-4"
        >
          <h2 id="city-vitrine-heading" className="text-base font-semibold tracking-tight">
            Vitrine de prestadores
          </h2>
          {!providersLoaded ? (
            <div className="mt-3 space-y-2" aria-busy="true">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          ) : providersError ? (
            <p className="mt-3 text-sm text-[var(--semantic-danger)]">{providersError}</p>
          ) : providers.length === 0 ? (
            <EmptyState
              title="Ainda não há prestadores cadastrados por aqui."
              description="Quando membros das vilas indicarem prestadores de confiança, eles aparecem nesta vitrine."
            />
          ) : (
            <>
              <form
                className="mt-3 flex flex-wrap items-end gap-2"
                onSubmit={(event) => {
                  event.preventDefault()
                  void loadProviders(providerQuery, providerCategory)
                }}
              >
                <label className="text-xs text-muted" htmlFor="provider-search">
                  Buscar por nome
                </label>
                <input
                  id="provider-search"
                  value={providerQuery}
                  onChange={(event) => setProviderQuery(event.target.value)}
                  placeholder="Ex.: climatiza"
                  className="min-h-11 flex-1 rounded-md border border-border bg-transparent px-3 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
                />
                <label className="sr-only" htmlFor="provider-category">
                  Categoria
                </label>
                <select
                  id="provider-category"
                  value={providerCategory}
                  onChange={(event) => {
                    const next = event.target.value as "" | ProviderCategory
                    setProviderCategory(next)
                    void loadProviders(providerQuery, next)
                  }}
                  className="min-h-11 rounded-md border border-border bg-transparent px-2 text-sm transition-colors duration-[var(--semantic-motion-duration-fast)]"
                >
                  <option value="">Todas as categorias</option>
                  {PROVIDER_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {PROVIDER_CATEGORY_LABELS[value]}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="secondary">
                  Buscar
                </Button>
              </form>

              {providers.length === 0 ? (
                <p className="mt-3 text-sm text-muted">
                  Nenhum prestador encontrado com esses filtros.
                </p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {providers.map((provider) => (
                    <li key={provider.id}>
                      <Link
                        href={`/prestadores/${provider.id}` as Route}
                        className="flex min-h-11 flex-col justify-center rounded-md px-1 transition-colors hover:underline focus:outline-none focus-visible:underline"
                      >
                        <span className="text-sm font-medium">{provider.display_name}</span>
                        <span className="text-xs text-muted">
                          {PROVIDER_CATEGORY_LABELS[provider.category] ?? provider.category}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      </div>

      {/* Pedir entrada numa vila */}
      <section
        aria-labelledby="city-join-heading"
        className="rounded-xl border border-border bg-[var(--semantic-surface)] p-4"
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
            className="inline-flex min-h-11 items-center rounded-full bg-[var(--semantic-action-primary)] px-4 text-sm font-semibold text-[var(--semantic-action-on-strong)] transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
          >
            Ver vilas disponíveis
          </Link>
        </div>
      </section>
    </div>
  )
}
