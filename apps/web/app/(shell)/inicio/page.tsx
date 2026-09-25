"use client"

import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { IntentLauncher } from "../../components/bivaque/intent-launcher"
import { CommunitySection, type PrimaryCommunity } from "./community-section"
import { InicioGreeting } from "./greeting"
import {
  createRequestGuard,
  loadNextEvent,
  loadPrimaryCommunity,
  type NextEvent,
} from "./home-loaders"
import { ReturnStrip } from "./return-strip"
import { InicioRailDisclosure, InicioRightRail } from "./right-rail"

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

  // "Fazer uma pergunta" e o "Publicar" da comunidade abrem a rota estável
  // /publicacoes/nova (R24). A dica de anexo nunca escolhe o formato: o
  // `post_type` é derivado do anexo real no compositor.
  const handleOpenComposer = useCallback(
    (attachment?: string) => {
      setRefreshKey((previous) => previous + 1)
      const query = attachment ? `?tipo=${encodeURIComponent(attachment)}` : ""
      router.push(`/publicacoes/nova${query}` as Route)
    },
    [router],
  )

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[56rem] flex-1 gap-6 px-4 pt-4 pb-8">
        <div className="min-w-0 flex-1 space-y-4">
          <InicioGreeting communityName={primary.status === "ready" ? primary.name : null} />
          {/* DS-006 (prancha 01, ajuste de 20/09): o retorno relevante vem
              ANTES do lançador de intenções. A faixa só existe com notificação
              não-lida real (devolve null sem linha legível), então a Home de
              quem não tem retorno nenhum não ganha um bloco vazio no lugar. */}
          <ReturnStrip />
          {/* `explain` só no estado novo/sem comunidade aprovada: ali explicar as
              duas intenções vale o espaço. Membro ativo recebe a faixa compacta,
              que não empurra o primeiro item do feed para fora da dobra. */}
          <IntentLauncher
            variant={primary.status === "none" ? "explain" : "compact"}
            onAskQuestion={() => handleOpenComposer()}
          />
          {/* O trilho da prancha 01 não existe abaixo de 1024px. O conteúdo que
              só existe nele (os atalhos e "De mudança?") desce para cá fechado:
              continua alcançável sem inventar um rail que a prancha não desenha
              e sem empurrar o primeiro item do feed para fora da dobra. */}
          <InicioRailDisclosure />
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
