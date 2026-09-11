// RECON-021 — canonical URL parameters for the search routes.
//
// `q` is the canonical term (spec §3.2); `search` is accepted ONLY at the edge
// as the old alias, never as a second meaning. When both are present `q` wins:
// one parameter, one meaning, no silent merge.

export function resolveTerm(get: (key: string) => string | null): string {
  const q = get("q")
  if (q !== null) return q.trim()
  return (get("search") ?? "").trim()
}

export function resolvePage(raw: string | null): number {
  const parsed = Number.parseInt(raw ?? "1", 10)
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1
}

export interface Window<T> {
  items: T[]
  page: number
  pageCount: number
  total: number
}

export function paginate<T>(rows: T[], page: number, perPage: number): Window<T> {
  const total = rows.length
  const pageCount = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(Math.max(1, page), pageCount)
  const start = (current - 1) * perPage
  return { items: rows.slice(start, start + perPage), page: current, pageCount, total }
}

// PostgREST answers an expired or invalid JWT as 401 / PGRST301 before the
// query ever runs. Classifying it apart from a real failure is what lets the
// screen say "sua sessão expirou" instead of pretending the city is empty —
// the exact confusion the /guide comment about expired tokens warns about.
export function isSessionExpiredError(
  error: { code?: string | null; message?: string | null } | null | undefined,
): boolean {
  if (!error) return false
  const code = (error.code ?? "").toUpperCase()
  if (code === "PGRST301" || code === "401") return true
  return /jwt expired|invalid jwt|jwserror/i.test(error.message ?? "")
}
