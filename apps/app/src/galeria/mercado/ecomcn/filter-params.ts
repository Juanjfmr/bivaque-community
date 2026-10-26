// Adaptado dos helpers puros ecomcn (MIT); sem parser de URL ou escrita de histórico.
export interface ListFacet {
  id: string
  label: string
  type: "list"
  options: { value: string; label: string; count?: number; disabled?: boolean }[]
  limit?: number
}

export type FilterFacet = ListFacet
export type FilterState = Record<string, string[] | undefined>
export interface ActiveFilter {
  facetId: string
  facetLabel: string
  value: string
  label: string
}

export function getValues(state: FilterState, id: string): string[] {
  return state[id] ?? []
}

export function toggleFilterValue(state: FilterState, id: string, value: string): FilterState {
  const current = getValues(state, id)
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
  return { ...state, [id]: next.length ? next : undefined }
}

export function removeFilter(state: FilterState, id: string, value?: string): FilterState {
  if (value === undefined) return { ...state, [id]: undefined }
  const next = getValues(state, id).filter((v) => v !== value)
  return { ...state, [id]: next.length ? next : undefined }
}

export function describeActiveFilters(state: FilterState, facets: FilterFacet[]): ActiveFilter[] {
  return facets.flatMap((facet) =>
    getValues(state, facet.id).map((value) => ({
      facetId: facet.id,
      facetLabel: facet.label,
      value,
      label: facet.options.find((option) => option.value === value)?.label ?? value,
    })),
  )
}

export function countActiveFilters(state: FilterState, facets: FilterFacet[]) {
  return describeActiveFilters(state, facets).length
}

export function isSameFilters(a: FilterState, b: FilterState, facets: FilterFacet[]) {
  return facets.every(({ id }) => {
    const left = getValues(a, id)
    const right = getValues(b, id)
    return left.length === right.length && left.every((value) => right.includes(value))
  })
}
