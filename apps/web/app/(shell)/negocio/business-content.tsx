import { Clock, MapPin, Package, Wrench } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import type { BusinessContentData } from "../../../lib/providers/business-data"
import type { BusinessDetails } from "../../../lib/providers/business-details"
import { ButtonLink } from "../../components/ui/button"
import { Panel } from "../../components/ui/panel"
import { BusinessGallery } from "./business-gallery"

function price(cents: number | null) {
  return cents === null
    ? "Sob orçamento"
    : (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export function BusinessContent({
  content,
  details,
  name,
  owner = false,
}: {
  content: BusinessContentData
  details: BusinessDetails
  name: string
  owner?: boolean
}) {
  return (
    <div className="space-y-5">
      {content.photos.length ? (
        <BusinessGallery photos={content.photos} name={name} />
      ) : owner ? (
        <Panel
          title="Fotos do seu trabalho"
          titleId="business-gallery-title"
          bodyClassName="space-y-4 p-5"
        >
          <p className="text-sm text-ui-ink-2">
            Mostre trabalhos, produtos e o seu espaço com fotos reais.
          </p>
          <ButtonLink href="/negocio/catalogo">Adicionar fotos</ButtonLink>
        </Panel>
      ) : null}
      {!owner && (details.neighborhood || details.service_area || details.opening_hours) ? (
        <Panel
          title="Atendimento"
          titleId="business-area-title"
          bodyClassName="grid gap-5 p-5 sm:grid-cols-2"
        >
          <div className="flex items-start gap-3">
            <MapPin size={20} className="shrink-0 text-ui-brand" aria-hidden="true" />
            <div>
              {details.neighborhood ? (
                <p className="text-sm font-semibold text-ui-ink [overflow-wrap:anywhere]">
                  {details.neighborhood}
                </p>
              ) : null}
              {details.service_area ? (
                <p className="mt-1 whitespace-pre-line text-sm text-ui-ink-2 [overflow-wrap:anywhere]">
                  {details.service_area}
                </p>
              ) : null}
            </div>
          </div>
          {details.opening_hours ? (
            <div className="flex items-start gap-3">
              <Clock size={20} className="shrink-0 text-ui-brand" aria-hidden="true" />
              <p className="whitespace-pre-line text-sm leading-relaxed text-ui-ink-2 [overflow-wrap:anywhere]">
                {details.opening_hours}
              </p>
            </div>
          ) : null}
        </Panel>
      ) : null}
      <Panel
        title="Catálogo de serviços"
        titleId="business-services-title"
        action={
          owner ? (
            <ButtonLink href="/negocio/catalogo" variant="ghost">
              Editar catálogo
            </ButtonLink>
          ) : null
        }
        bodyClassName="p-5 sm:p-6"
      >
        {!content.catalog.length ? (
          <div className="flex items-start gap-3">
            <Wrench size={21} className="shrink-0 text-ui-brand" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-ui-ink">
                {owner ? "Apresente o que você oferece" : "Serviços sob consulta"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ui-ink-2">
                {owner
                  ? "Adicione serviços com descrição e preço, ou deixe o valor sob orçamento."
                  : "Converse com o negócio para explicar o que precisa."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-ui-line">
            {content.catalog.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ui-brand-soft text-ui-brand">
                  <Wrench size={18} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold text-ui-ink [overflow-wrap:anywhere]">
                      {item.title}
                    </h3>
                    <p className="text-sm font-semibold text-ui-brand">{price(item.price_cents)}</p>
                  </div>
                  {item.description ? (
                    <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ui-ink-2 [overflow-wrap:anywhere]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      {content.listings.length || owner ? (
        <Panel
          title="Produtos no Mercado"
          titleId="business-market-title"
          action={
            owner ? (
              <ButtonLink href="/negocio/anuncios" variant="ghost">
                Gerenciar anúncios
              </ButtonLink>
            ) : (
              <ButtonLink href="/mercado" variant="ghost">
                Ver Mercado
              </ButtonLink>
            )
          }
          bodyClassName="p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {content.listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/mercado/${listing.id}` as Route}
                className="overflow-hidden rounded-ui border border-ui-line transition-colors hover:bg-ui-subtle focus-visible:outline-2 focus-visible:outline-ui-brand"
              >
                {listing.photoUrl ? (
                  // biome-ignore lint/performance/noImgElement: imagem assinada do anúncio privado.
                  <img
                    src={listing.photoUrl}
                    alt={listing.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-ui-subtle text-ui-brand">
                    <Package size={32} aria-hidden="true" />
                  </div>
                )}
                <div className="space-y-1 p-3">
                  <h3 className="font-semibold text-ui-ink [overflow-wrap:anywhere]">
                    {listing.title}
                  </h3>
                  <p className="text-sm font-semibold text-ui-brand">
                    {price(listing.price_cents)}
                  </p>
                  <p className="text-xs text-ui-ink-2">{listing.neighborhood}</p>
                </div>
              </Link>
            ))}
          </div>
          {!content.listings.length ? (
            <p className="text-sm leading-relaxed text-ui-ink-2">
              Vincule os produtos do negócio. Seus desapegos pessoais continuam separados.
            </p>
          ) : null}
        </Panel>
      ) : null}
    </div>
  )
}
