"use client"

import { useState } from "react"
import styles from "./listing-cards.module.css"

export function ListingShare({ listingId, title }: { listingId: string; title: string }) {
  const [message, setMessage] = useState("")
  async function share() {
    const url = new URL(`/imoveis/${listingId}`, window.location.origin).href
    try {
      if (navigator.share) {
        await navigator.share({ title, url })
        setMessage("Compartilhamento concluído.")
      } else {
        await navigator.clipboard.writeText(url)
        setMessage("Link copiado.")
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return
      setMessage("Não foi possível compartilhar. Copie o endereço desta página.")
    }
  }
  return (
    <div>
      <button
        type="button"
        className={styles["secondaryButton"]}
        onClick={() => {
          void share()
        }}
      >
        Compartilhar
      </button>
      <p role="status" className={styles["subtitle"]}>
        {message}
      </p>
    </div>
  )
}
