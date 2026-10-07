import styles from "../../components/bivaque/listing-cards.module.css"
import { Skeleton } from "../../components/bivaque/skeleton"

export default function PropertyLoading() {
  return (
    <section className={styles["view"]} aria-label="Carregando imóveis" aria-busy="true">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </section>
  )
}
