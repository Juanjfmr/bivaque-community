"use client"

import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedCardSkeleton } from "../../components/bivaque/skeleton"
import { IndicationsPanel } from "../../components/indications/indications-panel"
import {
  createRequestGuard,
  loadPrimaryCommunity,
  type PrimaryCommunity,
} from "../inicio/home-loaders"
import { CommunityHeader } from "./community-header"
import { useCommunityHeader } from "./use-community-header"

// A Comunidade sem feed e sem a vista "Conversa" (lote 5, tarefa N2 —
// ADR-20261023, "Navegação e estrutura"). As abas do protótipo entram aqui no
// lote 5 N1 (CommunityTabs): Indicações (esta vista) e Grupos (a rota /groups).
// A aba Negócios entra com o lote 6.
//
// Não existe publicação para a cidade inteira: na cidade a conversa é de
// perguntas e respostas — o painel de Indicações — e publicar acontece só
// dentro de um grupo, pelo compositor que o shell e o Início abrem. Por isso
// saíram daqui a vista "Conversa", o feed e a linha de publicar. A leitura
// nova `feed_locality` que a versão anterior desta tela usava nem chegou ao
// banco: a migration 20261024100000 passou a recusar publicação sem grupo.
//
// `?vista=indicacoes` continua sendo o endereço canônico desta vista (é o href
// de `INDICATIONS_HREF` e o destino dos links antigos e das notificações),
// precedido do cabeçalho da comunidade da pessoa, ou do convite a entrar quando
// ela não tem nenhuma.
//
// Nada aqui lê conteúdo por conta própria e nada filtra escopo no cliente: o
// painel de Indicações resolve a leitura e as permissões no servidor.

export default function CommunityPage() {
  const { current } = useLocalityContext()
  const { communities } = useMemberContext()
  const [primary, setPrimary] = useState<PrimaryCommunity>({ status: "loading" })
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

  const cityLabel = current.stateCode
    ? `${current.cityName}, ${current.stateCode}`
    : current.cityName

  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full space-y-4 pb-8 md:pb-10">
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
            name={primary.name ?? "Comunidade"}
            thumbnailUrl={thumbnailUrl}
            cityLabel={cityLabel}
            data={headerData}
          />
        ) : (
          <h1 className="text-xl font-semibold tracking-tight text-ui-ink">Comunidade</h1>
        )}

        <IndicationsPanel
          localityId={current.id}
          cityName={current.cityName}
          autoFocusAsk={autoFocusAsk}
          initialQuery={initialQuery}
        />
      </div>
    </div>
  )
}
