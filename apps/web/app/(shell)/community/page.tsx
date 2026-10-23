"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedComposer } from "../../components/bivaque/feed-composer"
import { CreatePostModal } from "../../components/bivaque/feed-post"
import { FeedCardSkeleton } from "../../components/bivaque/skeleton"
import { IndicationsPanel } from "../../components/indications/indications-panel"
import {
  createRequestGuard,
  loadPrimaryCommunity,
  type PrimaryCommunity,
} from "../inicio/home-loaders"
import { JoinCommunityCard } from "../inicio/join-community"
import { CommunityHeader } from "./community-header"
import { useCommunityHeader } from "./use-community-header"

// A Comunidade sem a vista "Conversa" (lote 5, tarefa N2 — ADR-20261023,
// "Navegação e estrutura").
//
// O feed da cidade passou para o Início (leitura nova `feed_locality`, migration
// 20261024100000) e a vista "Conversa" sai daqui: não há duas telas com o mesmo
// feed. O que fica é o que a Comunidade é neste lote — a memória da cidade, ou
// seja o painel de Indicações. `?vista=indicacoes` continua sendo o endereço
// canônico dessa vista (é o href de `INDICATIONS_HREF` e o destino dos links
// antigos e das notificações), precedido do cabeçalho da comunidade da pessoa,
// ou do convite a entrar quando ela não tem nenhuma.
//
// A linha de publicar continua: é a entrada do compositor que já existe
// (`CreatePostModal`), não o feed. Ela publica para onde o seletor de audiência
// do próprio compositor disser; o que a pessoa publica aparece no feed da
// cidade, no Início.
//
// Nada aqui lê conteúdo por conta própria e nada filtra escopo no cliente: o
// painel de Indicações resolve a leitura e as permissões no servidor.

export default function CommunityPage() {
  const { current } = useLocalityContext()
  const { communities } = useMemberContext()
  const [primary, setPrimary] = useState<PrimaryCommunity>({ status: "loading" })
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [entryAttachment, setEntryAttachment] = useState<string | undefined>(undefined)
  const supabase = createBrowserClient()
  const guardRef = useRef(createRequestGuard())

  const searchParams = useSearchParams()
  const autoFocusAsk = searchParams.get("pedir") === "1"
  const initialQuery = searchParams.get("q") ?? ""

  const primaryCommunityId = primary.status === "ready" ? primary.id : null
  const headerData = useCommunityHeader(primaryCommunityId)
  const thumbnailUrl =
    communities.find((community) => community.id === primaryCommunityId)?.thumbnailUrl ?? null

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

  const handleOpenModal = useCallback((attachment?: string) => {
    setEntryAttachment(attachment)
    setShowCreateModal(true)
  }, [])

  const handleCreated = useCallback(() => {
    setShowCreateModal(false)
    setEntryAttachment(undefined)
  }, [])

  const cityLabel = current.stateCode
    ? `${current.cityName}, ${current.stateCode}`
    : current.cityName

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-[72rem] space-y-4 px-4 pt-4 pb-8 sm:pt-6 md:pb-10 lg:px-8">
        {primary.status === "error" ? (
          <ErrorState
            message="Não foi possível identificar a sua comunidade. Tente novamente."
            onRetry={loadPrimary}
          />
        ) : primary.status === "loading" ? (
          <div className="space-y-2" aria-busy="true">
            <FeedCardSkeleton />
          </div>
        ) : primary.status === "ready" ? (
          <CommunityHeader
            communityId={primary.id}
            name={primary.name ?? "Comunidade"}
            thumbnailUrl={thumbnailUrl}
            cityLabel={cityLabel}
            data={headerData}
          />
        ) : (
          <h1 className="text-xl font-semibold tracking-tight text-ui-ink">Comunidade</h1>
        )}

        {/* Sem comunidade aprovada, o passo que falta vem antes do painel. */}
        {primary.status === "none" ? <JoinCommunityCard /> : null}

        {/* A linha de publicar: entrada do compositor existente. Fica fora do
            estado de carregamento para não capturar o que a pessoa digitar
            antes de a página saber onde ela está. */}
        {primary.status !== "loading" && primary.status !== "error" ? (
          <FeedComposer
            onOpenModal={handleOpenModal}
            communityName={primary.status === "ready" ? primary.name : null}
          />
        ) : null}

        <IndicationsPanel
          localityId={current.id}
          cityName={current.cityName}
          autoFocusAsk={autoFocusAsk}
          initialQuery={initialQuery}
        />
      </div>

      {showCreateModal && (
        <CreatePostModal
          localityId={current.id}
          initialAttachment={entryAttachment}
          defaultCommunityId={primaryCommunityId ?? undefined}
          onCreated={handleCreated}
          onClose={() => {
            setShowCreateModal(false)
            setEntryAttachment(undefined)
          }}
        />
      )}
    </div>
  )
}
