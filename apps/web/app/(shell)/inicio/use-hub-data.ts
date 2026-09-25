"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { listingsClient } from "../../../lib/listings/client"
import { loadMarketHighlights, type MarketHighlight } from "../../../lib/listings/highlights"
import { createBrowserClient } from "../../../lib/supabase/client"
import { createRequestGuard } from "./home-loaders"
import {
  type HubEvent,
  type HubGuideEntry,
  type HubProperty,
  type HubQuestions,
  type Loaded,
  loadGuideNews,
  loadOpenQuestions,
  loadPropertyHighlights,
  loadRecentListingTimes,
  loadUpcomingEvents,
  type WithTimes,
} from "./hub-loaders"

export interface HubData {
  events: Loaded<HubEvent[]>
  questions: Loaded<HubQuestions>
  guide: Loaded<WithTimes<HubGuideEntry>>
  properties: Loaded<WithTimes<HubProperty>>
  market: Loaded<MarketHighlight[]>
  /** Datas dos anúncios do Mercado dos últimos 30 dias (contador e novidade). */
  listingTimes: Loaded<string[]>
}

const LOADING: HubData = {
  events: { status: "loading" },
  questions: { status: "loading" },
  guide: { status: "loading" },
  properties: { status: "loading" },
  market: { status: "loading" },
  listingTimes: { status: "loading" },
}

// Todas as verticais do Início lidas UMA vez, em paralelo, e servidas a quem
// desenha (atalhos com contadores, trilho, seções, ordem por novidade). Cada
// leitura chega sozinha: uma vertical lenta não segura as outras. Trocar de
// cidade descarta respostas atrasadas da cidade anterior (mesma guarda de
// home-loaders.ts).
export function useHubData(localityId: string, communityIds: readonly string[]) {
  const [data, setData] = useState<HubData>(LOADING)
  const guardRef = useRef(createRequestGuard())
  const communityKey = communityIds.join(",")

  const load = useCallback(() => {
    const isCurrent = guardRef.current.begin()
    const supabase = createBrowserClient()
    const ids = communityKey === "" ? [] : communityKey.split(",")
    setData(LOADING)

    const settle = <K extends keyof HubData>(key: K, value: HubData[K]) => {
      if (isCurrent()) setData((previous) => ({ ...previous, [key]: value }))
    }
    const asLoaded = <T>(outcome: { status: "error" } | { status: "ready"; data: T }): Loaded<T> =>
      outcome

    void loadUpcomingEvents(supabase, localityId).then((o) => settle("events", asLoaded(o)))
    void loadOpenQuestions(supabase, localityId).then((o) => settle("questions", asLoaded(o)))
    void loadGuideNews(supabase, localityId).then((o) => settle("guide", asLoaded(o)))
    void loadPropertyHighlights(supabase, { localityId, withCommunities: true }).then((o) =>
      settle("properties", asLoaded(o)),
    )
    void loadRecentListingTimes(supabase, localityId, ids).then((o) =>
      settle("listingTimes", asLoaded(o)),
    )
    void loadMarketHighlights(listingsClient(), localityId, ids).then((o) =>
      settle("market", o.status === "ready" ? { status: "ready", data: o.items } : o),
    )
  }, [localityId, communityKey])

  useEffect(() => {
    load()
  }, [load])

  return { data, reload: load }
}
