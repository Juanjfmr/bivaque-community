"use client"

// RECON-021 — the header search field from the member pranchas ("Buscar no
// Bivaque", the most prominent header element in all of them, prancha 61).
// A native GET form to /explorar/busca with the canonical `q`: it works
// without JS, and the term survives reload, back/forward and opening in a
// new tab because it lives in the URL. Enter submits (implicit submission of
// a single-field form); a second magnifier as a submit button only repeated
// the icon on the left.

import { Search } from "lucide-react"
import { useId } from "react"

// O shell monta dois campos (o do desktop e o da linha do celular, um sempre
// escondido). Com o mesmo `id` fixo, os dois rótulos apontavam para o
// PRIMEIRO campo — o escondido no celular —, e leitor de tela e testes caíam
// no campo errado (achado em 25/09/2026). Cada campo tem o seu id.
export function GlobalSearchField() {
  const fieldId = useId()
  return (
    <search className="block w-full">
      <form action="/explorar/busca" method="get" className="w-full">
        <label htmlFor={fieldId} className="sr-only">
          Buscar no Bivaque
        </label>
        <div className="flex items-center gap-2 rounded-full bg-ui-bg px-4 transition-colors focus-within:bg-ui-surface focus-within:outline-2 focus-within:outline-ui-brand">
          <Search size={18} aria-hidden="true" className="shrink-0 text-ui-ink-2" />
          <input
            id={fieldId}
            name="q"
            type="search"
            placeholder="Buscar no Bivaque"
            autoComplete="off"
            className="min-h-11 w-full bg-transparent text-sm text-ui-ink outline-none transition-colors placeholder:text-ui-ink-2"
          />
        </div>
      </form>
    </search>
  )
}
