import { notFound } from "next/navigation"
import { costLinesFor } from "../../../../lib/listings/format"
import { loadListingDetail } from "../../../../lib/listings/loaders"
import { MemberAvatar } from "../../../components/bivaque/avatar"
import { ConnectionLostState } from "../../../components/bivaque/error-state"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"
import styles from "../../../components/bivaque/listing-cards.module.css"
import { ListingGallery } from "../../../components/bivaque/listing-gallery"
import { ListingInterestButton } from "../../../components/bivaque/listing-interest-button"
import { ListingSaveButton } from "../../../components/bivaque/listing-save-button"
import { ListingShare } from "../../../components/bivaque/listing-share"
import { ReportButton } from "../../../components/bivaque/report-button"

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  active: "Para alugar",
  paused: "Pausado",
  reserved: "Reservado",
  sold: "Concluído",
  closed: "Encerrado",
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await loadListingDetail(id)
  if (result.error)
    return (
      <section className={styles["view"]}>
        <ConnectionLostState description={result.error} />
      </section>
    )
  if (!result.listing?.details) notFound()
  const { listing, callerIsOwner, callerSaved, callerSeesHiddenWarning } = result
  const details = listing.details
  if (!details) notFound()
  const costs = costLinesFor(details)
  const photos = [...listing.media].sort(
    (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.position - b.position,
  )
  return (
    <section className={styles["view"]}>
      <a href="/imoveis" className={styles["backLink"]}>
        ‹ Imóveis
      </a>
      <ListingGallery
        photos={photos.map((photo, index) => ({
          url: result.mediaUrls?.get(photo.object_path) ?? null,
          alt: `Foto ${index + 1}: ${listing.title}`,
        }))}
      />
      <header className={styles["headRow"]}>
        <div>
          <span className={styles["statusChip"]}>
            {STATUS_LABELS[listing.status] ?? listing.status}
          </span>
          <h1 className={styles["heading"]}>{listing.title}</h1>
          <p className={styles["subtitle"]}>
            {details.neighborhood}
            {listing.cityName ? ` · ${listing.cityName}` : ""}
          </p>
        </div>
        <div className={styles["actionRow"]}>
          <ListingSaveButton listingId={id} saved={callerSaved} />
          {callerIsOwner ? (
            <a href={`/imoveis/${id}/editar`} className={styles["secondaryButton"]}>
              Editar imóvel
            </a>
          ) : null}
        </div>
      </header>
      {callerSeesHiddenWarning ? (
        <div className={styles["moderationNotice"]}>
          <FeedbackAlert
            variant="warning"
            title="Anúncio oculto pela moderação"
            description="Este anúncio está oculto para outras pessoas. Você continua vendo e editando normalmente, mas pausar, reativar ou editar não remove a ocultação — só a operação pode restaurá-lo."
          />
        </div>
      ) : null}
      <div className={styles["detailColumns"]}>
        <div>
          <div className={styles["specCards"]}>
            <div className={styles["specCard"]}>
              <p className={styles["specCardValue"]}>{details.bedrooms ?? "—"} quartos</p>
              <p className={styles["specCardHint"]}>{details.bathrooms ?? "—"} banheiros</p>
            </div>
            <div className={styles["specCard"]}>
              <p className={styles["specCardValue"]}>{details.area_m2 ?? "—"} m²</p>
              <p className={styles["specCardHint"]}>Área informada</p>
            </div>
            <div className={styles["specCard"]}>
              <p className={styles["specCardValue"]}>{details.parking_spots ?? "—"} vagas</p>
              <p className={styles["specCardHint"]}>Garagem</p>
            </div>
          </div>
          <h2 className={styles["sectionTitle"]}>Sobre o imóvel</h2>
          <p className={styles["subtitle"]}>{listing.description ?? "Descrição não informada."}</p>
          <p className={styles["subtitle"]}>
            {details.is_furnished ? "Mobiliado · " : ""}
            {details.accepts_pets ? "Aceita pets" : ""}
          </p>
          {details.available_from ? (
            <p className={styles["subtitle"]}>
              Disponível a partir de {details.available_from.split("-").reverse().join("/")}
            </p>
          ) : null}
          <section className={styles["neighborhoodPanel"]} aria-label="Localização aproximada">
            <h2 className={styles["sectionTitle"]}>Localização aproximada</h2>
            <p className={styles["subtitle"]}>
              {details.neighborhood}
              {listing.cityName ? ` · ${listing.cityName}` : ""}
            </p>
            <p className={styles["subtitle"]}>
              Apenas o bairro informado pelo anunciante. O endereço do imóvel não é exibido.
            </p>
            {listing.cityName ? (
              <a
                className={styles["backLink"]}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${details.neighborhood}, ${listing.cityName}, Brasil`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver bairro no mapa ↗
              </a>
            ) : null}
          </section>
          <section className={styles["advertiserPanel"]} aria-label="Quem está anunciando">
            <h2 className={styles["sectionTitle"]}>Quem está anunciando</h2>
            {listing.advertiserName ? (
              <a className={styles["advertiserLink"]} href={`/profile/${listing.owner_user_id}`}>
                <MemberAvatar name={listing.advertiserName} size="md" />
                <span>
                  {listing.advertiserName}
                  <span className={styles["advertiserHint"]}>Ver perfil</span>
                </span>
              </a>
            ) : (
              <p className={styles["subtitle"]}>
                O perfil do anunciante não está disponível para você.
              </p>
            )}
            {callerIsOwner ? null : (
              // A linha de denúncia da prancha property-detail. O botão só existe
              // para quem NÃO é o dono: o banco recusa autorrelato de anúncio, e
              // um botão que não pode executar não entra na tela.
              <div className={styles["reportLine"]}>
                <ReportButton
                  targetType="listing"
                  targetId={id}
                  label="Reportar anúncio"
                  accessibilityLabel="Reportar anúncio"
                  blockUserId={listing.owner_user_id}
                />
              </div>
            )}
          </section>
        </div>
        <aside className={styles["costPanel"]} aria-label="Custos e interesse">
          <h2 className={styles["costPanelTitle"]}>Aluguel mensal</h2>
          <p className={styles["costMain"]}>{costs.rent}</p>
          <p className={styles["costLine"]}>
            Condomínio: {details.condo_included_in_rent ? "Incluso no aluguel" : costs.condo}
          </p>
          <p className={styles["costLine"]}>IPTU: {costs.iptu}</p>
          {costs.total ? (
            <p className={styles["costTotal"]}>Total informado: {costs.total}/mês</p>
          ) : null}
          <ListingInterestButton
            listingId={id}
            existingConversationId={listing.interestConversationId}
            disabled={
              callerIsOwner || (listing.status !== "active" && !listing.interestConversationId)
            }
            disabledReason={
              callerIsOwner
                ? "Este é seu anúncio."
                : "Este anúncio não aceita novos interesses agora."
            }
          />
          <ListingShare listingId={id} title={listing.title} />
        </aside>
      </div>
    </section>
  )
}
