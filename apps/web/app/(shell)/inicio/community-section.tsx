"use client"

import { Button, Tabs } from "@heroui/react"
import { Clock, MapPin } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../../components/bivaque/avatar"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedPost, type FeedPostProps } from "../../components/bivaque/feed-post"
import { EventsIllustration } from "../../components/bivaque/illustrations"
import { FeedCardSkeleton } from "../../components/bivaque/skeleton"
import { eventDateChip, formatEventTimePtBr } from "./formatters"
import {
  buildGoingLine,
  createRequestGuard,
  loadCommunityFeed,
  loadFollowedFeed,
  type NextEvent,
  type PrimaryCommunity,
} from "./home-loaders"

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
  // Evento próximo da localidade, já resolvido pela página (mesmo evento do
  // rail "Seu próximo encontro"): a prancha 01 desenha o card no feed também.
  event: NextEvent | null
}

export function CommunitySection({
  primary,
  onRetryPrimary,
  onPublish,
  refreshKey,
  event,
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
  const router = useRouter()
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
      <EmptyState
        title="Você ainda não acompanha publicações"
        description={
          'Toque em "Acompanhar" em uma publicação para acompanhar as respostas por aqui.'
        }
      />
    ) : (
      followedPosts
        .filter((post) => !hiddenPostIds.has(post.id))
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
      <EmptyState
        title="Nenhuma publicação ainda"
        description="Seja o primeiro a compartilhar algo com a sua comunidade."
        action={
          <Button size="sm" variant="primary" className="min-h-11" onPress={onPublish}>
            Publicar
          </Button>
        }
      />
    ) : (
      posts
        .filter((post) => !hiddenPostIds.has(post.id))
        .flatMap((post, index) => {
          // A prancha 01 intercala o card do evento próximo entre as
          // publicações do feed; sem evento (ou com consulta que falhou) o
          // feed segue só com posts — nunca um card com dado pendurado.
          const showEvent = index === 0 && event !== null
          const cards: React.ReactNode[] = [
            <FeedPost key={post.id} post={post} index={index} onHide={handleHidePost} />,
          ]
          if (showEvent) {
            cards.push(<FeedEventCard key="feed-event-card" event={event} />)
          }
          return cards
        })
    )

  return (
    <section aria-labelledby="na-comunidade-titulo">
      <div className="flex items-center justify-between gap-3">
        <h2 id="na-comunidade-titulo" className="text-lg font-semibold tracking-tight">
          Na comunidade
        </h2>
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

      <div className="mt-3 space-y-3">
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
          <EmptyState
            title="Você ainda não participa de uma comunidade"
            description="Peça para entrar em uma comunidade perto de você para ver as publicações aqui."
            action={
              <Button
                size="sm"
                variant="primary"
                className="min-h-11"
                onPress={() => router.push("/communities")}
              >
                Ver comunidades
              </Button>
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
      </div>
    </section>
  )
}

// Card do evento próximo no feed (prancha 01: "Café entre vizinhos" com foto,
// chip de data, presença e "Ver evento"). A foto larga é placeholder honesto
// — o seed ainda não carrega imagens de evento; o chip e a linha de presença
// vêm dos mesmos formatters do rail "Seu próximo encontro".
function FeedEventCard({ event }: { event: NextEvent }) {
  const chip = eventDateChip(event.startsAt)
  const time = formatEventTimePtBr(event.startsAt)
  const goingAttendees = event.goingAttendees.slice(0, 3)
  const peopleLine = buildGoingLine(
    goingAttendees.map((attendee) => attendee.name),
    event.goingCount ?? 0,
  )

  return (
    <Link
      href={("/events/" + event.id) as Route}
      className="group overflow-hidden rounded-2xl border border-border bg-[var(--semantic-surface)] shadow-[var(--semantic-elevation-raised)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
      aria-label={"Ver evento: " + event.title}
    >
      <div className="relative">
        <div
          className="flex h-32 items-center justify-center bg-[var(--semantic-surface-sunken)]"
          aria-hidden="true"
        >
          <EventsIllustration className="h-14 w-20" />
        </div>
        <div className="absolute bottom-3 left-3 flex w-12 flex-col items-center rounded-lg bg-[var(--semantic-surface)] py-1.5 text-center shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wide">{chip.weekday}</span>
          <span className="text-lg font-semibold leading-tight">{chip.day}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-tight">{event.title}</p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
            <Clock size={14} aria-hidden="true" />
            <span>{time}</span>
            {event.venue ? (
              <>
                <span aria-hidden="true">·</span>
                <MapPin size={14} aria-hidden="true" />
                <span className="truncate">{event.venue}</span>
              </>
            ) : null}
          </p>
          {peopleLine ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex -space-x-2" aria-hidden="true">
                {goingAttendees.map((attendee) => (
                  <MemberAvatar
                    key={attendee.userId}
                    name={attendee.name}
                    size="sm"
                    className="ring-2 ring-[var(--semantic-surface)]"
                  />
                ))}
              </div>
              <p className="text-xs text-muted">{peopleLine}</p>
            </div>
          ) : null}
        </div>
        <span className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] group-hover:bg-[var(--semantic-selected)]">
          Ver evento
        </span>
      </div>
    </Link>
  )
}
