"use client"

import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { CommunitySection, type PrimaryCommunity } from "./community-section"
import { InicioComposer } from "./composer"
import { InicioGreeting } from "./greeting"
import {
  createRequestGuard,
  loadNextEvent,
  loadPrimaryCommunity,
  type NextEvent,
} from "./home-loaders"
import { ReturnStrip } from "./return-strip"
import { InicioRightRail } from "./right-rail"

// RECON-002 (prancha 01-web-inicio): home de quem participa.
//
// A comunidade primária — a mais antiga entre as aprovadas na cidade atual —
// é lida uma vez aqui e serve às três consumidoras: a linha de contexto do
// cabeçalho, o feed "Na comunidade" e a audiência padrão do modal de
// publicação. Falha de leitura (inclusive rejeição de rede) vira estado
// recuperável na seção, não nome chumbado, vazio fingido nem carregamento
// infinito. A guarda de requisição descarta resposta atrasada de tentativa
// anterior — ela não sobrescreve o contexto já resolvido.
export default function InicioPage() {
  const { current } = useLocalityContext()
  const router = useRouter()
  const [primary, setPrimary] = useState<PrimaryCommunity>({ status: "loading" })
  const [refreshKey, setRefreshKey] = useState(0)
  // O evento próximo é resolvido UMA vez aqui e servido ao rail "Seu próximo
  // encontro" e ao card do feed (prancha 01) — os dois mostram o mesmo evento,
  // do mesmo loader, sem consulta duplicada.
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null)
  const supabase = createBrowserClient()
  const guardRef = useRef(createRequestGuard())
  const eventGuardRef = useRef(createRequestGuard())

  const loadPrimary = useCallback(() => {
    const isCurrent = guardRef.current.begin()
    setPrimary({ status: "loading" })
    // O loader nunca rejeita: o then sem catch não solta rejection no console.
    void loadPrimaryCommunity(supabase, current.id).then((state) => {
      if (isCurrent()) setPrimary(state)
    })
  }, [current.id, supabase])

  useEffect(() => {
    loadPrimary()
  }, [loadPrimary])

  useEffect(() => {
    const isCurrent = eventGuardRef.current.begin()
    setNextEvent(null)
    void loadNextEvent(supabase, current.id).then((next) => {
      if (isCurrent()) setNextEvent(next)
    })
  }, [supabase, current.id])

  const handleOpenComposer = useCallback(
    (postType?: string) => {
      setRefreshKey((previous) => previous + 1)
      const query = postType ? `?tipo=${encodeURIComponent(postType)}` : ""
      router.push(`/publicacoes/nova${query}` as Route)
    },
    [router],
  )

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[56rem] flex-1 gap-6 px-4 pt-4 pb-8">
        <div className="min-w-0 flex-1 space-y-4">
          <InicioGreeting communityName={primary.status === "ready" ? primary.name : null} />
          <InicioComposer onOpen={handleOpenComposer} />
          <ReturnStrip />
          <CommunitySection
            primary={primary}
            onRetryPrimary={loadPrimary}
            onPublish={() => handleOpenComposer()}
            refreshKey={refreshKey}
            event={nextEvent}
          />
        </div>

        <InicioRightRail event={nextEvent} />
      </div>
    </div>
  )
}
