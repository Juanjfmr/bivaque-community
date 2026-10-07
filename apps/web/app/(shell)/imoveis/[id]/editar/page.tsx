import { LISTING_STATUS_LABELS } from "@bivaque/domain"
import { notFound } from "next/navigation"
import { loadOwnerListing } from "../../../../../lib/listings/loaders"
import { ConnectionLostState } from "../../../../components/bivaque/error-state"
import { FeedbackAlert } from "../../../../components/bivaque/feedback-alert"
import styles from "../../../../components/bivaque/listing-cards.module.css"
import { ListingEditForm } from "../../../../components/bivaque/listing-edit-form"
import { ListingEditSurface } from "../../../../components/bivaque/listing-edit-surface"
import { ListingPhotoManager } from "../../../../components/bivaque/listing-photo-manager"

const text = (value: number | null) => (value === null ? "" : String(value))
const money = (value: number | null) => (value === null ? "" : String(value / 100))

export default async function PropertyEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const search = await searchParams
  const retomada = search["retomada"] === "1"
  const savedDraft = search["rascunho"] === "1"
  const result = await loadOwnerListing(id)
  if (result.error)
    return (
      <section className={styles["view"]}>
        <ConnectionLostState description={result.error} />
      </section>
    )
  if (!result.listing?.details) notFound()
  const listing = result.listing
  const details = listing.details
  if (!details) notFound()
  return (
    <ListingEditSurface listingId={id}>
      <section className={styles["editView"]}>
        <h1 className={styles["heading"]}>Editar imóvel</h1>
        {listing.cityName ? <p className={styles["subtitle"]}>{listing.cityName}</p> : null}
        {/* Aviso de ocultação também na edição, e não só no detalhe: quem chega
            aqui pelo painel "Seus rascunhos"/"Retomar" ou direto pela URL não
            passa pela tela do anúncio. O aviso é sobre ESTA tela e sobrevive a
            reload — ele vem do estado real da linha, não de parâmetro de URL.
            Editar, pausar ou reativar não levanta a ocultação (pgTAP e E2E). */}
        {result.callerSeesHiddenWarning ? (
          <div className={styles["moderationNotice"]}>
            <FeedbackAlert
              variant="warning"
              title="Anúncio oculto pela moderação"
              description="Este anúncio está oculto para outras pessoas. Você continua editando normalmente, mas salvar alterações, pausar ou reativar NÃO remove a ocultação — só a operação pode restaurá-lo."
            />
          </div>
        ) : null}
        {savedDraft ? (
          <p role="status" className={styles["subtitle"]}>
            Rascunho salvo. Você pode voltar e publicar quando estiver pronto.
          </p>
        ) : null}
        {retomada ? (
          <p role="alert" className={styles["subtitle"]}>
            O anúncio foi salvo como rascunho, mas a publicação não foi concluída. Confira as fotos
            e os campos antes de publicar novamente.
          </p>
        ) : null}
        <ListingEditForm
          listingId={id}
          status={listing.status}
          audienceLabel={
            listing.community_id
              ? "Comunidade escolhida na criação"
              : "Membros da rede na cidade escolhida"
          }
          initial={{
            title: listing.title,
            description: listing.description ?? "",
            propertyType: details.property_type,
            neighborhood: details.neighborhood,
            rentReais: money(details.rent_cents),
            condoReais: money(details.condo_fee_cents),
            iptuReais: money(details.iptu_cents),
            bedrooms: text(details.bedrooms),
            bathrooms: text(details.bathrooms),
            parkingSpots: text(details.parking_spots),
            areaM2: text(details.area_m2),
            availableFrom: details.available_from ?? "",
            isFurnished: details.is_furnished,
            acceptsPets: details.accepts_pets,
            condoIncluded: details.condo_included_in_rent,
          }}
        />
        <h2 className={styles["cardTitle"]}>Fotos (até 12)</h2>
        <ListingPhotoManager
          listingId={id}
          photos={listing.media.map((photo) => ({
            id: photo.id,
            url: result.mediaUrls?.get(photo.object_path) ?? null,
            position: photo.position,
            isCover: photo.is_cover,
          }))}
        />
        <p className={styles["subtitle"]}>
          Situação: {LISTING_STATUS_LABELS[listing.status]}. Fotos e alterações são salvas neste
          anúncio.
        </p>
        <a href={`/imoveis/${id}`} className={styles["backLink"]}>
          ‹ Voltar ao anúncio
        </a>
      </section>
    </ListingEditSurface>
  )
}
