import { costLinesFor } from "../../../../lib/listings/format"
import { loadSavedListings } from "../../../../lib/listings/loaders"
import styles from "../../../components/bivaque/listing-cards.module.css"
import { ListingSaveButton } from "../../../components/bivaque/listing-save-button"

// FIGMA-002 — a lista de salvos do membro (ADR-20261006). A relação privada é a
// fonte; o anúncio vem do join autorizado de sempre, então um anúncio que deixou
// de ser alcançável aparece sem título, sem foto e sem status — com o estado
// "não está disponível agora" e o botão para remover o save, que continua
// possível. Nenhum contador de inacessíveis é mostrado: a própria lista já é a
// resposta honesta, e nada de título/foto/status em placeholder.

function formatSavedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "data indisponível"
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function SavedPropertyListPage() {
  const result = await loadSavedListings()
  return (
    <section className={styles["view"]}>
      <a href="/imoveis" className={styles["backLink"]}>
        ‹ Imóveis
      </a>
      <h1 className={styles["heading"]}>Anúncios salvos</h1>
      <p className={styles["subtitle"]}>
        O que você guardou continua aqui. Anúncio pausado, encerrado ou oculto pela moderação não
        aparece até ficar disponível de novo.
      </p>
      {result.error ? (
        <p role="alert" className={styles["subtitle"]}>
          {result.error}
        </p>
      ) : null}
      {!result.error && result.rows.length === 0 ? (
        <p className={styles["subtitle"]}>
          Você ainda não salvou nenhum imóvel. Use o marcador nos cards da busca.
        </p>
      ) : null}
      <div className={styles["savedList"]}>
        {result.rows.map((row) => {
          const listing = row.listing
          const details = listing?.details ?? null
          const costs = details ? costLinesFor(details) : null
          return (
            <article key={row.listingId} className={styles["savedCard"]}>
              <p className={styles["cardNeighborhood"]}>Salvo em {formatSavedAt(row.savedAt)}</p>
              {listing && details ? (
                <>
                  <h2 className={styles["cardTitle"]}>{listing.title}</h2>
                  <p className={styles["subtitle"]}>{details.neighborhood}</p>
                  <p className={styles["cardPrice"]}>
                    {costs?.rent}
                    <span className={styles["cardPriceSuffix"]}>/mês</span>
                  </p>
                  <div className={styles["actionRow"]}>
                    <a href={`/imoveis/${row.listingId}`} className={styles["primaryButton"]}>
                      Ver anúncio
                    </a>
                    <ListingSaveButton listingId={row.listingId} saved />
                  </div>
                </>
              ) : (
                <>
                  <h2 className={styles["cardTitle"]}>Anúncio não está disponível agora</h2>
                  <p className={styles["subtitle"]}>
                    O imóvel que você salvou não aparece para você no momento. Você pode remover o
                    save; se ele voltar a ficar disponível, ele aparece aqui de novo.
                  </p>
                  <div className={styles["actionRow"]}>
                    <ListingSaveButton listingId={row.listingId} saved />
                  </div>
                </>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
