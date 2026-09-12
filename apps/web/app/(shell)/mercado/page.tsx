"use client"

import { Button } from "@heroui/react"
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import {
  categoryLabel,
  hasActiveFilters,
  LISTING_CATEGORIES,
  LISTING_CONDITIONS,
  LISTING_PAGE_SIZE,
  LISTING_SORT_OPTIONS,
  type ListingSearchState,
  type ListingSort,
  MAX_LISTING_PRICE_CENTS,
  parseListingSearch,
  parsePriceInput,
  serializeListingSearch,
} from "../../../lib/listings/catalog"
import { listingsClient } from "../../../lib/listings/client"
import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { Skeleton } from "../../components/bivaque/skeleton"
import { ListingCard, type ListingPhotoRow, type ListingRow } from "./mercado-shared"

export default function MercadoPage() {
  return (
    <Suspense fallback={<MercadoSkeleton />}>
      <MercadoContent />
    </Suspense>
  )
}

function MercadoSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8" aria-busy="true">
      <h1 className="text-2xl font-semibold tracking-tight">
        O que você precisa pode estar por perto
      </h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-64 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

interface FetchState {
  status: "loading" | "ready" | "error"
  listings: ListingRow[]
  photos: Record<string, string | null>
  saved: Set<string>
  total: number
  regions: string[]
}

const INITIAL_STATE: FetchState = {
  status: "loading",
  listings: [],
  photos: {},
  saved: new Set<string>(),
  total: 0,
  regions: [],
}

function orderBy(sort: ListingSort): { column: string; ascending: boolean } {
  if (sort === "price_asc") return { column: "price_cents", ascending: true }
  if (sort === "price_desc") return { column: "price_cents", ascending: false }
  return { column: "created_at", ascending: false }
}

// O público é derivado de qual FK está preenchida (o canônico garante que só
// uma existe): cidade em `locality_id`, comunidade em `community_id`.
function audienceFilter(communityIds: string[], localityId: string): string {
  return communityIds.length > 0
    ? `locality_id.eq.${localityId},community_id.in.(${communityIds.join(",")})`
    : ""
}

function MercadoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { current } = useLocalityContext()
  const { communities } = useMemberContext()

  const search = useMemo(() => parseListingSearch(searchParams), [searchParams])
  const [state, setState] = useState<FetchState>(INITIAL_STATE)
  const [priceMin, setPriceMin] = useState("")
  const [priceMax, setPriceMax] = useState("")

  useEffect(() => {
    setPriceMin(search.priceMin === null ? "" : String(search.priceMin / 100))
    setPriceMax(search.priceMax === null ? "" : String(search.priceMax / 100))
  }, [search.priceMin, search.priceMax])

  const apply = useCallback(
    (next: Partial<ListingSearchState>) => {
      const merged: ListingSearchState = { ...search, ...next, page: next.page ?? 1 }
      router.replace(`/mercado${serializeListingSearch(merged)}` as Route)
    },
    [router, search],
  )

  useEffect(() => {
    const communityIds = communities.map((community) => community.id)
    let cancelled = false

    async function load() {
      setState((previous) => ({ ...previous, status: "loading" }))
      const supabase = listingsClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const order = orderBy(search.sort)
      let query = supabase
        .from("listings")
        .select(
          "id,owner_user_id,title,description,category,price_cents,condition,neighborhood,status,locality_id,community_id,created_at",
          { count: "exact" },
        )
        .eq("status", "active")
        .eq("kind", "item")

      if (communityIds.length > 0) {
        query = query.or(audienceFilter(communityIds, current.id))
      } else {
        query = query.eq("locality_id", current.id)
      }

      if (search.categories.length > 0) query = query.in("category", search.categories)
      if (search.conditions.length > 0) query = query.in("condition", search.conditions)
      if (search.neighborhood !== null) query = query.eq("neighborhood", search.neighborhood)
      if (search.priceMin !== null) query = query.gte("price_cents", search.priceMin)
      if (search.priceMax !== null) query = query.lte("price_cents", search.priceMax)

      const from = (search.page - 1) * LISTING_PAGE_SIZE
      const to = from + LISTING_PAGE_SIZE - 1

      const { data, error, count } = await query
        .order(order.column, { ascending: order.ascending })
        .range(from, to)

      if (cancelled) return
      if (error) {
        setState((previous) => ({ ...previous, status: "error" }))
        return
      }

      const rows = (data ?? []) as ListingRow[]
      const ids = rows.map((row) => row.id)
      const photos: Record<string, string | null> = {}
      const saved = new Set<string>()

      if (ids.length > 0) {
        const { data: photoRows } = await supabase
          .from("listing_photos")
          .select("listing_id,path,position")
          .in("listing_id", ids)
          .order("position", { ascending: true })

        const firstPathByListing = new Map<string, string>()
        for (const photo of (photoRows ?? []) as ListingPhotoRow[]) {
          if (!firstPathByListing.has(photo.listing_id)) {
            firstPathByListing.set(photo.listing_id, photo.path)
          }
        }
        const paths = Array.from(firstPathByListing.values())
        if (paths.length > 0) {
          const { data: signed } = await supabase.storage
            .from("listing-photos")
            .createSignedUrls(paths, 3600)
          const urlByPath = new Map<string, string>()
          for (const entry of signed ?? []) {
            if (entry.path !== null && entry.signedUrl !== null) {
              urlByPath.set(entry.path, entry.signedUrl)
            }
          }
          for (const listing of rows) {
            const path = firstPathByListing.get(listing.id) ?? null
            photos[listing.id] = path === null ? null : (urlByPath.get(path) ?? null)
          }
        }

        if (user !== null) {
          const { data: saveRows } = await supabase
            .from("listing_saves")
            .select("listing_id")
            .in("listing_id", ids)
            .eq("user_id", user.id)
          for (const row of (saveRows ?? []) as { listing_id: string }[]) {
            saved.add(row.listing_id)
          }
        }
      }

      if (cancelled) return
      setState((previous) => ({
        status: "ready",
        listings: rows,
        photos,
        saved,
        total: count ?? rows.length,
        regions: previous.regions,
      }))
    }

    async function loadRegions() {
      const supabase = listingsClient()
      let regionQuery = supabase
        .from("listings")
        .select("neighborhood")
        .eq("status", "active")
        .eq("kind", "item")
      regionQuery =
        communityIds.length > 0
          ? regionQuery.or(audienceFilter(communityIds, current.id))
          : regionQuery.eq("locality_id", current.id)
      const { data } = await regionQuery.limit(200)
      if (cancelled) return
      const unique = new Set<string>()
      for (const row of (data ?? []) as { neighborhood: string }[]) {
        if (row.neighborhood.trim() !== "") unique.add(row.neighborhood.trim())
      }
      setState((previous) => ({
        ...previous,
        regions: Array.from(unique).sort((a, b) => a.localeCompare(b, "pt-BR")),
      }))
    }

    void load()
    void loadRegions()
    return () => {
      cancelled = true
    }
  }, [search, current.id, communities])

  function applyPrice() {
    const min = parsePriceInput(priceMin)
    const max = parsePriceInput(priceMax)
    apply({
      priceMin: typeof min === "number" ? Math.min(min, MAX_LISTING_PRICE_CENTS) : null,
      priceMax: typeof max === "number" ? Math.min(max, MAX_LISTING_PRICE_CENTS) : null,
    })
  }

  function clearFilters() {
    apply({ categories: [], conditions: [], neighborhood: null, priceMin: null, priceMax: null })
  }

  const totalPages = Math.max(1, Math.ceil(state.total / LISTING_PAGE_SIZE))
  const filtersActive = hasActiveFilters(search)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <nav aria-label="Trilha" className="flex items-center gap-2 text-xs text-muted">
        <Link href={"/explorar" as Route} className="hover:underline">
          Explorar
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Mercado</span>
      </nav>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            O que você precisa pode estar por perto
          </h1>
          <p className="text-sm text-muted">Produtos e serviços de quem faz parte da sua região.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="tertiary"
            size="sm"
            className="min-h-11"
            onPress={() => router.push("/meus-anuncios" as Route)}
          >
            Meus anúncios
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="min-h-11"
            onPress={() => router.push("/mercado/novo" as Route)}
          >
            + Anunciar
          </Button>
        </div>
      </div>

      <nav
        aria-label="Seções do Explorar"
        className="flex items-center gap-6 border-b border-border"
      >
        <Link
          href={"/guide" as Route}
          className="pb-2 text-sm font-medium text-muted hover:text-[var(--semantic-text-primary)]"
        >
          Guia
        </Link>
        <span
          aria-current="page"
          className="border-b-2 border-[var(--semantic-action-primary)] pb-2 text-sm font-semibold text-[var(--semantic-action-primary)]"
        >
          Mercado
        </span>
      </nav>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="w-full shrink-0 lg:w-64">
          <div className="rounded-2xl border border-border bg-[var(--semantic-surface)] p-4">
            <div className="mb-3 flex items-center gap-2">
              <SlidersHorizontal size={16} aria-hidden="true" />
              <h2 className="text-sm font-semibold">Filtros</h2>
            </div>

            <fieldset className="mb-4">
              <legend className="mb-2 text-xs font-medium text-muted">Categoria</legend>
              <div className="flex flex-col gap-2">
                {LISTING_CATEGORIES.map((category) => (
                  <label key={category.value} className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={search.categories.includes(category.value)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...search.categories, category.value]
                          : search.categories.filter((value) => value !== category.value)
                        apply({ categories: next })
                      }}
                    />
                    {category.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="mb-4">
              <legend className="mb-2 text-xs font-medium text-muted">Estado</legend>
              <div className="flex flex-col gap-2">
                {LISTING_CONDITIONS.map((condition) => (
                  <label key={condition.value} className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={search.conditions.includes(condition.value)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...search.conditions, condition.value]
                          : search.conditions.filter((value) => value !== condition.value)
                        apply({ conditions: next })
                      }}
                    />
                    {condition.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mb-4 flex flex-col gap-1">
              <label htmlFor="mercado-regiao" className="text-xs font-medium text-muted">
                Região
              </label>
              <select
                id="mercado-regiao"
                value={search.neighborhood ?? ""}
                onChange={(event) => apply({ neighborhood: event.target.value || null })}
                className="min-h-11 w-full rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm"
              >
                <option value="">Todas</option>
                {state.regions.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3 flex flex-col gap-2">
              <span className="text-xs font-medium text-muted">Preço (R$)</span>
              <div className="flex items-center gap-2">
                <input
                  aria-label="Preço mínimo"
                  placeholder="De"
                  inputMode="decimal"
                  value={priceMin}
                  onChange={(event) => setPriceMin(event.target.value)}
                  onBlur={applyPrice}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyPrice()
                  }}
                  className="min-h-11 w-full rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm"
                />
                <input
                  aria-label="Preço máximo"
                  placeholder="Até"
                  inputMode="decimal"
                  value={priceMax}
                  onChange={(event) => setPriceMax(event.target.value)}
                  onBlur={applyPrice}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyPrice()
                  }}
                  className="min-h-11 w-full rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm"
                />
              </div>
            </div>

            {filtersActive ? (
              <Button variant="tertiary" size="sm" className="w-full" onPress={clearFilters}>
                Limpar filtros
              </Button>
            ) : null}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 rounded-lg border border-border p-1">
              <span className="rounded-md bg-[var(--semantic-selected)] px-3 py-1.5 text-sm font-semibold text-[var(--semantic-action-primary)]">
                Produtos
              </span>
              <Link
                href={"/explorar/servicos" as Route}
                className="min-h-11 rounded-md px-3 py-2.5 text-sm text-muted hover:text-[var(--semantic-text-primary)]"
              >
                Serviços
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">Produtos em {current.cityName}</span>
              <label htmlFor="mercado-ordem" className="sr-only">
                Ordenação
              </label>
              <select
                id="mercado-ordem"
                value={search.sort}
                onChange={(event) => apply({ sort: event.target.value as ListingSort })}
                className="min-h-11 rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm"
              >
                {LISTING_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {state.status === "loading" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {[0, 1, 2, 3, 4, 5].map((key) => (
                <Skeleton key={key} className="h-64 w-full rounded-2xl" />
              ))}
            </div>
          ) : state.status === "error" ? (
            <ErrorState
              message="Não foi possível carregar o Mercado agora."
              onRetry={() => apply({ page: search.page })}
            />
          ) : state.listings.length === 0 ? (
            <EmptyState
              title={
                filtersActive
                  ? "Nenhum produto com esses filtros"
                  : "Ainda não há anúncios por aqui"
              }
              description={
                filtersActive
                  ? "Ajuste ou limpe os filtros para ver mais resultados."
                  : "Publique o primeiro anúncio da sua região e ele aparece nesta busca."
              }
              action={
                filtersActive ? (
                  <Button variant="tertiary" size="sm" className="min-h-11" onPress={clearFilters}>
                    Limpar filtros
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="min-h-11"
                    onPress={() => router.push("/mercado/novo" as Route)}
                  >
                    Anunciar
                  </Button>
                )
              }
            />
          ) : (
            <>
              <p className="text-xs text-muted">
                {state.total} {state.total === 1 ? "resultado" : "resultados"}
                {search.categories.length > 0
                  ? ` · ${search.categories.map(categoryLabel).join(", ")}`
                  : ""}
              </p>
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {state.listings.map((listing) => (
                  <li key={listing.id} className="flex">
                    <ListingCard
                      listing={listing}
                      photoUrl={state.photos[listing.id] ?? null}
                      saved={state.saved.has(listing.id)}
                    />
                  </li>
                ))}
              </ul>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between gap-3">
                  <Button
                    variant="tertiary"
                    size="sm"
                    className="min-h-11"
                    isDisabled={search.page <= 1}
                    onPress={() => apply({ page: search.page - 1 })}
                  >
                    <ChevronLeft size={16} aria-hidden="true" />
                    Anterior
                  </Button>
                  <span className="text-xs text-muted">
                    {search.page} de {totalPages}
                  </span>
                  <Button
                    variant="tertiary"
                    size="sm"
                    className="min-h-11"
                    isDisabled={search.page >= totalPages}
                    onPress={() => apply({ page: search.page + 1 })}
                  >
                    Próxima
                    <ChevronRight size={16} aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
            </>
          )}

          <div className="border-t border-border pt-4 text-center">
            <Link
              href={"/explorar/servicos" as Route}
              className="text-sm font-medium text-[var(--semantic-action-primary)] hover:underline"
            >
              Procurando um profissional? Ver serviços ›
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
