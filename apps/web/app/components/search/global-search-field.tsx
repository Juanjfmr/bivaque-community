"use client"

// RECON-021 — the header search field from the member pranchas ("Buscar no
// Bivaque", the most prominent header element in all of them, prancha 61).
// A native GET form to /explorar/busca with the canonical `q`: it works
// without JS, and the term survives reload, back/forward and opening in a
// new tab because it lives in the URL.

import { Search } from "lucide-react"

export function GlobalSearchField() {
  return (
    <search className="block w-full">
      <form action="/explorar/busca" method="get" className="w-full">
        <label htmlFor="global-busca" className="sr-only">
          Buscar no Bivaque
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-[var(--semantic-surface)] px-3">
          <Search size={18} aria-hidden="true" className="shrink-0 text-muted" />
          <input
            id="global-busca"
            name="q"
            type="search"
            placeholder="Buscar no Bivaque"
            autoComplete="off"
            className="min-h-11 w-full bg-transparent text-sm transition-colors duration-[var(--semantic-motion-duration-instant)]"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-sm font-medium text-[var(--accent)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
          >
            <Search size={18} aria-hidden="true" />
          </button>
        </div>
      </form>
    </search>
  )
}
