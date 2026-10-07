import styles from "../../components/bivaque/listing-cards.module.css"

export default function PropertyNotFound() {
  return (
    <section className={styles["view"]}>
      <h1 className={styles["heading"]}>Anúncio não disponível</h1>
      <p className={styles["subtitle"]}>O anúncio não existe ou não está disponível para você.</p>
      <a href="/imoveis" className={styles["backLink"]}>
        Voltar aos imóveis
      </a>
    </section>
  )
}
