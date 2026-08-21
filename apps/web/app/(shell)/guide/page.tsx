"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import type { Database } from "supabase/database.generated"
import { useLocalityContext } from "../../../lib/locality-context"
import { isLocalityStale } from "../../../lib/locality-density"
import { createBrowserClient } from "../../../lib/supabase/client"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { Skeleton } from "../../components/bivaque/skeleton"
import {
  GUIDE_LAST_REVIEWED,
  type GuidePhase,
  type GuideSource,
  type GuideTopic,
  MANAUS_CONTACTS,
  MANAUS_NEIGHBORHOODS,
  MANAUS_PHASES,
  MANAUS_QUICK_FACTS,
  phaseForDay,
  relativeDayLabel,
  TOPIC_LABELS,
  TOPIC_ORDER,
} from "./manaus-guide-content"
import { ManausGuideHero } from "./manaus-guide-hero"

type GuideEntry = Database["public"]["Tables"]["arrival_guide_entries"]["Row"]
type GuideCategory = GuideEntry["category"]

const CATEGORY_LABELS: Record<GuideCategory, string> = {
  school: "Colégio",
  hospital: "Hospital",
  transporter: "Transportadora",
  courier: "Despachante",
}

const CATEGORY_ORDER: GuideCategory[] = ["school", "hospital", "transporter", "courier"]
const CHECKLIST_STORAGE_KEY = "bivaque:manaus-guide:checked:v1"
const ARRIVAL_STORAGE_KEY = "bivaque:manaus-guide:arrival-date:v1"
const DAY_MS = 86_400_000

function sourceKindLabel(source: GuideSource): string {
  if (source.kind === "oficial") return "Fonte oficial"
  if (source.kind === "comunidade") return "Experiência da comunidade"
  return "Referência"
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

function dayFromArrival(arrivalDate: string): number | null {
  const [year, month, day] = arrivalDate.split("-").map(Number)
  if (!year || !month || !day) return null

  const arrival = new Date(year, month - 1, day, 12)
  if (Number.isNaN(arrival.getTime())) return null

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  return Math.round((today.getTime() - arrival.getTime()) / DAY_MS)
}

function isManausCity(cityName: string): boolean {
  return normalize(cityName).includes("manaus")
}

export default function GuidePage() {
  return (
    <Suspense
      fallback={
        <div
          className="mx-auto flex w-full max-w-[64rem] flex-col gap-6 px-4 py-8"
          aria-busy="true"
        >
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      }
    >
      <GuideContent />
    </Suspense>
  )
}

function GuideContent() {
  const { current, outbound } = useLocalityContext()
  const searchParams = useSearchParams()
  const requestedLocalityId = searchParams.get("locality")
  const viewing =
    requestedLocalityId && outbound?.id === requestedLocalityId
      ? { id: outbound.id, cityName: outbound.cityName }
      : current

  if (!isManausCity(viewing.cityName)) {
    return <CommunityGuide localityId={viewing.id} cityName={viewing.cityName} />
  }

  return <ManausGuide localityId={viewing.id} cityName={viewing.cityName} />
}

function ManausGuide({ localityId, cityName }: { localityId: string; cityName: string }) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [entries, setEntries] = useState<GuideEntry[]>([])
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [topic, setTopic] = useState<"all" | GuideTopic>("all")
  const [communityCategory, setCommunityCategory] = useState<"all" | GuideCategory>("all")
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [arrivalDate, setArrivalDate] = useState("")
  const [storageReady, setStorageReady] = useState(false)

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
      .eq("locality_id", localityId)
      .eq("status", "approved")
      .order("category")
      .order("name")

    if (guideError) {
      setError(
        "Não foi possível carregar as indicações da comunidade. O guia editorial continua disponível.",
      )
      setLoading(false)
      return
    }

    setEntries((data as GuideEntry[] | null) ?? [])
    setLoading(false)
  }, [localityId, supabase])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { count } = await supabase
          .from("locality_memberships")
          .select("*", { count: "exact", head: true })
          .eq("locality_id", localityId)
        if (!cancelled && count !== null) setMemberCount(count)
      } catch {
        // Density only changes the empty-state copy. The guide must not fail because of it.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [localityId, supabase])

  useEffect(() => {
    try {
      const savedArrival = window.localStorage.getItem(ARRIVAL_STORAGE_KEY)
      const savedChecklist = window.localStorage.getItem(CHECKLIST_STORAGE_KEY)
      if (savedArrival) setArrivalDate(savedArrival)
      if (savedChecklist) {
        const parsed = JSON.parse(savedChecklist)
        if (Array.isArray(parsed)) {
          setCheckedIds(new Set(parsed.filter((item): item is string => typeof item === "string")))
        }
      }
    } catch {
      // Private browsing or blocked storage simply disables persistence.
    } finally {
      setStorageReady(true)
    }
  }, [])

  const allTasks = useMemo(() => MANAUS_PHASES.flatMap((phase) => phase.tasks), [])
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter((task) => checkedIds.has(task.id)).length
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
  const currentDay = arrivalDate ? dayFromArrival(arrivalDate) : null
  const currentPhase = currentDay === null ? null : phaseForDay(currentDay)

  const normalizedQuery = normalize(query.trim())

  const filteredPhases = useMemo(() => {
    return MANAUS_PHASES.map((phase) => ({
      ...phase,
      tasks: phase.tasks.filter((task) => {
        if (topic !== "all" && task.topic !== topic) return false
        if (!normalizedQuery) return true
        return normalize(
          `${task.title} ${task.body} ${task.action} ${TOPIC_LABELS[task.topic]} ${phase.range}`,
        ).includes(normalizedQuery)
      }),
    })).filter((phase) => phase.tasks.length > 0)
  }, [normalizedQuery, topic])

  const filteredCommunityEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (communityCategory !== "all" && entry.category !== communityCategory) return false
      if (!normalizedQuery) return true
      return normalize(
        `${entry.name} ${entry.description} ${CATEGORY_LABELS[entry.category]}`,
      ).includes(normalizedQuery)
    })
  }, [communityCategory, entries, normalizedQuery])

  const saveArrival = (value: string) => {
    setArrivalDate(value)
    try {
      if (value) window.localStorage.setItem(ARRIVAL_STORAGE_KEY, value)
      else window.localStorage.removeItem(ARRIVAL_STORAGE_KEY)
    } catch {
      // Keep the in-memory value when storage is unavailable.
    }
  }

  const toggleTask = (taskId: string) => {
    setCheckedIds((previous) => {
      const next = new Set(previous)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      try {
        window.localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify([...next]))
      } catch {
        // The checklist still works for the current session.
      }
      return next
    })
  }

  const scrollToPhase = (phase: GuidePhase) => {
    const target = document.getElementById(`guide-phase-${phase.id}`)
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    target?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" })
  }

  return (
    <div className="mx-auto w-full max-w-[64rem] px-4 py-6 sm:py-8">
      <section className="overflow-hidden rounded-2xl border border-border bg-[var(--surface)]">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col justify-center gap-4 p-5 sm:p-7 lg:p-8">
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1.5 text-[var(--accent)]">
                {cityName}
              </span>
              <span>D-60 → D+60</span>
              <span aria-hidden="true">·</span>
              <span>revisto em {GUIDE_LAST_REVIEWED}</span>
            </div>
            <div>
              <h1 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Guia de chegada a Manaus
              </h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-muted">
                O que vale resolver antes da mudança, o que pode esperar você chegar e os bizus que
                normalmente só aparecem depois de alguns meses na cidade.
              </p>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted">
              Informações operacionais vêm de fontes oficiais. Experiência de bairro, trânsito e
              internet é tratada como sinal da comunidade — útil para decidir o que verificar, não
              como verdade universal.
            </p>
          </div>
          <div className="min-h-56 bg-[var(--accent-soft)] p-3 sm:p-5">
            <ManausGuideHero className="h-full min-h-52 w-full" />
          </div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-border bg-[var(--surface)] p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-end">
          <div>
            <label htmlFor="guide-arrival-date" className="text-sm font-semibold">
              Quando você chega a Manaus?
            </label>
            <p className="mt-1 text-sm text-muted">
              A data fica só neste dispositivo e serve para posicionar você na linha do tempo.
            </p>
            <input
              id="guide-arrival-date"
              type="date"
              value={arrivalDate}
              onChange={(event) => saveArrival(event.target.value)}
              className="mt-3 min-h-11 w-full max-w-xs rounded-lg border border-border bg-[var(--surface)] px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
            />
          </div>

          <div className="rounded-xl bg-[var(--surface-sunken)] p-4" aria-live="polite">
            {arrivalDate && currentDay !== null ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Sua posição hoje
                </p>
                <p className="mt-1 text-2xl font-semibold text-[var(--accent)]">
                  {relativeDayLabel(currentDay)}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {currentPhase
                    ? `${currentPhase.label}: ${currentPhase.title}`
                    : currentDay < -60
                      ? "Ainda falta mais de 60 dias. Use a fase Planejar como preparação antecipada."
                      : "Você já passou de D+60. O guia continua útil como referência da cidade."}
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Quer o guia no seu tempo?</p>
                <p className="mt-1 text-sm text-muted">
                  Informe a chegada para destacar a fase que faz sentido agora.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">Seu checklist</span>
            <span className="text-muted">
              {completedTasks}/{totalTasks} concluídos
            </span>
          </div>
          <div
            className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--surface-sunken)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            aria-label="Progresso do guia"
          >
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-[width]"
              style={{ width: `${storageReady ? progress : 0}%` }}
            />
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Ir para uma fase do guia">
          {MANAUS_PHASES.map((phase) => {
            const active = currentPhase?.id === phase.id
            return (
              <button
                key={phase.id}
                type="button"
                onClick={() => scrollToPhase(phase)}
                aria-current={active ? "step" : undefined}
                className={`min-h-11 shrink-0 rounded-full border px-3 py-2 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "border-border bg-[var(--surface)] text-muted hover:bg-[var(--surface-subtle)]"
                }`}
              >
                <span className="font-semibold">{phase.range}</span>
                <span className="ml-2">{phase.label}</span>
              </button>
            )
          })}
        </nav>
      </section>

      <section
        className="mt-5 rounded-2xl border border-border bg-[var(--surface)] p-4 sm:p-5"
        aria-labelledby="guide-search-heading"
      >
        <h2 id="guide-search-heading" className="text-base font-semibold">
          Encontrar uma informação
        </h2>
        <div className="mt-3 grid gap-3">
          <input
            type="search"
            aria-label="Buscar no Guia de Manaus"
            placeholder="Ex.: escola, internet, carro, ar-condicionado..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-[var(--surface)] px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
          />
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Filtrar o guia por assunto</legend>
            <button
              type="button"
              onClick={() => setTopic("all")}
              className={`min-h-11 shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 ${
                topic === "all"
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "border-border bg-[var(--surface)] text-muted hover:bg-[var(--surface-subtle)]"
              }`}
            >
              Tudo
            </button>
            {TOPIC_ORDER.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTopic(item)}
                className={`min-h-11 shrink-0 rounded-full border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 ${
                  topic === item
                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                    : "border-border bg-[var(--surface)] text-muted hover:bg-[var(--surface-subtle)]"
                }`}
              >
                {TOPIC_LABELS[item]}
              </button>
            ))}
          </fieldset>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,640px)_320px] lg:items-start lg:justify-center">
        <div className="min-w-0 space-y-8">
          <section aria-labelledby="timeline-heading">
            <div className="mb-4">
              <h2 id="timeline-heading" className="text-xl font-semibold tracking-tight">
                Da preparação à rotina
              </h2>
              <p className="mt-1 text-sm text-muted">
                Marque o que já resolveu. O checklist é pessoal e fica somente neste dispositivo.
              </p>
            </div>

            {filteredPhases.length === 0 ? (
              <EmptyState
                title="Nada encontrado com esses filtros."
                description="Tente outro termo ou volte para ‘Tudo’ para ver o roteiro completo."
              />
            ) : (
              <div className="space-y-7">
                {filteredPhases.map((phase) => (
                  <article
                    key={phase.id}
                    id={`guide-phase-${phase.id}`}
                    className="scroll-mt-20"
                    aria-labelledby={`guide-phase-title-${phase.id}`}
                  >
                    <div className="mb-3 flex items-start gap-3">
                      <div
                        className={`mt-1 h-3 w-3 shrink-0 rounded-full border-2 ${
                          currentPhase?.id === phase.id
                            ? "border-[var(--accent)] bg-[var(--accent)]"
                            : "border-[var(--border)] bg-[var(--surface)]"
                        }`}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[var(--accent)]">
                            {phase.range}
                          </span>
                          <span className="text-xs font-medium uppercase tracking-wide text-muted">
                            {phase.label}
                          </span>
                        </div>
                        <h3
                          id={`guide-phase-title-${phase.id}`}
                          className="mt-1 text-lg font-semibold"
                        >
                          {phase.title}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-muted">{phase.intro}</p>
                      </div>
                    </div>

                    <ul className="ml-0 space-y-3 sm:ml-6">
                      {phase.tasks.map((task) => {
                        const checked = checkedIds.has(task.id)
                        return (
                          <li
                            key={task.id}
                            className={`rounded-xl border p-4 transition-colors ${
                              checked
                                ? "border-[var(--accent)] bg-[var(--accent-soft)]"
                                : "border-border bg-[var(--surface)]"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                aria-pressed={checked}
                                aria-label={`${checked ? "Desmarcar" : "Marcar"}: ${task.title}`}
                                onClick={() => toggleTask(task.id)}
                                className={`flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border text-base font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 ${
                                  checked
                                    ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                                    : "border-border bg-[var(--surface)] text-muted hover:bg-[var(--surface-subtle)]"
                                }`}
                              >
                                {checked ? "✓" : "○"}
                              </button>
                              <div className="min-w-0 flex-1">
                                <span className="text-xs font-medium uppercase tracking-wide text-muted">
                                  {TOPIC_LABELS[task.topic]}
                                </span>
                                <h4 className="mt-1 font-semibold leading-6">{task.title}</h4>
                                <p className="mt-2 text-sm leading-6 text-muted">{task.body}</p>
                                <div className="mt-3 rounded-lg bg-[var(--surface-sunken)] p-3">
                                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                                    O que fazer
                                  </p>
                                  <p className="mt-1 text-sm font-medium leading-6">
                                    {task.action}
                                  </p>
                                </div>
                                {task.sources && task.sources.length > 0 ? (
                                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2">
                                    {task.sources.map((source) => (
                                      <a
                                        key={`${task.id}-${source.url}`}
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex min-h-11 items-center text-xs font-medium text-[var(--accent)] underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
                                      >
                                        {sourceKindLabel(source)}: {source.label}
                                      </a>
                                    ))}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="neighborhoods-heading" className="scroll-mt-20">
            <div className="mb-4">
              <h2 id="neighborhoods-heading" className="text-xl font-semibold tracking-tight">
                Onde morar: comece pela rotina, não pelo ranking
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                Estes recortes servem para montar uma shortlist. Em Manaus, endereço exato, horário
                e destino diário pesam mais que uma lista genérica de “melhores bairros”.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {MANAUS_NEIGHBORHOODS.map((area) => (
                <article
                  key={area.name}
                  className="rounded-xl border border-border bg-[var(--surface)] p-4"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
                    {area.profile}
                  </p>
                  <h3 className="mt-1 font-semibold">{area.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted">{area.goodFor}</p>
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted">
                      Confira antes
                    </p>
                    <p className="mt-1 text-sm leading-6">{area.watch}</p>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              Síntese editorial baseada em relatos recentes de moradores e transferidos. Não é
              ranking de segurança, valorização ou qualidade de vida.
            </p>
          </section>

          <CommunityDirectory
            entries={entries}
            filteredEntries={filteredCommunityEntries}
            loading={loading}
            error={error}
            memberCount={memberCount}
            category={communityCategory}
            setCategory={setCommunityCategory}
            onRetry={loadEntries}
            cityName={cityName}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6" aria-label="Referência rápida de Manaus">
          <section
            className="rounded-xl border border-border bg-[var(--surface)] p-4"
            aria-labelledby="quick-heading"
          >
            <h2 id="quick-heading" className="text-base font-semibold">
              Quatro coisas para saber cedo
            </h2>
            <div className="mt-3 divide-y divide-[var(--border)]">
              {MANAUS_QUICK_FACTS.map((fact) => (
                <article key={fact.title} className="py-3 first:pt-0 last:pb-0">
                  <h3 className="text-sm font-semibold leading-5">{fact.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted">{fact.body}</p>
                  <a
                    href={fact.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex min-h-11 items-center text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  >
                    {sourceKindLabel(fact.source)}
                  </a>
                </article>
              ))}
            </div>
          </section>

          <section
            className="rounded-xl border border-border bg-[var(--surface)] p-4"
            aria-labelledby="emergency-heading"
          >
            <h2 id="emergency-heading" className="text-base font-semibold">
              Emergência
            </h2>
            <ul className="mt-3 space-y-2">
              {MANAUS_CONTACTS.map((contact) => (
                <li key={contact.value}>
                  <a
                    href={`tel:${contact.value}`}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 transition-colors hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  >
                    <span>
                      <span className="block text-sm font-semibold">{contact.label}</span>
                      <span className="block text-xs text-muted">{contact.note}</span>
                    </span>
                    <span className="text-lg font-semibold text-[var(--accent)]">
                      {contact.value}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section
            className="rounded-xl border border-border bg-[var(--surface-sunken)] p-4"
            aria-labelledby="source-note-heading"
          >
            <h2 id="source-note-heading" className="text-sm font-semibold">
              Como este guia é mantido
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              Serviço público, documentação e canais de atendimento devem apontar para fonte
              oficial. Relatos de moradores entram como experiência e precisam ser reconfirmados no
              endereço ou situação concreta. Indicações da comunidade aparecem separadas logo
              abaixo.
            </p>
            <p className="mt-2 text-xs leading-5 text-muted">
              Revisão editorial: {GUIDE_LAST_REVIEWED}.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}

function CommunityGuide({ localityId, cityName }: { localityId: string; cityName: string }) {
  const supabase = useMemo(() => createBrowserClient(), [])
  const [entries, setEntries] = useState<GuideEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<"all" | GuideCategory>("all")
  const [memberCount, setMemberCount] = useState<number | null>(null)

  const loadEntries = useCallback(async () => {
    setLoading(true)
    setError("")
    const { data, error: guideError } = await supabase
      .from("arrival_guide_entries")
      .select("*")
      .eq("locality_id", localityId)
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
  }, [localityId, supabase])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { count } = await supabase
          .from("locality_memberships")
          .select("*", { count: "exact", head: true })
          .eq("locality_id", localityId)
        if (!cancelled && count !== null) setMemberCount(count)
      } catch {
        // Standard copy remains available.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [localityId, supabase])

  const normalizedQuery = normalize(query.trim())
  const filteredEntries = entries.filter((entry) => {
    if (category !== "all" && entry.category !== category) return false
    if (!normalizedQuery) return true
    return normalize(`${entry.name} ${entry.description}`).includes(normalizedQuery)
  })

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Guia de chegada — {cityName}</h1>
        <p className="text-sm text-muted">
          Referência permanente e curada pela comunidade: colégio, hospital, transportadora e
          despachante.
        </p>
      </header>

      <input
        type="search"
        aria-label="Buscar no guia"
        placeholder="Buscar por nome ou descrição..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="min-h-11 w-full rounded-lg border border-border bg-[var(--surface)] px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
      />

      <CommunityDirectory
        entries={entries}
        filteredEntries={filteredEntries}
        loading={loading}
        error={error}
        memberCount={memberCount}
        category={category}
        setCategory={setCategory}
        onRetry={loadEntries}
        cityName={cityName}
        compact
      />
    </div>
  )
}

function CommunityDirectory({
  entries,
  filteredEntries,
  loading,
  error,
  memberCount,
  category,
  setCategory,
  onRetry,
  cityName,
  compact = false,
}: {
  entries: GuideEntry[]
  filteredEntries: GuideEntry[]
  loading: boolean
  error: string
  memberCount: number | null
  category: "all" | GuideCategory
  setCategory: (category: "all" | GuideCategory) => void
  onRetry: () => void
  cityName: string
  compact?: boolean
}) {
  return (
    <section aria-labelledby="community-guide-heading" className={compact ? "" : "scroll-mt-20"}>
      <div className="mb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="community-guide-heading" className="text-xl font-semibold tracking-tight">
              Indicações aprovadas pela comunidade
            </h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              A camada viva do guia: referências locais que passaram pela curadoria do Bivaque em{" "}
              {cityName}.
            </p>
          </div>
          {entries.length > 0 ? (
            <span className="text-xs font-medium text-muted">
              {entries.length} entradas aprovadas
            </span>
          ) : null}
        </div>
      </div>

      <fieldset className="mb-4 flex flex-wrap gap-2">
        <legend className="sr-only">Filtrar indicações por categoria</legend>
        <button
          type="button"
          onClick={() => setCategory("all")}
          className={`min-h-11 rounded-full border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 ${
            category === "all"
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
              : "border-border bg-[var(--surface)] text-muted hover:bg-[var(--surface-subtle)]"
          }`}
        >
          Todas
        </button>
        {CATEGORY_ORDER.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setCategory(item)}
            className={`min-h-11 rounded-full border px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 ${
              category === item
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                : "border-border bg-[var(--surface)] text-muted hover:bg-[var(--surface-subtle)]"
            }`}
          >
            {CATEGORY_LABELS[item]}
          </button>
        ))}
      </fieldset>

      {error ? <ErrorState message={error} onRetry={onRetry} /> : null}

      {loading && !error ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : null}

      {!loading && !error && entries.length === 0 ? (
        <EmptyState
          title={
            isLocalityStale(memberCount)
              ? "Você é dos primeiros aqui."
              : "O guia desta cidade está vazio."
          }
          description={
            isLocalityStale(memberCount)
              ? "As indicações locais ainda estão em construção. Conforme a comunidade contribui, o operador cura cada entrada antes de publicar."
              : "Nenhuma indicação aprovada para esta cidade ainda."
          }
        />
      ) : null}

      {!loading && !error && entries.length > 0 && filteredEntries.length === 0 ? (
        <p className="rounded-xl border border-border bg-[var(--surface)] p-4 text-sm text-muted">
          Nenhuma indicação encontrada com esse filtro.
        </p>
      ) : null}

      {!loading && !error && filteredEntries.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {filteredEntries.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-2 rounded-xl border border-border bg-[var(--surface)] p-4"
            >
              <div>
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">
                  {CATEGORY_LABELS[entry.category]}
                </span>
                <h3 className="mt-1 font-semibold">{entry.name}</h3>
              </div>
              <p className="text-sm leading-6 text-muted">{entry.description}</p>
              {entry.phone || entry.website_url ? (
                <div className="flex flex-wrap gap-2 pt-1 text-sm">
                  {entry.phone ? (
                    <a
                      href={`tel:${entry.phone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex min-h-11 items-center rounded-full border border-border px-3 font-medium transition-colors hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
                    >
                      {entry.phone}
                    </a>
                  ) : null}
                  {entry.website_url ? (
                    <a
                      href={entry.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 items-center rounded-full bg-[var(--accent)] px-3 font-medium text-[var(--accent-foreground)] transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2"
                    >
                      Ver site
                    </a>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
