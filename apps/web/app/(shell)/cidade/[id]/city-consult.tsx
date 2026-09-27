"use client"

import { Eye, MapPin } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { listingsClient } from "../../../../lib/listings/client"
import { loadMarketHighlights, type MarketHighlight } from "../../../../lib/listings/highlights"
import { type LocalityCurrent, useLocalityContext } from "../../../../lib/locality-context"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { ButtonLink } from "../../../components/ui/button"
import { EmptyBlock } from "../../../components/ui/panel"
import { createRequestGuard } from "../../inicio/home-loaders"
import {
  type HubEvent,
  type HubGuideEntry,
  type HubProperty,
  type Loaded,
  loadGuideNews,
  loadPropertyHighlights,
  loadUpcomingEvents,
  type WithTimes,
} from "../../inicio/hub-loaders"
import { isReadyEmpty } from "../../inicio/hub-view"
import { MarketStrip, PropertyStrip } from "../../inicio/market-strip"
import { GuideNews } from "../../inicio/questions-guide"
import { WeekEventsCarousel } from "../../inicio/week-events"

// A consulta de outra cidade: os mesmos blocos do Início, só leitura. Sem
// "Ver tudo" (as verticais são da sua cidade), sem convite a anunciar, sem
// comunidade nem perguntas (continuam de quem é da cidade). O detalhe de cada
// encontro, referência e anúncio abre nas páginas de sempre.

/** Referências do Guia mostradas na consulta: o Guia é o que mais serve a quem chega. */
const GUIDE_SHOWN = 8

interface CityData {
  events: Loaded<HubEvent[]>
  guide: Loaded<WithTimes<HubGuideEntry>>
  properties: Loaded<WithTimes<HubProperty>>
  market: Loaded<MarketHighlight[]>
}

const LOADING: CityData = {
  events: { status: "loading" },
  guide: { status: "loading" },
  properties: { status: "loading" },
  market: { status: "loading" },
}

function useCityData(localityId: string) {
  const [data, setData] = useState<CityData>(LOADING)
  const guardRef = useRef(createRequestGuard())

  const load = useCallback(() => {
    const isCurrent = guardRef.current.begin()
    const supabase = createBrowserClient()
    setData(LOADING)
    const settle = <K extends keyof CityData>(key: K, value: CityData[K]) => {
      if (isCurrent()) setData((previous) => ({ ...previous, [key]: value }))
    }
    void loadUpcomingEvents(supabase, localityId).then((o) => settle("events", o))
    void loadGuideNews(supabase, localityId, GUIDE_SHOWN).then((o) => settle("guide", o))
    // Só o alcance cidade daquela cidade: as comunidades de lá não são suas.
    void loadPropertyHighlights(supabase, { localityId, withCommunities: false }).then((o) =>
      settle("properties", o),
    )
    void loadMarketHighlights(listingsClient(), localityId, []).then((o) =>
      settle("market", o.status === "ready" ? { status: "ready", data: o.items } : o),
    )
  }, [localityId])

  useEffect(() => {
    load()
  }, [load])

  return { data, reload: load }
}

function label(city: LocalityCurrent): string {
  return city.stateCode ? `${city.cityName}, ${city.stateCode}` : city.cityName
}

export function CityConsult({ city }: { city: LocalityCurrent }) {
  const { current } = useLocalityContext()
  const { data, reload } = useCityData(city.id)

  const nothingHere =
    isReadyEmpty(data.events, (events) => events.length === 0) &&
    isReadyEmpty(data.guide, (guide) => guide.items.length === 0) &&
    isReadyEmpty(data.properties, (properties) => properties.items.length === 0) &&
    isReadyEmpty(data.market, (items) => items.length === 0)

  return (
    <div className="mx-auto w-full max-w-[60rem] space-y-5 px-4 pt-4 pb-8 sm:space-y-6 sm:pt-6 lg:px-8">
      <header className="rounded-ui-lg bg-ui-brand-soft p-5 ring-1 ring-ui-line">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-ui-brand uppercase">
          <Eye size={14} aria-hidden="true" />
          Consultando outra cidade
        </p>
        <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-tight text-ui-ink sm:text-[1.75rem]">
          {label(city)}
        </h1>
        <p className="mt-1 max-w-prose text-sm text-ui-ink-2">
          Você vê o Guia, os encontros abertos à cidade e os anúncios daqui. Publicar e participar
          das comunidades continuam em {label(current)}.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <ButtonLink href={`/profile?mudar=${city.id}#cidade`} variant="primary">
            <MapPin size={16} aria-hidden="true" />
            Vou me mudar para cá
          </ButtonLink>
          <ButtonLink href="/inicio">Voltar para {current.cityName}</ButtonLink>
        </div>
      </header>

      {nothingHere ? (
        <EmptyBlock
          title={`Ainda não há nada publicado em ${city.cityName}`}
          description="Quando membros de lá compartilharem o Guia, encontros e anúncios, eles aparecem aqui."
        />
      ) : (
        <>
          <WeekEventsCarousel state={data.events} onRetry={reload} consult />
          <GuideNews state={data.guide} onRetry={reload} badge={null} consult />
          <PropertyStrip state={data.properties} onRetry={reload} badge={null} consult />
          <MarketStrip state={data.market} onRetry={reload} badge={null} consult />
        </>
      )}
    </div>
  )
}
