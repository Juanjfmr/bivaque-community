"use client"

import { Button } from "@heroui/react"
import type { LucideIcon } from "lucide-react"
import { ArrowRight, Bus, FileText, GraduationCap, Hospital, Search } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import type { Database } from "supabase/database.generated"
import { useLocalityContext } from "../../../lib/locality-context"
import { isLocalityStale } from "../../../lib/locality-density"
import { log } from "../../../lib/logger"
import { createBrowserClient } from "../../../lib/supabase/client"
import { Card } from "../../components/bivaque/card"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { Skeleton } from "../../components/bivaque/skeleton"

// RECON-008 — prancha 12-web-guia: descoberta editorial do Guia da cidade,
// sobre o diretório curado que já existe (arrival_guide_entries). Só entradas
// aprovadas chegam ao membro — a consulta filtra status="approved" e a RLS já
// impõe o mesmo; a fila do operador vive em /guide-queue e não aparece aqui.
// A curadoria é humana: nenhuma geração de conteúdo acontece nesta tela.
//
// O que a prancha mostra e nenhum dado real sustenta (destaque editorial,
// "Comece por aqui", fotos, abas Guia/Mercado, "Sugerir referência") não é
// renderizado — sem destino real não há link, sem entrada real não há
// conteúdo. O h2 "Guia de chegada" nomeia o diretório curado (o nome do
// acervo em produção: ver supabase/migrations/20260815181708_arrival_guide.sql
// e os links de /community e do painel do operador), e é o heading que os
// E2Es de escopo de localidade (two-localities, empty-locality) verificam.

type GuideEntry = Database["public"]["Tables"]["arrival_guide_entries"]["Row"]
type GuideCategory = GuideEntry["category"]

// Tradução dos valores do enum public.arrival_guide_category — não é a lista
// de categorias da tela: a navegação é derivada das entradas aprovadas reais.
const CATEGORY_LABELS: Record<GuideCategory, string> = {
  school: "Colégio",
  hospital: "Hospital",
  transporter: "Transportadora",
  courier: "Despachante",
}

const CATEGORY_ICONS: Record<GuideCategory, LucideIcon> = {
  school: GraduationCap,
  hospital: Hospital,
  transporter: Bus,
  courier: FileText,
}

function formatGuideDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })
    .replace(/\./g, "")
}

function guideStamp(entry: GuideEntry): number {
  return Date.parse(entry.reviewed_at ?? entry.updated_at)
}

export default function GuidePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8" aria-busy="true">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      }
    >
      <GuideContent />
    </Suspense>
  )
}

function GuideContent() {
  const { current } = useLocalityContext()
  const searchParams = useSearchParams()
  const [entries, setEntries] = useState<GuideEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  // RECON-021: o "Ver todos" de /explorar/busca chega com o termo em `q` —
  // o filtro local já existe, só nasce preenchido.
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "")
  const [category, setCategory] = useState<"all" | GuideCategory>("all")
  const [memberCount, setMemberCount] = useState<number | null>(null)
  // Onda T Task 4: same fix as /events — ?locality lets the city switcher
  // ask for the origin's guide specifically; absent it, defaults to current.
  const viewingLocalityId = searchParams.get("locality") ?? current.id

  const supabase = createBrowserClient()

  const loadEntries = useCallback(async () => {
    setLoading(true)
    setError("")

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setError("Você precisa entrar para acessar o guia.")
      setLoading(false)
      return
    }

    const { data, error: guideError } = await supabase
      .from("arrival_guide_entries")
      .select("*")
      .eq("locality_id", viewingLocalityId)
      .eq("status", "approved")
      .order("category")
      .order("name")

    if (guideError) {
      setError("Não foi possível carregar o guia. Tente novamente.")
      setLoading(false)
      return
    }

    setEntries((data as GuideEntry[] | null) ?? [])
    setLoading(false)
  }, [supabase, viewingLocalityId])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  // P0 Task 9: load the locality member count to branch the empty state on the
  // §3.4 density threshold. The metric is a proxy (membership count, not weekly
  // active) — see comment in lib/locality-density.ts.
  useEffect(() => {
    let cancelled = false
    const supabase = createBrowserClient()
    ;(async () => {
      try {
        const { count, error } = await supabase
          .from("locality_memberships")
          .select("*", { count: "exact", head: true })
          .eq("locality_id", viewingLocalityId)
        // A contagem só ajusta a cópia do estado vazio, então a falha não
        // interrompe a tela. Mas ela precisa aparecer no log: sem isso, um
        // token expirado e uma cidade genuinamente sem membros produzem
        // exatamente a mesma tela, e a primeira some sem deixar rastro.
        if (error) {
          log.error("guide: could not count the locality members", {
            locality_id: viewingLocalityId,
            error: error.message,
          })
        } else if (!cancelled && count !== null) {
          setMemberCount(count)
        }
      } catch (cause) {
        log.error("guide: the locality member count request failed", {
          locality_id: viewingLocalityId,
          error: cause instanceof Error ? cause.message : String(cause),
        })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [viewingLocalityId])

  // Categorias derivadas do dado real: só aparece na navegação a categoria que
  // tem entrada aprovada nesta localidade, ordenada pelo rótulo em pt-BR.
  const categories = useMemo(() => {
    const present = Array.from(new Set(entries.map((entry) => entry.category)))
    return present.sort((a, b) => CATEGORY_LABELS[a].localeCompare(CATEGORY_LABELS[b], "pt-BR"))
  }, [entries])

  const normalizedQuery = query.trim().toLowerCase()
  const isFiltered = category !== "all" || normalizedQuery !== ""

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false
      if (!normalizedQuery) return true
      return (
        entry.name.toLowerCase().includes(normalizedQuery) ||
        entry.description.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [entries, category, normalizedQuery])

  // "Atualizados recentemente" da prancha: ordenado pela revisão real da
  // entrada (reviewed_at; updated_at como fallback), apenas na visão completa.
  const recentEntries = useMemo(() => {
    if (isFiltered || entries.length === 0) return []
    return [...entries].sort((a, b) => guideStamp(b) - guideStamp(a)).slice(0, 5)
  }, [entries, isFiltered])

  const clearFilters = () => {
    setQuery("")
    setCategory("all")
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
      <nav aria-label="Trilha de navegação" className="text-sm text-muted">
        <Link
          href="/explorar"
          className="inline-flex min-h-11 items-center text-[var(--semantic-link)] transition-colors hover:underline"
        >
          Explorar
        </Link>
        <span aria-hidden="true"> / </span>
        <Link
          href="/guide"
          aria-current="page"
          className="inline-flex min-h-11 items-center rounded-lg px-2 text-[var(--semantic-text-primary)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)]"
        >
          Guia
        </Link>
      </nav>

      <header className="mt-1 flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Seu guia de{" "}
          <span className="text-[var(--semantic-action-primary)]">{current.cityName}</span>
        </h1>
        <p className="text-sm text-muted">
          Referências para chegar, se organizar e viver melhor na cidade.
        </p>
      </header>

      {/* Abas do topo (prancha 12): Guia (aqui) e Mercado (rota real). */}
      <div
        role="tablist"
        aria-label="Seções do conteúdo da cidade"
        className="mt-5 inline-flex rounded-full border border-border bg-[var(--semantic-surface)] p-1"
      >
        <span
          role="tab"
          aria-selected="true"
          tabIndex={0}
          className="inline-flex min-h-11 items-center rounded-full bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-white"
        >
          Guia
        </span>
        <Link
          role="tab"
          aria-selected="false"
          href="/mercado"
          className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-medium text-[var(--semantic-text-secondary)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
        >
          Mercado
        </Link>
      </div>

      {/* Bloco editorial (prancha 12) — só com entradas aprovadas reais. As
          fotos da prancha dependem de fixtures [dado] (RECON-051); os cards de
          assunto saem das categorias presentes, com contagem verdadeira. */}
      {!loading && !error && entries.length > 0 && (
        <section aria-labelledby="guia-editorial-titulo" className="mt-6">
          <div className="flex flex-col gap-4 rounded-2xl bg-[var(--semantic-action-primary)] px-6 py-8 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <h2
                id="guia-editorial-titulo"
                className="text-xl font-semibold tracking-tight sm:text-2xl"
              >
                Seus primeiros dias em {current.cityName}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-white/85">
                Referências aprovadas por quem já mora aqui — escolas, saúde, transporte e
                utilidades para chegar e se organizar.
              </p>
            </div>
            <Link
              href="#guia-referencias"
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-medium text-[var(--semantic-action-primary)] transition-transform duration-[var(--semantic-motion-duration-instant)] hover:translate-x-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Ler guia
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((item) => {
              const Icon = CATEGORY_ICONS[item]
              const count = entries.filter((entry) => entry.category === item).length
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className="flex min-h-24 items-center gap-3 rounded-2xl border border-border bg-[var(--semantic-surface)] px-4 py-4 text-left transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                >
                  <Icon size={20} aria-hidden="true" className="shrink-0 text-accent" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{CATEGORY_LABELS[item]}</span>
                    <span className="block text-xs text-muted">
                      {count} {count === 1 ? "referência" : "referências"}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <search className="mt-6 block">
        <label htmlFor="guia-busca" className="block text-sm font-medium">
          Buscar no guia
        </label>
        <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-border bg-[var(--semantic-surface)] px-3">
          <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
          <input
            id="guia-busca"
            type="search"
            placeholder="Buscar por nome ou descrição..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-11 w-full bg-transparent text-sm transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none"
          />
        </div>
      </search>

      <div className="mt-6 flex flex-col gap-8 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start xl:grid-cols-[200px_minmax(0,1fr)_280px]">
        <nav aria-label="Categorias do guia" className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {loading && (
            <div className="flex w-full flex-col gap-2" aria-busy="true">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          )}
          {!loading && (
            <>
              <CategoryButton
                label="Todos"
                selected={category === "all"}
                onSelect={() => setCategory("all")}
              />
              {categories.map((item) => (
                <CategoryButton
                  key={item}
                  label={CATEGORY_LABELS[item]}
                  selected={category === item}
                  onSelect={() => setCategory(item)}
                />
              ))}
            </>
          )}
        </nav>

        <div className="flex min-w-0 flex-col gap-8 lg:col-start-2 lg:row-start-1">
          <section
            id="guia-referencias"
            aria-labelledby="guia-referencias-titulo"
            className="scroll-mt-24 flex flex-col gap-3"
          >
            <h2 id="guia-referencias-titulo" className="text-base font-semibold tracking-tight">
              Guia de chegada
            </h2>

            {error && <ErrorState message={error} onRetry={() => loadEntries()} />}

            {loading && !error && (
              <div className="flex flex-col gap-3" aria-busy="true">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
              </div>
            )}

            {!loading && !error && entries.length === 0 && (
              // Estado vazio honesto: não há entrada aprovada e nada aqui
              // promete que conteúdo está a caminho. A curadoria é humana,
              // pela fila do operador (/guide-queue).
              <EmptyState
                title={
                  isLocalityStale(memberCount)
                    ? "Você é dos primeiros aqui."
                    : "O guia desta cidade ainda não tem referências."
                }
                description={
                  isLocalityStale(memberCount)
                    ? "Ainda não há referências aprovadas no guia desta cidade."
                    : "As entradas publicadas aqui passam por curadoria humana."
                }
              />
            )}

            {!loading && !error && entries.length > 0 && filteredEntries.length === 0 && (
              <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-[var(--semantic-surface-sunken)] px-6 py-8">
                <p className="text-sm">
                  Nenhuma referência encontrada
                  {normalizedQuery ? ` para "${query.trim()}".` : " nesta categoria."}
                </p>
                <Button variant="tertiary" size="sm" onPress={clearFilters}>
                  Limpar filtros
                </Button>
              </div>
            )}

            {!loading && !error && filteredEntries.length > 0 && (
              <ul className="flex flex-col gap-3">
                {filteredEntries.map((entry) => (
                  <GuideEntryCard key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </section>

          {!loading && !error && recentEntries.length > 0 && (
            <section aria-labelledby="guia-recentes-titulo" className="flex flex-col gap-3">
              <h2 id="guia-recentes-titulo" className="text-base font-semibold tracking-tight">
                Atualizados recentemente
              </h2>
              <Card>
                <ul className="divide-y divide-[var(--semantic-border)]">
                  {recentEntries.map((entry) => {
                    const Icon = CATEGORY_ICONS[entry.category]
                    return (
                      <li key={entry.id} className="flex items-center gap-3 px-4 py-3">
                        <Icon size={18} aria-hidden="true" className="shrink-0 text-muted" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{entry.name}</p>
                          <p className="truncate text-xs text-muted">
                            {CATEGORY_LABELS[entry.category]}
                          </p>
                        </div>
                        <p className="shrink-0 text-xs text-muted">
                          {entry.reviewed_at
                            ? `Revisado em ${formatGuideDate(entry.reviewed_at)}`
                            : `Atualizado em ${formatGuideDate(entry.updated_at)}`}
                        </p>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </section>
          )}
        </div>

        {!loading && !error && entries.length > 0 && (
          <aside
            aria-labelledby="guia-sobre-titulo"
            className="lg:col-start-2 xl:col-start-3 xl:row-start-1"
          >
            <Card className="p-4">
              <h2 className="text-base font-semibold tracking-tight">Comece por aqui</h2>
              <ul className="mt-2">
                {categories.map((item) => {
                  const Icon = CATEGORY_ICONS[item]
                  const count = entries.filter((entry) => entry.category === item).length
                  return (
                    <li key={item}>
                      <button
                        type="button"
                        onClick={() => setCategory(item)}
                        aria-pressed={category === item}
                        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                      >
                        <Icon size={16} aria-hidden="true" className="shrink-0 text-muted" />
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {CATEGORY_LABELS[item]}
                        </span>
                        <span className="shrink-0 text-xs text-muted">{count}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </Card>

            <Card className="p-4">
              <h2 id="guia-sobre-titulo" className="text-base font-semibold tracking-tight">
                Sobre o guia
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Conteúdo curado por famílias, veteranos e pensionistas que moram na cidade. Nada
                entra aqui de forma automática.
              </p>
            </Card>

            <Card className="p-4">
              <h2 className="text-base font-semibold tracking-tight">Ajude a melhorar o guia</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Achou uma referência desatualizada ou conhece um serviço que faltou? O canal de
                contato do produto é o mesmo dos avisos transacionais.
              </p>
              <Link
                href="/ajuda"
                className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg text-sm font-medium text-accent transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
              >
                Falar com a equipe
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </Card>
          </aside>
        )}
      </div>
    </div>
  )
}

function CategoryButton({
  label,
  selected,
  onSelect,
}: {
  label: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`min-h-11 rounded-lg border-l-2 px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] ${
        selected
          ? "border-[var(--semantic-action-primary)] bg-[var(--semantic-selected)] text-[var(--semantic-text-primary)]"
          : "border-transparent text-[var(--semantic-text-secondary)] hover:bg-[var(--semantic-surface-hover)]"
      }`}
    >
      {label}
    </button>
  )
}

function GuideEntryCard({ entry }: { entry: GuideEntry }) {
  const Icon = CATEGORY_ICONS[entry.category]
  const dialPhone = entry.phone ? entry.phone.replace(/[^\d+]/g, "") : null

  return (
    <li>
      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--semantic-selected)]">
            <Icon size={20} aria-hidden="true" className="text-[var(--semantic-action-primary)]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--semantic-text-secondary)]">
              {CATEGORY_LABELS[entry.category]}
            </p>
            <h3 className="mt-0.5 text-base font-semibold">{entry.name}</h3>
            {entry.description && (
              <p className="mt-1 text-sm leading-relaxed text-muted">{entry.description}</p>
            )}
            {(entry.phone || entry.website_url) && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {entry.phone && dialPhone && (
                  <a
                    href={`tel:${dialPhone}`}
                    className="inline-flex min-h-11 items-center text-sm text-[var(--semantic-link)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                  >
                    {entry.phone}
                  </a>
                )}
                {entry.website_url && (
                  <a
                    href={entry.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Abrir o site de ${entry.name}`}
                    className="inline-flex min-h-11 items-center text-sm text-[var(--semantic-link)] transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                  >
                    Ver site
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </li>
  )
}
