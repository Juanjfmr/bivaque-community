// Adaptado de ecomcn (MIT): apenas facetas de lista; origem em ORIGEM.md.
"use client"

import * as React from "react"
import { Icone } from "@/components/bivaque/icone"

import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import {
  type ActiveFilter,
  describeActiveFilters,
  type FilterFacet,
  type FilterState,
  getValues,
  type ListFacet,
  removeFilter,
  toggleFilterValue,
} from "./filter-params"

const subscribeNothing = () => () => {}

/**
 * Your locale, or the visitor's once hydrated. The server can't know the
 * visitor's locale, and its HTML must match the first client render — a
 * server in en-IN prints "1,24,000" where an en-US browser prints
 * "124,000" — so until hydration it formats in en-US.
 */
function useFormatLocale(locale?: string | undefined) {
  const hydrated = React.useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  )
  return locale ?? (hydrated ? undefined : "en-US")
}

/* ─── context ──────────────────────────────────────────────────────────────
 * Compound component: <FilterPanel> owns the state and renders its own
 * provider, so nothing has to be mounted above it. Every part reads that
 * state through useFilterPanel(), which throws outside a panel instead of
 * failing silently with undefined values.
 */

export interface FilterPanelContextValue {
  facets: FilterFacet[]
  value: FilterState
  setValue: (next: FilterState) => void
  /** The facet with this id, if the panel has one. */
  getFacet: (id: string) => FilterFacet | undefined
  /** Human labels for everything that is on, in facet order. */
  active: ActiveFilter[]
  currency: string
  locale?: string | undefined
  loading?: boolean | undefined
  title: string
  titleId: string
  /** Focus lands here when the control that had it disappears. */
  rootRef: React.RefObject<HTMLElement | null>
}

const FilterPanelContext = React.createContext<FilterPanelContextValue | null>(null)

export function useFilterPanel() {
  const context = React.useContext(FilterPanelContext)
  if (!context) {
    throw new Error("useFilterPanel must be used within <FilterPanel>.")
  }
  return context
}

const NO_FILTERS: FilterState = {}

/** Controlled when `value` is passed, uncontrolled from `defaultValue` otherwise. */
function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (next: T) => void,
) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const controlled = value !== undefined
  const set = React.useCallback(
    (next: T) => {
      if (!controlled) setUncontrolled(next)
      onChange?.(next)
    },
    [controlled, onChange],
  )
  return [controlled ? value : uncontrolled, set] as const
}

/* ─── root ─────────────────────────────────────────────────────────────── */

export interface FilterPanelProps
  extends Omit<React.HTMLAttributes<HTMLElement>, "defaultValue" | "onChange"> {
  facets: FilterFacet[]
  /** Usually straight from `useFilterParams`, so the state lives in the URL. */
  value?: FilterState
  defaultValue?: FilterState
  onValueChange?: (next: FilterState) => void
  /** ISO 4217 code for `format: "currency"` range facets. */
  currency?: string | undefined
  locale?: string | undefined
  /** Counts are stale while results load, so they render as placeholders. */
  loading?: boolean | undefined
  /** Default layout only: drop the title row, e.g. inside a sheet that has one. */
  hideHeader?: boolean
  title?: string
  /**
   * Compose your own layout from FilterPanelHeader, FilterPanelChips and
   * FilterPanelFacet — reorder, omit, or put your own content between them.
   * Leave empty for the default: header, chips, then every facet in order.
   */
  children?: React.ReactNode
}

export function FilterPanel({
  facets,
  value: valueProp,
  defaultValue = NO_FILTERS,
  onValueChange,
  currency = "USD",
  locale: localeProp,
  loading,
  hideHeader,
  title = "Filtros",
  className,
  children,
  ...props
}: FilterPanelProps) {
  const locale = useFormatLocale(localeProp)
  const [value, setValue] = useControllableState(valueProp, defaultValue, onValueChange)
  const titleId = React.useId()
  const rootRef = React.useRef<HTMLElement>(null)

  const context = React.useMemo<FilterPanelContextValue>(
    () => ({
      facets,
      value,
      setValue,
      getFacet: (id) => facets.find((facet) => facet.id === id),
      active: describeActiveFilters(value, facets),
      currency,
      locale,
      loading,
      title,
      titleId,
      rootRef,
    }),
    [facets, value, setValue, currency, locale, loading, title, titleId],
  )

  return (
    <FilterPanelContext.Provider value={context}>
      <section
        ref={rootRef}
        tabIndex={-1}
        aria-label={title}
        aria-busy={loading || undefined}
        data-slot="filter-panel"
        className={cn("text-sm outline-none", className)}
        {...props}
      >
        {children ?? (
          <>
            {hideHeader ? null : <FilterPanelHeader />}
            <FilterPanelChips />
            {facets.length === 0 ? (
              <p className="border-t py-4 text-muted-foreground">Nenhum filtro disponível.</p>
            ) : (
              facets.map((facet) => <FilterPanelFacet key={facet.id} id={facet.id} />)
            )}
          </>
        )}
      </section>
    </FilterPanelContext.Provider>
  )
}

/* ─── parts ────────────────────────────────────────────────────────────── */

export function FilterPanelHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const { active, setValue, title, titleId, rootRef } = useFilterPanel()

  return (
    <div
      data-slot="filter-panel-header"
      className={cn("flex items-baseline justify-between gap-4 pb-3", className)}
      {...props}
    >
      <h2 id={titleId} className="text-xs font-medium tracking-[0.14em] uppercase">
        {title}
        {active.length > 0 && (
          <span className="ml-1.5 text-muted-foreground tabular-nums">{active.length}</span>
        )}
      </h2>
      {active.length > 0 && (
        <button
          type="button"
          onClick={() => {
            // This button is about to disappear; hand focus to the panel first.
            rootRef.current?.focus()
            setValue({})
          }}
          className="text-xs text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:text-foreground focus-visible:underline"
        >
          Limpar filtros
        </button>
      )}
    </div>
  )
}

export function FilterPanelChips({ className, ...props }: React.HTMLAttributes<HTMLUListElement>) {
  const { active, value, setValue, rootRef } = useFilterPanel()

  // Removing a chip deletes the button that had focus. Put focus on the chip
  // that slid into its place — or the panel itself — instead of <body>.
  const chips = React.useRef<(HTMLButtonElement | null)[]>([])
  const refocus = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (refocus.current === null) return
    const index = Math.min(refocus.current, active.length - 1)
    refocus.current = null
    const alvo = chips.current[index] ?? rootRef.current
    alvo?.focus()
  }, [active.length, rootRef])

  if (active.length === 0) return null

  return (
    <ul
      aria-label="Filtros aplicados"
      data-slot="filter-panel-chips"
      className={cn("flex flex-wrap gap-1.5 pb-4", className)}
      {...props}
    >
      {active.map((filter, index) => (
        <li key={`${filter.facetId}:${filter.value ?? ""}`}>
          <button
            ref={(node) => {
              chips.current[index] = node
            }}
            type="button"
            onClick={() => {
              refocus.current = index
              setValue(removeFilter(value, filter.facetId, filter.value))
            }}
            className="group inline-flex h-7 items-center gap-1.5 rounded-sm border bg-secondary/60 pr-1.5 pl-2 text-xs transition-colors outline-none hover:border-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="sr-only">Remover {filter.facetLabel}:</span>
            {filter.label}
            <Icone
              nome="close"
              className="size-3 text-muted-foreground group-hover:text-foreground"
            />
          </button>
        </li>
      ))}
    </ul>
  )
}

export interface FilterPanelFacetProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The facet's id — the same string that keys it in the URL. */
  id: string
  /** Collapsible facets start open unless this is false. */
  defaultOpen?: boolean
}

export function FilterPanelFacet({
  id,
  defaultOpen = true,
  className,
  ...props
}: FilterPanelFacetProps) {
  const { getFacet } = useFilterPanel()
  const facet = getFacet(id)

  // An id with no facet renders nothing, so a server that drops an empty
  // facet from the list doesn't break a hand-written layout.
  if (!facet) return null
  return <FacetSection facet={facet} defaultOpen={defaultOpen} className={className} {...props} />
}

/* ─── internals ────────────────────────────────────────────────────────── */

function FacetSection({
  facet,
  defaultOpen,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  facet: ListFacet
  defaultOpen: boolean
}) {
  const { value } = useFilterPanel()
  const [open, setOpen] = React.useState(defaultOpen)
  const id = React.useId()

  if (facet.options.length === 0) return null

  const selected = getValues(value, facet.id).length

  return (
    // Groups are separated by a top rule, not boxed: the panel reads as one
    // ruled column, the way a printed index does.
    <div
      data-slot="filter-panel-facet"
      data-facet={facet.id}
      className={cn("border-t py-4", className)}
      {...props}
    >
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-body`}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 rounded-sm text-left font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span>
            {facet.label}
            {selected > 0 && (
              <span className="ml-1.5 font-normal text-muted-foreground tabular-nums">
                ({selected})
              </span>
            )}
          </span>
          {open ? (
            <Icone nome="remove" className="text-muted-foreground" />
          ) : (
            <Icone nome="add" className="text-muted-foreground" />
          )}
        </button>
      </h3>
      <div id={`${id}-body`} hidden={!open} className="pt-3">
        <ListOptions facet={facet} />
      </div>
    </div>
  )
}

function Count({ count }: { count?: number | undefined }) {
  const { loading, locale } = useFilterPanel()
  if (loading) {
    return <span aria-hidden className="h-3 w-6 shrink-0 animate-pulse rounded-sm bg-muted" />
  }
  if (count === undefined) return null
  // Tabular figures, right-aligned: a column of counts that doesn't line up
  // is the first thing that makes a filter panel look unfinished.
  return (
    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
      {new Intl.NumberFormat(locale).format(count)}
    </span>
  )
}

function ListOptions({ facet }: { facet: ListFacet }) {
  const inputId = React.useId()
  const { value, setValue } = useFilterPanel()
  const [expanded, setExpanded] = React.useState(false)
  const selected = getValues(value, facet.id)
  const limit = facet.limit ?? 6

  // Selected options stay visible when the list collapses, or a shopper
  // loses sight of a filter that is still applied.
  const collapsed = facet.options.filter(
    (option, index) => index < limit || selected.includes(option.value),
  )
  const hidden = facet.options.length - collapsed.length
  const visible = expanded ? facet.options : collapsed

  return (
    <>
      <ul className="space-y-0.5">
        {visible.map((option) => {
          const checked = selected.includes(option.value)
          const disabled = option.disabled ?? (option.count === 0 && !checked)
          return (
            <li key={option.value}>
              <label
                htmlFor={`${inputId}-${option.value}`}
                className={cn(
                  "flex min-h-8 cursor-pointer items-center gap-3 py-1",
                  disabled && "cursor-not-allowed text-muted-foreground",
                )}
              >
                <Checkbox
                  id={`${inputId}-${option.value}`}
                  checked={checked}
                  disabled={disabled}
                  onCheckedChange={() => setValue(toggleFilterValue(value, facet.id, option.value))}
                />
                <span className="flex-1 leading-tight">{option.label}</span>
                <Count count={option.count} />
              </label>
            </li>
          )
        })}
      </ul>
      {(hidden > 0 || expanded) && facet.options.length > limit && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs underline underline-offset-4 outline-none hover:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {expanded ? "Mostrar menos" : `Mostrar mais ${hidden}`}
        </button>
      )}
    </>
  )
}
