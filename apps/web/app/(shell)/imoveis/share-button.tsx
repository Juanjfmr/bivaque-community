"use client"

import { Share2 } from "lucide-react"
import { useState } from "react"

// Compartilhar a ficha do imóvel. Usa o compartilhamento nativo quando existe e
// cai para copiar o link. Não compartilha contato nem promete canal interno.
export function ShareButton({ title, path }: { title: string; path: string }) {
  const [message, setMessage] = useState<string | null>(null)

  async function share() {
    const url = `${window.location.origin}${path}`
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        if ((error as Error).name === "AbortError") return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setMessage("Link copiado.")
    } catch {
      setMessage("Não foi possível compartilhar neste navegador.")
    }
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={share}
        className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-selected)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] focus-visible:ring-offset-2"
      >
        <Share2 size={16} aria-hidden="true" />
        Compartilhar
      </button>
      {message ? (
        <span role="status" className="absolute top-full right-0 mt-1 text-xs text-muted">
          {message}
        </span>
      ) : null}
    </span>
  )
}
