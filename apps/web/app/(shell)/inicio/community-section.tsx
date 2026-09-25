"use client"

import { Tabs } from "@heroui/react"
import { ChevronRight } from "lucide-react"
import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedPost, type FeedPostProps } from "../../components/bivaque/feed-post"
import { FeedCardSkeleton } from "../../components/bivaque/skeleton"
import { Button, ButtonLink } from "../../components/ui/button"
import { EmptyBlock } from "../../components/ui/panel"
import {
  createRequestGuard,
  loadCommunityFeed,
  loadFollowedFeed,
  type PrimaryCommunity,
} from "./home-loaders"
import { NewBadge } from "./hub-section"
import { newLabel } from "./hub-view"
import { countInWindow, type NoveltyWindow } from "./novelty"

// RECON-002 (prancha 01): seção "Na comunidade".
//
// Recentes lê o feed da comunidade primária pelo MESMO RPC que a rota
// /community usa (feed_community, RLS dentro da função) — nada de feed
// inventado. Sem comunidade aprovada, o vazio é honesto e aponta para a
// descoberta real (/communities). Consulta que falha — inclusive rejeição de
// rede — é erro recuperável com nova tentativa, nunca lista vazia fingida nem
// carregamento infinito. Resposta atrasada de comunidade/tentativa anterior é
// descartada pela guarda e não sobrescreve o feed do contexto atual.
//
// Acompanhando (RECON-049): a aba saiu do runtime enquanto não havia mecanismo
// de acompanhamento no backend; volta agora com lastro real — tabela
// post_follows + RPC feed_following (migration 20260915013344), que revalida a
// matriz de visibilidade no servidor. Sem follows, o vazio honesto explica a
// ação; nada de lista inventada.

// Re-exportado do módulo de carga: a página importa o tipo daqui, caminho que
// existia antes do extrato e foi preservado.
export type { PrimaryCommunity }

type FeedPostRow = FeedPostProps["post"]
type FeedTabKey = "recentes" | "acompanhando"

const TABS = [
  { key: "recentes", label: "Recentes" },
  { key: "acompanhando", label: "Acompanhando" },
] as const

interface CommunitySectionProps {
  primary: PrimaryCommunity
  onRetryPrimary: () => void
  onPublish: () => void
  // Incrementado pela página quando uma publicação é criada — recarrega o feed.
  refreshKey: number
  // No Início a seção é uma PRÉVIA (o feed inteiro mora em /community): só os
  // primeiros posts de cada aba, com "Ver tudo" levando ao resto.
  previewLimit?: number
  // Janela da última visita: o selo "3 novas" ao lado do nome da comunidade.
  novelty?: NoveltyWindow | null
}

export function CommunitySection({
  primary,
  onRetryPrimary,
  onPublish,
  refreshKey,
  previewLimit = 3,
  novelty = null,
}: CommunitySectionProps) {
  const [posts, setPosts] = useState<FeedPostRow[]>([])
  // "idle" cobre o frame entre a comunidade ficar pronta e o efeito disparar:
  // sem ele, o EmptyState piscaria antes do skeleton numa comunidade com posts.
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle")
  const [error, setError] = useState("")
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<FeedTabKey>("recentes")
  const [followedPosts, setFollowedPosts] = useState<FeedPostRow[]>([])
  const [followPhase, setFollowPhase] = useState<"idle" | "loading" | "done">("idle")
  const [followError, setFollowError] = useState("")
  // A cada visita à aba, o feed de acompanhados é relido: um follow novo no
  // cartão (ou um desfollow) aparece sem exigir refresh da página.
  const [followReload, setFollowReload] = useState(0)
  const supabase = createBrowserClient()
  const guardRef = useRef(createRequestGuard())
  const followGuardRef = useRef(createRequestGuard())

  const loadFeed = useCallback(() => {
    if (primary.status !== "ready") {
      // Comunidade ainda não resolvida: aposenta em voo qualquer resposta da
      // resolução anterior para ela não chegar como feed do contexto novo.
      guardRef.current.begin()
      return
    }

    const isCurrent = guardRef.current.begin()
    setPhase("loading")
    setError("")

    void loadCommunityFeed(supabase, primary.id).then((outcome) => {
      if (!isCurrent()) return
      if (outcome.status === "error") {
        setError(outcome.message)
        setPhase("idle")
        return
      }
      setPosts(outcome.posts as unknown as FeedPostRow[])
      setPhase("done")
    })
  }, [primary, supabase])

  const loadFollowing = useCallback(() => {
    const isCurrent = followGuardRef.current.begin()
    setFollowPhase("loading")
    setFollowError("")

    void loadFollowedFeed(supabase).then((outcome) => {
      if (!isCurrent()) return
      if (outcome.status === "error") {
        setFollowError(outcome.message)
        setFollowPhase("idle")
        return
      }
      setFollowedPosts(outcome.posts as unknown as FeedPostRow[])
      setFollowPhase("done")
    })
  }, [supabase])

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey é gatilho de nível página — o efeito deve re-executar quando ele muda, mesmo sem lê-lo
  useEffect(() => {
    loadFeed()
  }, [loadFeed, refreshKey])

  // Carrega o feed de acompanhados na primeira visita à aba e a cada
  // incremento de followReload (nova tentativa ou revisita).
  // biome-ignore lint/correctness/useExhaustiveDependencies: followReload só é gatilho de revisita — o efeito deve re-executar quando ele muda, mesmo sem lê-lo
  useEffect(() => {
    if (tab !== "acompanhando") return
    loadFollowing()
  }, [tab, loadFollowing, followReload])

  const handleHidePost = useCallback((postId: string) => {
    setHiddenPostIds((prev) => new Set(prev).add(postId))
  }, [])

  const handleTabChange = useCallback((key: React.Key) => {
    setTab(key as FeedTabKey)
  }, [])

  const followingListView =
    followPhase !== "done" ? (
      <div className="space-y-2" aria-busy="true">
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </div>
    ) : followedPosts.length === 0 ? (
      <EmptyBlock
        title="Você ainda não acompanha publicações"
        description={
          'Toque em "Acompanhar" em uma publicação para acompanhar as respostas por aqui.'
        }
      />
    ) : (
      followedPosts
        .filter((post) => !hiddenPostIds.has(post.id))
        .slice(0, previewLimit)
        .map((post, index) => (
          <FeedPost key={post.id} post={post} index={index} onHide={handleHidePost} />
        ))
    )

  const recentesListView =
    phase !== "done" ? (
      <div className="space-y-2" aria-busy="true">
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </div>
    ) : posts.length === 0 ? (
      <EmptyBlock
        title="Nenhuma publicação ainda"
        description="Seja o primeiro a compartilhar algo com a sua comunidade."
        action={
          <Button variant="primary" onClick={onPublish}>
            Publicar
          </Button>
        }
      />
    ) : (
      posts
        .filter((post) => !hiddenPostIds.has(post.id))
        .slice(0, previewLimit)
        .map((post, index) => (
          <FeedPost key={post.id} post={post} index={index} onHide={handleHidePost} />
        ))
    )

  // Contado sobre o feed lido (o mesmo que a prévia recorta), só na aba Recentes.
  const newPosts =
    novelty && phase === "done" && !error
      ? countInWindow(
          posts.map((post) => post.created_at),
          novelty,
        )
      : 0

  const hasMore =
    primary.status === "ready" &&
    (tab === "recentes"
      ? phase === "done" && !error && posts.length > previewLimit
      : followPhase === "done" && !followError && followedPosts.length > previewLimit)

  return (
    <section id="secao-comunidade" aria-labelledby="na-comunidade-titulo" className="scroll-mt-16">
      {/* Cabeçalho da prévia: o nome da comunidade e "Ver tudo" na mesma linha,
          e as abas coladas logo abaixo, sobre uma linha que atravessa a coluna
          (referência: Threads). Nada disputa a linha com o título a 375. */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="na-comunidade-titulo" className="min-w-0 text-base font-semibold text-ui-ink">
            <span className="block truncate">
              {primary.status === "ready" && primary.name ? primary.name : "Na sua comunidade"}
            </span>
          </h2>
          {newPosts > 0 ? <NewBadge label={newLabel(newPosts, "f")} /> : null}
        </div>
        {primary.status === "ready" ? (
          <Link
            href="/community"
            className="-mr-2 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-ui px-2 text-sm font-semibold text-ui-brand transition-colors hover:bg-ui-subtle"
          >
            Ver tudo
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div className="border-b border-ui-line">
        <Tabs
          aria-label="Conteúdo da comunidade"
          selectedKey={tab}
          onSelectionChange={handleTabChange}
          className="tabs--secondary"
        >
          <Tabs.ListContainer>
            <Tabs.List>
              {TABS.map((item) => (
                <Tabs.Tab key={item.key} id={item.key}>
                  {item.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      <div className="mt-3 space-y-4">
        {primary.status === "loading" ? (
          <div className="space-y-2" aria-busy="true">
            <FeedCardSkeleton />
            <FeedCardSkeleton />
          </div>
        ) : primary.status === "error" ? (
          <ErrorState
            message="Não foi possível identificar a sua comunidade. Tente novamente."
            onRetry={onRetryPrimary}
          />
        ) : primary.status === "none" ? (
          <EmptyBlock
            title="Você ainda não participa de uma comunidade"
            description="Peça para entrar em uma comunidade perto de você para ver as publicações aqui."
            action={
              <ButtonLink href="/communities" variant="primary">
                Ver comunidades
              </ButtonLink>
            }
          />
        ) : tab === "acompanhando" ? (
          followError ? (
            <ErrorState message={followError} onRetry={() => setFollowReload((prev) => prev + 1)} />
          ) : (
            followingListView
          )
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadFeed()} />
        ) : (
          recentesListView
        )}
        {hasMore ? (
          <Link
            href="/community"
            className="flex min-h-11 items-center justify-center gap-1 rounded-ui-lg bg-ui-surface text-sm font-semibold text-ui-brand shadow-ui ring-1 ring-ui-line transition-colors hover:bg-ui-subtle"
          >
            Ver todas as publicações
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </section>
  )
}
