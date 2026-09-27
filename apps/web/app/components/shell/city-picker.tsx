"use client"

import { ChevronRight, MapPin, Search } from "lucide-react"
import { useEffect, useId, useState } from "react"
import {
  type CityOption,
  searchCitiesAction,
} from "../../(preauth)/onboarding/locality/city-actions"

// Busca no catálogo de cidades (IBGE), a mesma do onboarding. Usada pelo chip
// de cidade do cabeçalho (consultar outra cidade) e pelo perfil (mudar a sua).
// Só lista e devolve a escolha; quem decide o que fazer com ela é quem usa.

/** Espera entre teclas antes de buscar: digitar "Brasília" não faz oito buscas. */
const SEARCH_DEBOUNCE_MS = 250

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; cities: CityOption[] }

export function CityPicker({
  onPick,
  excludeIds = [],
  label,
  autoFocus = false,
}: {
  onPick: (city: CityOption) => void
  excludeIds?: readonly string[]
  label: string
  autoFocus?: boolean
}) {
  const inputId = useId()
  const [query, setQuery] = useState("")
  const [state, setState] = useState<State>({ status: "idle" })
  const [attempt, setAttempt] = useState(0)

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt é o gatilho de "tentar de novo"
  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setState({ status: "idle" })
      return
    }
    let cancelled = false
    setState({ status: "loading" })
    const timer = window.setTimeout(() => {
      searchCitiesAction(term)
        .then((cities) => {
          if (!cancelled) setState({ status: "ready", cities })
        })
        .catch(() => {
          if (!cancelled) setState({ status: "error" })
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, attempt])

  const cities =
    state.status === "ready" ? state.cities.filter((city) => !excludeIds.includes(city.id)) : []

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-ui-ink">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2 rounded-full bg-ui-bg px-4 transition-colors focus-within:bg-ui-surface focus-within:outline-2 focus-within:outline-ui-brand">
        <Search size={16} aria-hidden="true" className="shrink-0 text-ui-ink-2" />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Nome da cidade"
          autoComplete="off"
          // biome-ignore lint/a11y/noAutofocus: o campo é a única coisa do diálogo que acabou de abrir
          autoFocus={autoFocus}
          className="min-h-11 w-full bg-transparent text-sm text-ui-ink outline-none placeholder:text-ui-ink-2"
        />
      </div>

      <div aria-live="polite" className="mt-2">
        {state.status === "idle" ? (
          <p className="px-1 text-xs text-ui-ink-2">Digite ao menos duas letras.</p>
        ) : state.status === "loading" ? (
          <p className="px-1 text-xs text-ui-ink-2">Buscando cidades…</p>
        ) : state.status === "error" ? (
          <div className="flex items-center justify-between gap-2 px-1">
            <p className="text-sm text-ui-ink-2">Não foi possível buscar as cidades.</p>
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="inline-flex min-h-11 items-center rounded-ui px-3 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
            >
              Tentar de novo
            </button>
          </div>
        ) : cities.length === 0 ? (
          <p className="px-1 text-sm text-ui-ink-2">Nenhuma cidade com esse nome.</p>
        ) : (
          <ul className="max-h-72 divide-y divide-ui-line overflow-y-auto">
            {cities.map((city) => (
              <li key={city.id}>
                <button
                  type="button"
                  onClick={() => onPick(city)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-ui px-2 py-2 text-left transition-colors hover:bg-ui-subtle"
                >
                  <MapPin size={16} className="shrink-0 text-ui-brand" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm text-ui-ink">
                    {city.cityName}
                    <span className="text-ui-ink-2">, {city.stateCode}</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-ui-ink-2" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
