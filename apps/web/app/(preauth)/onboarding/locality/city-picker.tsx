"use client"

import { useEffect, useRef, useState } from "react"
import { MaterialOutlinedTextField } from "../../../components/material/outlined-text-field"
import { type CityOption, searchCitiesAction } from "./city-actions"

// PORT-005 (lote 4 da entrada) — a escolha de cidade da tela de entrada.
//
// O protótipo usa um `md-outlined-select` com as ~40 cidades da maquete. O
// catálogo do Next é nacional (5.570 cidades): um select com todas as opções
// mandaria centenas de KB de `<md-select-option>` no HTML e um menu inutilizável.
// A busca por nome com lista de resultados é o mesmo padrão que a tela de cidade
// já usava antes desta rodada (mesma Server Action, mesmo catálogo), e mantém o
// campo com o rótulo do protótipo.
//
// A falha de catálogo é erro recuperável e dito na tela — nunca lista vazia
// silenciosa: "nenhuma cidade" e "não deu para carregar" são estados diferentes.

const SEARCH_DEBOUNCE_MS = 250

type CityPickerProperties = Readonly<{
  disabled?: boolean
  /** Cidade que não pode aparecer na lista (o destino nunca é a cidade atual). */
  excludeIbgeCode?: string | undefined
  id: string
  label: string
  listLabel: string
  onChange: (city: CityOption) => void
  value: CityOption | null
}>

export function CityPicker({
  disabled,
  excludeIbgeCode,
  id,
  label,
  listLabel,
  onChange,
  value,
}: CityPickerProperties) {
  const [query, setQuery] = useState("")
  const [cities, setCities] = useState<CityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  // A primeira busca sai na hora; a partir da digitação, espera a pausa.
  const firstSearch = useRef(true)

  useEffect(() => {
    let cancelled = false
    const delay = firstSearch.current ? 0 : SEARCH_DEBOUNCE_MS
    firstSearch.current = false

    const handle = window.setTimeout(async () => {
      setLoading(true)
      setFailed(false)
      try {
        const results = await searchCitiesAction(query)
        if (!cancelled) setCities(results)
      } catch {
        if (!cancelled) {
          setCities([])
          setFailed(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, delay)

    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [query])

  const visible = cities.filter((city) => city.ibgeCode !== excludeIbgeCode)
  const term = query.trim()

  return (
    <div className="en-picker">
      <MaterialOutlinedTextField
        disabled={disabled}
        id={id}
        inputmode="search"
        label={label}
        onChange={setQuery}
        type="search"
        value={query}
      />

      {value ? (
        <p className="en-chosen">
          {`Escolhida: `}
          <b>{`${value.cityName} · ${value.stateCode}`}</b>
        </p>
      ) : null}

      {failed ? (
        <p className="en-sub" role="alert">
          Não foi possível carregar as cidades. Tente novamente.
        </p>
      ) : null}

      {loading && visible.length === 0 && !failed ? (
        <p className="en-sub" role="status">
          Carregando cidades...
        </p>
      ) : null}

      {!loading && !failed && visible.length === 0 ? (
        <p className="en-sub">
          {term.length > 0
            ? `Nenhuma cidade encontrada para “${term}”. Tente outro nome.`
            : "Nenhuma cidade disponível agora."}
        </p>
      ) : null}

      {visible.length > 0 ? (
        <ul aria-label={listLabel} className="en-cities">
          {visible.map((city) => {
            const selected = value?.ibgeCode === city.ibgeCode
            return (
              <li key={city.ibgeCode}>
                <button
                  aria-pressed={selected}
                  className="en-city"
                  data-state={selected ? "selected" : "idle"}
                  disabled={disabled}
                  onClick={() => onChange(city)}
                  type="button"
                >
                  <span>{city.cityName}</span>
                  <span className="en-city-uf">{city.stateCode}</span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
