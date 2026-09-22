"use client"

import { Bookmark } from "lucide-react"
import { useState, useTransition } from "react"
import { toggleListingSaveAction } from "../../../lib/listings/actions"

// O marcador de salvar — o mesmo vocabulário de Mercado, Guia e Salvos. Nunca
// um coração (decisão registrada na leitura da prancha 65). O estado vem do
// servidor; a alternância persiste em `listing_saves` e reverte se falhar.
export function SaveListingButton({
  listingId,
  initialSaved,
  className,
}: {
  listingId: string
  initialSaved: boolean
  className?: string
}) {
  const [saved, setSaved] = useState(initialSaved)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function toggle() {
    const next = !saved
    startTransition(async () => {
      const formData = new FormData()
      formData.set("listingId", listingId)
      formData.set("saved", String(saved))
      const result = await toggleListingSaveAction(formData)
      if (result.ok) {
        setSaved(next)
        setError(null)
      } else {
        setError(result.message ?? "Não foi possível salvar agora.")
      }
    })
  }

  return (
    <span className={className}>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={saved}
        aria-label={saved ? "Remover dos salvos" : "Salvar anúncio"}
        title={error ?? (saved ? "Remover dos salvos" : "Salvar anúncio")}
        disabled={pending}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-[var(--semantic-surface)] text-[var(--semantic-action-primary)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
      >
        <Bookmark
          size={18}
          aria-hidden="true"
          fill={saved ? "currentColor" : "none"}
          className="transition-transform duration-[var(--semantic-motion-duration-fast)]"
        />
      </button>
      {error ? <span className="sr-only">{error}</span> : null}
    </span>
  )
}
