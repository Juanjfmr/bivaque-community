"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { registerListingInterest } from "../../../lib/listings/actions"
import styles from "./listing-cards.module.css"

// FIGMA-002 — "Tenho interesse" (ADR D4): abre ou reencontra a conversa
// contextual do anúncio e leva para ela na central do FIGMA-001. Anúncio
// próprio ou fora do período ativo chega desabilitado COM motivo visível —
// nunca botão morto nem erro cru.

interface ListingInterestButtonProps {
  listingId: string
  disabled?: boolean
  disabledReason?: string
  existingConversationId?: string | null
}

export function ListingInterestButton({
  listingId,
  disabled = false,
  disabledReason,
  existingConversationId,
}: ListingInterestButtonProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    if (existingConversationId) {
      router.push(`/messages/${existingConversationId}`)
      return
    }
    setPending(true)
    setError(null)
    const form = new FormData()
    form.set("listing_id", listingId)
    let result: Awaited<ReturnType<typeof registerListingInterest>>
    try {
      result = await registerListingInterest(form)
    } catch {
      setPending(false)
      setError("Não foi possível abrir a conversa. Tente novamente.")
      return
    }
    setPending(false)
    if (result.ok && result.conversationId) {
      router.push(`/messages/${result.conversationId}`)
      return
    }
    setError(result.error ?? "Não foi possível registrar o interesse agora.")
  }

  return (
    <div className={styles["actionRow"]}>
      <button
        type="button"
        className={styles["primaryButton"]}
        disabled={disabled || pending}
        aria-describedby={disabledReason ? "interest-reason" : undefined}
        onClick={() => {
          void handleClick()
        }}
      >
        {pending ? "Registrando…" : existingConversationId ? "Ver conversa" : "Tenho interesse"}
      </button>
      {disabled && disabledReason ? (
        <span id="interest-reason" className={styles["fieldHint"]}>
          {disabledReason}
        </span>
      ) : null}
      {error ? (
        <span role="alert" className={styles["fieldHint"]}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
