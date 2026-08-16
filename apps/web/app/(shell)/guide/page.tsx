"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Database } from "supabase/database.generated"
import { PILOT_LOCALITY_ID } from "../../../lib/locality"
import { createBrowserClient } from "../../../lib/supabase/client"
import { ErrorState } from "../../components/bivaque/error-state"
import { Skeleton } from "../../components/bivaque/skeleton"

type GuideEntry = Database["public"]["Tables"]["arrival_guide_entries"]["Row"]
type GuideCategory = GuideEntry["category"]

const CATEGORY_LABELS: Record<GuideCategory, string> = {
  school: "Colégio",
  hospital: "Hospital",
  transporter: "Transportadora",
  courier: "Despachante",
}

const CATEGORY_ORDER: GuideCategory[] = ["school", "hospital", "transporter", "courier"]

export default function GuidePage() {
  const [entries, setEntries] = useState<GuideEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<"all" | GuideCategory>("all")

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
      .eq("locality_id", PILOT_LOCALITY_ID)
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
  }, [supabase])

  useEffect(() => {
    loadEntries()
  }, [loadEntries])

  const filteredEntries = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false
      if (!normalized) return true
      return (
        entry.name.toLowerCase().includes(normalized) ||
        entry.description.toLowerCase().includes(normalized)
      )
    })
  }, [entries, category, query])

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Guia de chegada</h1>
        <p className="text-sm text-muted">
          Referência permanente para quem está chegando: colégio, hospital, transportadora e
          despachante.
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <input
          type="search"
          aria-label="Buscar no guia"
          placeholder="Buscar por nome ou descrição..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-11 w-full rounded-lg border border-border bg-[var(--surface)] px-3 py-2 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        />

        <fieldset className="flex flex-wrap gap-2">
          <legend className="sr-only">Filtrar por categoria</legend>
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`min-h-11 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              category === "all"
                ? "border-accent bg-accent text-accent-foreground"
                : "border-border bg-surface text-muted hover:bg-surface-subtle"
            }`}
          >
            Todos
          </button>
          {CATEGORY_ORDER.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`min-h-11 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                category === item
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-border bg-surface text-muted hover:bg-surface-subtle"
              }`}
            >
              {CATEGORY_LABELS[item]}
            </button>
          ))}
        </fieldset>
      </div>

      {error && <ErrorState message={error} onRetry={() => loadEntries()} />}

      {loading && !error && (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}

      {!loading && !error && filteredEntries.length === 0 && (
        <p className="text-sm text-muted">Nenhum item encontrado no guia.</p>
      )}

      {!loading && !error && filteredEntries.length > 0 && (
        <ul className="flex flex-col gap-3">
          {filteredEntries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    {CATEGORY_LABELS[entry.category]}
                  </span>
                  <h2 className="mt-1 font-semibold">{entry.name}</h2>
                </div>
              </div>
              <p className="text-sm text-muted">{entry.description}</p>
              {(entry.phone || entry.website_url) && (
                <div className="flex flex-wrap gap-3 text-sm">
                  {entry.phone && <span>{entry.phone}</span>}
                  {entry.website_url && (
                    <a
                      href={entry.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 min-w-11 items-center text-accent transition-colors hover:underline"
                    >
                      Ver site
                    </a>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
