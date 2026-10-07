"use client"

import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { saveListing, unsaveListing } from "../../../lib/listings/saves"
import styles from "./listing-cards.module.css"

// FIGMA-002 — a ação Salvar das pranchas property-list (ícone flutuante sobre a
// capa) e property-detail (botão secundário no cabeçalho). Um componente, duas
// geometrias, o mesmo caminho real: Server Action com a sessão do caller e
// revalidação da rota, de modo que o estado salvo persiste por reload.
//
// O botão nunca mente: só alterna para "Salvo" quando a Server Action devolveu
// sucesso, e a falha vira texto legível com o estado anterior preservado.

interface ListingSaveButtonProps {
  listingId: string
  saved: boolean
  /** `icon` é o botão flutuante 44px da capa; `button` é o secundário do detalhe. */
  variant?: "icon" | "button"
}

export function ListingSaveButton({
  listingId,
  saved,
  variant = "button",
}: ListingSaveButtonProps) {
  const router = useRouter()
  const [isSaved, setIsSaved] = useState(saved)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = useCallback(async () => {
    setPending(true)
    setError(null)
    const form = new FormData()
    form.set("listing_id", listingId)
    try {
      const result = isSaved ? await unsaveListing(form) : await saveListing(form)
      if (result.ok) {
        setIsSaved(!isSaved)
        router.refresh()
        return
      }
      setError(result.error ?? "Não foi possível atualizar seus salvos agora.")
    } catch {
      setError("Não foi possível atualizar seus salvos agora. Tente novamente.")
    } finally {
      setPending(false)
    }
  }, [isSaved, listingId, router])

  const label = isSaved ? "Remover dos salvos" : "Salvar"

  if (variant === "icon") {
    return (
      <>
        <div className={styles["cardSaveFloat"]}>
          <button
            type="button"
            className={styles["cardSaveFloatButton"]}
            data-saved={isSaved}
            disabled={pending}
            aria-pressed={isSaved}
            aria-label={label}
            onClick={() => {
              void handleClick()
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              {/* Prancha property-list/property-detail: a ação é um MARCADOR
                  (bookmark), não um coração. O preenchimento acompanha o estado
                  salvo e o preenchimento visual nunca substitui o aria-pressed. */}
              <path
                d="M7 4h10a1 1 0 0 1 1 1v15l-6-4.2L6 20V5a1 1 0 0 1 1-1Z"
                fill={isSaved ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {error ? (
          <p role="alert" className={styles["cardSaveError"]}>
            {error}
          </p>
        ) : null}
      </>
    )
  }

  return (
    <div className={styles["actionRow"]}>
      <button
        type="button"
        className={styles["secondaryButton"]}
        aria-pressed={isSaved}
        disabled={pending}
        onClick={() => {
          void handleClick()
        }}
      >
        {pending ? "Atualizando…" : label}
      </button>
      {error ? (
        <span role="alert" className={styles["fieldHint"]}>
          {error}
        </span>
      ) : null}
    </div>
  )
}
