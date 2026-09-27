"use client"

import { House, ShoppingBag } from "lucide-react"
import { formatCentsBRL } from "../../../lib/listings/catalog"
import type { MarketHighlight } from "../../../lib/listings/highlights"
import type { HubProperty, Loaded, WithTimes } from "./hub-loaders"
import { HubError, HubSection, PhotoStrip, StripSkeleton } from "./hub-section"

// As verticais de anúncio dentro do Início (pedido do dono em 25/09/2026: "há
// muita coisa do Bivaque escondida fora do início"). Faixa horizontal como as
// do Meetup: prévia, "Ver tudo" e um convite a anunciar no fim.
//
// Estados deliberados: carregando reserva a altura; erro é recuperável (nunca
// faixa vazia fingindo que não há anúncio); pronto e vazio some da página — o
// convite a anunciar continua no botão de criação; pronto mostra as novidades.
// Os dados chegam do hook do Início (uma leitura para a página toda).

export function MarketStrip({
  state,
  onRetry,
  badge,
  consult = false,
}: {
  state: Loaded<MarketHighlight[]>
  onRetry: () => void
  badge: string | null
  /** Consulta a outra cidade: sem "Ver tudo" da sua cidade e sem convite a anunciar lá. */
  consult?: boolean
}) {
  if (state.status === "ready" && state.data.length === 0) return null
  return (
    <HubSection
      id="secao-mercado"
      title={consult ? "Mercado" : "Mercado perto de você"}
      shortTitle={consult ? null : "Mercado"}
      icon={ShoppingBag}
      href={consult ? null : "/mercado"}
      badge={badge}
      flush
    >
      {state.status === "loading" ? (
        <StripSkeleton />
      ) : state.status === "error" ? (
        <HubError what="os anúncios" onRetry={onRetry} />
      ) : (
        <PhotoStrip
          icon={ShoppingBag}
          items={state.data.map((item) => ({
            id: item.id,
            href: `/mercado/${item.id}`,
            photoUrl: item.photoUrl,
            price: formatCentsBRL(item.priceCents),
            title: item.title,
            meta: item.neighborhood,
          }))}
          createHref={consult ? null : "/mercado/novo"}
          createLabel="Anunciar"
        />
      )}
    </HubSection>
  )
}

export function PropertyStrip({
  state,
  onRetry,
  badge,
  consult = false,
}: {
  state: Loaded<WithTimes<HubProperty>>
  onRetry: () => void
  badge: string | null
  /** Consulta a outra cidade: sem "Ver tudo" da sua cidade e sem convite a anunciar lá. */
  consult?: boolean
}) {
  if (state.status === "ready" && state.data.items.length === 0) return null
  return (
    <HubSection
      id="secao-imoveis"
      title={consult ? "Imóveis" : "Imóveis para morar"}
      shortTitle={consult ? null : "Imóveis"}
      icon={House}
      href={consult ? null : "/imoveis"}
      badge={badge}
      flush
    >
      {state.status === "loading" ? (
        <StripSkeleton />
      ) : state.status === "error" ? (
        <HubError what="os imóveis" onRetry={onRetry} />
      ) : (
        <PhotoStrip
          icon={House}
          items={state.data.items.map((item) => ({
            id: item.id,
            href: `/imoveis/${item.id}`,
            photoUrl: item.photoUrl,
            price: item.priceLabel,
            title: item.title,
            meta: [
              item.bedrooms === null
                ? null
                : `${item.bedrooms} ${item.bedrooms === 1 ? "quarto" : "quartos"}`,
              item.neighborhood,
            ]
              .filter(Boolean)
              .join(" · "),
          }))}
          createHref={consult ? null : "/imoveis/novo"}
          createLabel="Anunciar"
        />
      )}
    </HubSection>
  )
}
