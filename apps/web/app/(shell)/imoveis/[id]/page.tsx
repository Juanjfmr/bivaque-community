import { BedDouble, Calendar, Car, Info, Ruler, Waves } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { headlinePrice, propertyCostLines } from "../../../../lib/listings/costs"
import { getPropertyDetail, isListingSaved, signPhotoPaths } from "../../../../lib/listings/queries"
import { createListingClient } from "../../../../lib/listings/ssr-client"
import { PROPERTY_TYPE_LABELS } from "../../../../lib/listings/types"
import { Card } from "../../../components/bivaque/card"
import { ListingAlertForm } from "../alert-form"
import { SaveListingButton } from "../save-listing-button"
import { ShareButton } from "../share-button"

// RECON-027 — prancha 19. A ficha do imóvel. As cinco invenções do gerador
// (prazo de resposta, tempo de associação, compartilhamento automático de
// contato, conversa obrigatoriamente interna e o cartão "Lembre-se") não
// existem aqui. Custo ausente é "Consultar anunciante", nunca R$ 0.

function formatAvailableFrom(value: string | null): string | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return null
  const label = date.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export default async function ImovelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const client = await createListingClient()

  const property = await getPropertyDetail(client, id)
  if (property === null) {
    notFound()
  }

  const signed = await signPhotoPaths(
    client,
    property.photos.map((photo) => photo.path),
  )
  const photoUrls = property.photos
    .map((photo) => signed.get(photo.path))
    .filter((url): url is string => url !== undefined)
  const saved = await isListingSaved(client, id)

  const location = [property.neighborhood, property.cityName]
    .filter((part): part is string => Boolean(part))
    .join(", ")
  const specs = {
    area: property.areaM2 === null ? null : `${property.areaM2} m²`,
    bedrooms:
      property.bedrooms === null
        ? null
        : `${property.bedrooms} quarto${property.bedrooms === 1 ? "" : "s"}`,
    suites:
      property.suites === null
        ? null
        : `${property.suites} suíte${property.suites === 1 ? "" : "s"}`,
    parking:
      property.parkingSpots === null
        ? null
        : `${property.parkingSpots} vaga${property.parkingSpots === 1 ? "" : "s"}`,
  }
  const costLines = propertyCostLines({
    rentCents: property.rentCents,
    condoFeeCents: property.condoFeeCents,
    iptuCents: property.iptuCents,
    salePriceCents: property.salePriceCents,
  })
  const availableFrom = formatAvailableFrom(property.availableFrom)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* Mesma trilha de /meus-anuncios e /mercado: destino de 44px e transição
          (a régua mede o link inteiro; os dois destinos tinham 16px de altura). */}
      <nav aria-label="Trilha" className="text-xs text-muted">
        {/* A trilha é uma lista ordenada (o caminho tem ordem): o <ol> some
            quando só os links e os separadores ficam no nav, e leitor de tela
            perde a contagem. Os alvos continuam de 44px. */}
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link
              href="/explorar"
              className="inline-flex min-h-11 items-center transition-colors duration-[var(--semantic-motion-duration-fast)] hover:underline"
            >
              Mercado
            </Link>
            <span aria-hidden="true">›</span>
          </li>
          <li>
            <Link
              href="/imoveis"
              className="inline-flex min-h-11 items-center transition-colors duration-[var(--semantic-motion-duration-fast)] hover:underline"
            >
              Imóveis
            </Link>
            <span aria-hidden="true">›</span>
          </li>
          <li aria-current="page">{property.title}</li>
        </ol>
      </nav>

      <header className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{property.title}</h1>
          <p className="text-sm text-muted">{location || "Localização aproximada"}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium">
            Salvar
            <SaveListingButton listingId={property.id} initialSaved={saved} />
          </span>
          <ShareButton title={property.title} path={`/imoveis/${property.id}`} />
        </div>
      </header>

      <div className="mt-5 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <section aria-label="Galeria" className="space-y-2">
            {photoUrls.length === 0 ? (
              <div
                role="img"
                aria-label="Imóvel sem fotos"
                className="aspect-16/10 w-full rounded-xl border border-border bg-[var(--paper)]"
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr]">
                {/* biome-ignore lint/performance/noImgElement: URL assinada de bucket privado expira em 1h. */}
                <img
                  src={photoUrls[0]}
                  alt={`Foto de ${property.title}`}
                  className="aspect-16/10 w-full rounded-xl border border-border object-cover"
                />
                <div className="grid grid-rows-2 gap-2">
                  {photoUrls.slice(1, 3).map((url, index) => (
                    // biome-ignore lint/performance/noImgElement: URL assinada de bucket privado expira em 1h.
                    <img
                      key={url}
                      src={url}
                      alt={`Foto ${index + 2} de ${property.title}`}
                      className="h-full w-full rounded-xl border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            )}
            {photoUrls.length > 0 ? (
              <p className="text-xs text-muted">{photoUrls.length} fotos</p>
            ) : null}
          </section>

          <Card className="grid grid-cols-3 gap-2 p-4">
            <span className="flex flex-col items-start gap-1 text-sm">
              <Ruler size={16} aria-hidden="true" className="text-muted" />
              <span className="font-medium">{specs.area ?? "Área não informada"}</span>
              <span className="text-xs text-muted">Área privativa</span>
            </span>
            <span className="flex flex-col items-start gap-1 text-sm">
              <BedDouble size={16} aria-hidden="true" className="text-muted" />
              <span className="font-medium">{specs.bedrooms ?? "Quartos não informados"}</span>
              <span className="text-xs text-muted">{specs.suites ?? "Suítes não informadas"}</span>
            </span>
            <span className="flex flex-col items-start gap-1 text-sm">
              <Car size={16} aria-hidden="true" className="text-muted" />
              <span className="font-medium">{specs.parking ?? "Vagas não informadas"}</span>
              <span className="text-xs text-muted">Garagem</span>
            </span>
          </Card>

          <section aria-labelledby="sobre-titulo" className="space-y-2">
            <h2 id="sobre-titulo" className="text-base font-semibold">
              Sobre o imóvel
            </h2>
            <p className="text-sm leading-relaxed text-muted">
              {property.description ?? "O anunciante ainda não escreveu uma descrição."}
            </p>
            <p className="text-xs text-muted">
              Tipo: {PROPERTY_TYPE_LABELS[property.propertyType]}
            </p>
          </section>

          {availableFrom ? (
            <section aria-labelledby="disponivel-titulo" className="space-y-1">
              <h2 id="disponivel-titulo" className="text-base font-semibold">
                Disponível a partir de
              </h2>
              <p className="flex items-center gap-2 text-sm text-muted">
                <Calendar size={16} aria-hidden="true" />
                {availableFrom}
              </p>
            </section>
          ) : null}

          {property.amenities.length > 0 ? (
            <section aria-labelledby="comodidades-titulo" className="space-y-2">
              <h2 id="comodidades-titulo" className="text-base font-semibold">
                Comodidades do condomínio
              </h2>
              <ul className="flex flex-wrap gap-3 text-sm text-muted">
                {property.amenities.map((amenity) => (
                  <li key={amenity} className="flex items-center gap-1.5">
                    <Waves size={15} aria-hidden="true" />
                    {amenity}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <ListingAlertForm
            variant="compact"
            hidden={{
              bairro: property.neighborhood ?? "",
              tipo_negocio: property.deal,
              localityId: "",
            }}
          />
        </div>

        <aside className="space-y-4">
          <Card className="space-y-3 p-4">
            <p className="text-2xl font-semibold text-[var(--semantic-action-primary)]">
              {headlinePrice(property.deal, property)}
            </p>
            <dl className="space-y-1 text-sm">
              {costLines.map((line) => (
                <div key={line.key} className="flex items-center justify-between gap-3">
                  <dt className="text-muted">{line.label}</dt>
                  <dd className={line.unknown ? "text-muted" : "font-medium"}>{line.display}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="space-y-2 p-4">
            <p className="text-sm font-semibold">Anunciante</p>
            <p className="text-sm">{property.ownerName ?? "Membro do Bivaque"}</p>
          </Card>

          <div className="space-y-2">
            <button
              type="button"
              disabled
              aria-describedby="interesse-explicacao"
              className="min-h-11 w-full rounded-lg bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] opacity-60 transition-colors duration-[var(--semantic-motion-duration-fast)]"
            >
              Tenho interesse
            </button>
            <p id="interesse-explicacao" className="flex items-start gap-2 text-xs text-muted">
              <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />A conversa com o
              anunciante entra junto da central de mensagens; até lá o contato fica indisponível.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
