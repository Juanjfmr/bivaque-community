import { LISTING_PROPERTY_TYPE_LABELS, LISTING_PROPERTY_TYPES } from "@bivaque/domain"
import { condoFooterLabel, rentLabel, specsLabel } from "../../../lib/listings/format"
import { loadOwnDrafts, searchActivePropertyListings } from "../../../lib/listings/loaders"
import { propertySearchParams } from "../../../lib/listings/search-params"
import { ConnectionLostState } from "../../components/bivaque/error-state"
import { ListingCard } from "../../components/bivaque/listing-card"
import styles from "../../components/bivaque/listing-cards.module.css"
import { ListingFilters } from "../../components/bivaque/listing-filters"
import { ListingListHeader } from "../../components/bivaque/listing-list-header"
import { ListingSaveButton } from "../../components/bivaque/listing-save-button"

export default async function PropertyListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { filters, values } = propertySearchParams(params)
  const query = values.q
  const type = values.tipo
  const [result, ownDrafts] = await Promise.all([
    searchActivePropertyListings(filters),
    loadOwnDrafts(),
  ])
  return (
    <section className={styles["view"]}>
      <ListingListHeader />
      <div className={styles["searchRow"]}>
        <form action="/imoveis" className={styles["searchForm"]}>
          {/* A lupa mora DENTRO do campo na prancha property-list. O input segue
              com o placeholder como nome acessível: o ícone é decorativo. */}
          <div className={styles["searchField"]}>
            <svg
              className={styles["searchFieldIcon"]}
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="11" cy="11" r="6.4" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              name="q"
              defaultValue={query}
              placeholder="Buscar imóveis"
              aria-label="Buscar imóveis"
              className={styles["searchInput"]}
            />
          </div>
          <input type="hidden" name="tipo" value={type} />
          <input type="hidden" name="bairro" value={values.bairro} />
          <input type="hidden" name="aluguel_max" value={values.aluguel_max} />
          <input type="hidden" name="quartos_min" value={values.quartos_min} />
          <button type="submit" className={styles["secondaryButton"]}>
            <svg
              className={styles["buttonIcon"]}
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
              focusable="false"
            >
              <circle cx="11" cy="11" r="6.4" stroke="currentColor" strokeWidth="1.8" />
              <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Buscar
          </button>
        </form>
        <ListingFilters values={values} />
      </div>
      <nav aria-label="Tipo de imóvel" className={styles["chipRow"]}>
        {["", ...LISTING_PROPERTY_TYPES].map((item) => (
          <a
            key={item}
            href={`/imoveis?${new URLSearchParams({ ...values, tipo: item })}`}
            aria-current={item === type ? "page" : undefined}
            className={`${styles["chip"]} ${item === type ? styles["chipActive"] : ""}`}
          >
            {item
              ? LISTING_PROPERTY_TYPE_LABELS[item as keyof typeof LISTING_PROPERTY_TYPE_LABELS]
              : "Todos"}
          </a>
        ))}
      </nav>
      {ownDrafts.error ? (
        <p role="alert" className={styles["subtitle"]}>
          {ownDrafts.error}
        </p>
      ) : null}
      {ownDrafts.drafts.length ? (
        <section aria-label="Seus rascunhos" className={styles["draftPanel"]}>
          <h2 className={styles["cardTitle"]}>Seus rascunhos</h2>
          {ownDrafts.drafts.map((draft) => (
            <a key={draft.id} className={styles["backLink"]} href={`/imoveis/${draft.id}/editar`}>
              Retomar: {draft.title}
            </a>
          ))}
        </section>
      ) : null}
      {result.error ? (
        <ConnectionLostState description={result.error} />
      ) : (
        <>
          <div className={styles["headRow"]}>
            <p className={styles["resultCount"]}>{result.listings.length} resultados</p>
            <div className={styles["actionRow"]}>
              {/* A prancha property-list mostra a ordenação vigente E a entrada de
                  salvos. A ordenação continua sendo informação real da busca: o
                  único seletor de ordenação do lote é "Mais recentes", e ele
                  aparece como está — nada de link morto prometendo ordenação. */}
              <p className={styles["resultCount"]}>Ordenar: Mais recentes</p>
              <a href="/imoveis/salvos" className={styles["backLink"]}>
                Meus anúncios salvos
              </a>
            </div>
          </div>
          {result.listings.length === 0 ? (
            <p className={styles["subtitle"]}>
              Nenhum imóvel encontrado. Tente outro termo ou tipo de imóvel.
            </p>
          ) : null}
          <div className={styles["grid"]}>
            {result.listings.map((listing) => {
              const details = listing.property_details
              if (!details) return null
              return (
                <ListingCard
                  key={listing.id}
                  href={`/imoveis/${listing.id}`}
                  coverUrl={result.coverUrls.get(listing.id) ?? null}
                  typeLabel={LISTING_PROPERTY_TYPE_LABELS[details.property_type]}
                  neighborhood={details.neighborhood}
                  title={listing.title}
                  priceLabel={rentLabel(details.rent_cents)}
                  priceSuffix="/mês"
                  specsLabel={specsLabel(details)}
                  footerLabel={condoFooterLabel(details.condo_fee_cents)}
                  saveSlot={
                    <ListingSaveButton
                      listingId={listing.id}
                      saved={result.savedIds.has(listing.id)}
                      variant="icon"
                    />
                  }
                />
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
