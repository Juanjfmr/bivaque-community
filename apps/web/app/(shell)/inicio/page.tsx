"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { CreatePostModal } from "../../components/bivaque/feed-post"
import { CommunitySection, type PrimaryCommunity } from "./community-section"
import { InicioComposer } from "./composer"
import { InicioGreeting } from "./greeting"
import { createRequestGuard, loadPrimaryCommunity } from "./home-loaders"
import { ReturnStrip } from "./return-strip"
import { InicioRightRail } from "./right-rail"

// RECON-002 (prancha 01-web-inicio): home de quem participa.
//
// A comunidade primária — a mais antiga entre as aprovadas, mesma resolução
// da rota /community — é lida uma vez aqui e serve às três consumidoras: a
// linha de contexto do cabeçalho, o feed "Na comunidade" e a audiência padrão
// do modal de publicação. Falha de leitura (inclusive rejeição de rede) vira
// estado recuperável na seção, não nome chumbado, vazio fingido nem
// carregamento infinito. A guarda de requisição descarta resposta atrasada de
// tentativa anterior — ela não sobrescreve o contexto já resolvido.
export default function InicioPage() {
  const { current } = useLocalityContext()
  const [primary, setPrimary] = useState<PrimaryCommunity>({ status: "loading" })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [defaultPostType, setDefaultPostType] = useState<string | undefined>(undefined)
  const [refreshKey, setRefreshKey] = useState(0)
  const supabase = createBrowserClient()
  const guardRef = useRef(createRequestGuard())

  const loadPrimary = useCallback(() => {
    const isCurrent = guardRef.current.begin()
    setPrimary({ status: "loading" })
    // O loader nunca rejeita: o then sem catch não solta rejection no console.
    void loadPrimaryCommunity(supabase).then((state) => {
      if (isCurrent()) setPrimary(state)
    })
  }, [supabase])

  useEffect(() => {
    loadPrimary()
  }, [loadPrimary])

  const handleOpenModal = useCallback((postType?: string) => {
    setDefaultPostType(postType)
    setShowCreateModal(true)
  }, [])

  const handleCreated = useCallback(() => {
    setRefreshKey((prev) => prev + 1)
    loadPrimary()
  }, [loadPrimary])

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[56rem] flex-1 gap-6 px-4 pt-4 pb-8">
        <div className="min-w-0 flex-1 space-y-4">
          <InicioGreeting communityName={primary.status === "ready" ? primary.name : null} />
          <InicioComposer onOpen={handleOpenModal} />
          <ReturnStrip />
          <CommunitySection
            primary={primary}
            onRetryPrimary={loadPrimary}
            onPublish={() => handleOpenModal()}
            refreshKey={refreshKey}
          />
        </div>

        <InicioRightRail />
      </div>

      {showCreateModal && (
        <CreatePostModal
          localityId={current.id}
          defaultPostType={defaultPostType}
          defaultCommunityId={primary.status === "ready" ? primary.id : undefined}
          onCreated={handleCreated}
          onClose={() => {
            setShowCreateModal(false)
            setDefaultPostType(undefined)
          }}
        />
      )}
    </div>
  )
}
