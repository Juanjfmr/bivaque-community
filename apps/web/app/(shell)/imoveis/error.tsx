"use client"

import { ErrorState } from "../../components/bivaque/error-state"
import styles from "../../components/bivaque/listing-cards.module.css"

export default function PropertyError({ reset }: { reset: () => void }) {
  return (
    <section className={styles["view"]}>
      <ErrorState message="Não foi possível carregar os imóveis agora." onRetry={reset} />
    </section>
  )
}
