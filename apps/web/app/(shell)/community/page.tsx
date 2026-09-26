"use client"

import { Tabs } from "@heroui/react"
import { CheckCircle2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import type { Database } from "supabase/database.generated"
import { useLocalityContext } from "../../../lib/locality-context"
import { isLocalityStale } from "../../../lib/locality-density"
import { useMemberContext } from "../../../lib/member-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { CityReference } from "../../components/bivaque/city-reference"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedComposer } from "../../components/bivaque/feed-composer"
import { CreatePostModal, FeedPost } from "../../components/bivaque/feed-post"
import {
  FeedRailDisclosure,
  FeedRightRail,
  useFeedRailData,
} from "../../components/bivaque/feed-right-rail"
import { FeedCardSkeleton } from "../../components/bivaque/skeleton"
import { IndicationsPanel } from "../../components/indications/indications-panel"
import { POST_CREATED_EVENT } from "../../components/shell/create-menu"
import { Button } from "../../components/ui/button"
import { EmptyBlock } from "../../components/ui/panel"
import { JoinCommunityCard } from "../inicio/join-community"
import { useNoveltyWindow } from "../inicio/use-last-visit"
import { CommunityHeader } from "./community-header"
import { appendPage, DEEP_LINK_MAX_PAGES, hasMoreAfter, pageParams } from "./feed-pages"
import { sectionFeed } from "./feed-sections"
import { useCommunityHeader } from "./use-community-header"
import { CommunityViewSwitch, readCommunityView } from "./view-switch"

type FeedPostRow = Database["public"]["Functions"]["feed_posts"]["Returns"][number]
type SortOrder = "recent" | "relevant"

// A Comunidade refeita no sistema visual mínimo (25/09/2026). Referências do
// Mobbin: o topo e as abas das comunidades do X (web e iOS), do Threads e do
// Runna; a linha "Post about…" + "Post" do Threads; o trilho com regras do X e
// próximos encontros do Circle. A ordem da página: quem é a comunidade →
// publicar → como ler (abas presas ao topo) → as publicações.

const SORT_TABS: { key: SortOrder; label: string }[] = [
  { key: "recent", label: "Recentes" },
  { key: "relevant", label: "Relevantes" },
]

export default function CommunityPage() {
  const [posts, setPosts] = useState<FeedPostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  // Dica da ENTRADA (o botão "Link" do compositor), não formato escolhido: o
  // `post_type` é derivado do anexo real dentro do CreatePostModal.
  const [entryAttachment, setEntryAttachment] = useState<string | undefined>(undefined)
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const [primaryCommunityId, setPrimaryCommunityId] = useState<string | null>(null)
  const [primaryCommunityName, setPrimaryCommunityName] = useState<string | null>(null)
  const [hasResolved, setHasResolved] = useState(false)
  const [sortOrder, setSortOrder] = useState<"recent" | "relevant">("recent")
  const [transitioning, setTransitioning] = useState(false)
  // Páginas do feed (feed-pages.ts): há mais para buscar? buscando agora? a
  // última busca de página falhou (erro recuperável, nunca fim fingido)?
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  // Cada recarga do feed (troca de ordem, publicação nova) aposenta as páginas
  // em voo da leitura anterior: resposta atrasada não se mistura à lista nova.
  const feedGeneration = useRef(0)
  const deepLinkPages = useRef(0)
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set())

  const { current } = useLocalityContext()
  const { communities } = useMemberContext()
  const cityLabel = current.stateCode
    ? `${current.cityName}, ${current.stateCode}`
    : current.cityName

  const searchParams = useSearchParams()
  const targetPostId = searchParams.get("post")
  const view = readCommunityView(searchParams.get("vista"))
  const autoFocusAsk = searchParams.get("pedir") === "1"
  const initialQuery = searchParams.get("q") ?? ""
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(null)
  const postRefs = useRef<Map<string, HTMLElement | null>>(new Map())
  const hasScrolledToDeepLink = useRef(false)

  const supabase = createBrowserClient()

  // Uma leitura só serve as duas montagens do trilho (a de >=1024px e o
  // disclosure do telefone). Ver useFeedRailData para por que ela não é portão.
  const railData = useFeedRailData()
  const novelty = useNoveltyWindow()
  // Relógio da divisão "Hoje / Esta semana": fixo na montagem, e só usado depois
  // que o feed chega do cliente — nunca entra no HTML hidratado.
  const [now] = useState(() => new Date())

  const loadFeed = useCallback(
    async (order: "recent" | "relevant" = sortOrder) => {
      const generation = ++feedGeneration.current
      setLoading(true)
      setError("")
      setLoadMoreError(false)
      setHasMore(false)

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setError("Sessão expirada. Faça login novamente.")
        setLoading(false)
        setHasResolved(true)
        return
      }

      const { data: membershipsData, error: membershipsError } = await supabase
        .from("community_memberships")
        .select("community_id")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .order("joined_at", { ascending: true })
        .limit(1)

      if (membershipsError) {
        // Reading the error is not optional: silently swallowing it is how the
        // group member list rendered empty in production before — README §"Duas
        // coisas que o E2E ensinou".
        setError("Não foi possível identificar sua comunidade. Tente novamente.")
        setLoading(false)
        return
      }

      const communityId = ((membershipsData as { community_id: string }[] | null) ?? [])[0]
        ?.community_id

      let communityName: string | null = null
      if (communityId) {
        const { data: communityData, error: communityError } = await supabase
          .from("communities")
          .select("name")
          .eq("id", communityId)
          .maybeSingle()
        if (communityError) {
          setError("Não foi possível identificar sua comunidade. Tente novamente.")
          setLoading(false)
          return
        }
        communityName = (communityData as { name: string } | null)?.name ?? null
      }

      // Onda E Task 2: quando o membro não pertence a comunidade nenhuma, NÃO
      // caímos no feed_posts (Manhattan-reach). A home passa a ser a referência
      // da cidade (§6.2), renderizada por <CityReference />. O RPC feed_posts
      // continua existindo — profile/page.tsx:129 o usa e a Task 7 conserta.
      if (!communityId) {
        setPosts([])
        setPrimaryCommunityId(null)
        setPrimaryCommunityName(null)
        setLoading(false)
        setHasResolved(true)
        return
      }

      const feed = await supabase.rpc("feed_community", {
        p_community_id: communityId,
        p_order: order,
        ...pageParams(0),
      })

      if (generation !== feedGeneration.current) return
      if (feed.error) {
        setError("Não foi possível carregar as publicações. Tente novamente.")
        setLoading(false)
        return
      }

      const newPosts = (feed.data as unknown as FeedPostRow[]) ?? []
      setPosts(newPosts)
      setHasMore(hasMoreAfter(newPosts.length))
      setPrimaryCommunityId(communityId ?? null)
      setPrimaryCommunityName(communityName)
      setLoading(false)
      setHasResolved(true)
    },
    [sortOrder, supabase],
  )

  // A próxima página, a partir do que já foi buscado (inclusive o que a pessoa
  // escondeu: o deslocamento é do servidor, não da tela).
  const loadMore = useCallback(async () => {
    if (!primaryCommunityId || loadingMore || !hasMore) return
    const generation = feedGeneration.current
    setLoadingMore(true)
    setLoadMoreError(false)
    const page = await supabase.rpc("feed_community", {
      p_community_id: primaryCommunityId,
      p_order: sortOrder,
      ...pageParams(posts.length),
    })
    if (generation !== feedGeneration.current) return
    setLoadingMore(false)
    if (page.error) {
      setLoadMoreError(true)
      return
    }
    const rows = (page.data as unknown as FeedPostRow[]) ?? []
    setPosts((previous) => appendPage(previous, rows))
    setHasMore(hasMoreAfter(rows.length))
  }, [primaryCommunityId, loadingMore, hasMore, posts.length, sortOrder, supabase])

  const handleSortChange = useCallback(
    (order: "recent" | "relevant") => {
      if (order === sortOrder) return
      setSortOrder(order)
      setTransitioning(true)
      loadFeed(order).finally(() => {
        setTransitioning(false)
      })
    },
    [sortOrder, loadFeed],
  )

  const handleOpenModal = useCallback((attachment?: string) => {
    setEntryAttachment(attachment)
    setShowCreateModal(true)
  }, [])

  const handleCreated = useCallback(() => {
    loadFeed(sortOrder).catch(() => {
      /* errors handled in loadFeed */
    })
  }, [loadFeed, sortOrder])

  // Pergunta publicada pelo menu de criação do shell: o feed recarrega como se
  // tivesse sido publicada daqui.
  useEffect(() => {
    window.addEventListener(POST_CREATED_EVENT, handleCreated)
    return () => window.removeEventListener(POST_CREATED_EVENT, handleCreated)
  }, [handleCreated])

  const handleHidePost = useCallback((postId: string) => {
    setHiddenPostIds((prev) => new Set(prev).add(postId))
  }, [])

  const initialLoadDone = useRef(false)

  // load member count
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // D51: contar apenas memberships correntes e com acesso ativo. Linhas
      // leaving/read_only inflariam o contador "N membros" e o sinal de
      // densidade §3.4 (isLocalityStale) sem justificativa.
      const result = await supabase
        .from("locality_memberships")
        .select("*", { count: "exact", head: true })
        .eq("locality_id", current.id)
        .eq("kind", "current")
        .eq("access", "active")
      if (cancelled) return
      if (result.error) {
        // Distinguir erro de leitura de contagem zero: sem número, o vazio não
        // afirma densidade que não conhecemos (DESIGN_SPEC §3.2).
        setMemberCount(null)
        return
      }
      setMemberCount(result.count ?? 0)
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, current.id])

  // initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      loadFeed(sortOrder)
    }
  }, [loadFeed, sortOrder])

  useEffect(() => {
    if (hasScrolledToDeepLink.current) return
    if (!targetPostId) return
    if (posts.length === 0) return

    const target = posts.find((p) => p.id === targetPostId)
    if (!target) {
      // O link aponta para uma publicação além da primeira página: busca as
      // seguintes, até um teto, em vez de desistir em silêncio.
      if (hasMore && !loadingMore && deepLinkPages.current < DEEP_LINK_MAX_PAGES) {
        deepLinkPages.current += 1
        void loadMore()
      }
      return
    }

    hasScrolledToDeepLink.current = true
    setHighlightedPostId(targetPostId)
  }, [posts, targetPostId, hasMore, loadingMore, loadMore])

  // Rolar até a publicação e apagar o destaque moram num efeito próprio, que
  // só reage ao destaque: o efeito acima roda de novo a cada página que chega,
  // e a limpeza dele cancelava a rolagem antes de ela acontecer (achado na
  // prova de runtime do link para a página 3, 25/09/2026).
  useEffect(() => {
    if (!highlightedPostId) return
    const raf = requestAnimationFrame(() => {
      postRefs.current
        .get(highlightedPostId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
    const timer = setTimeout(() => setHighlightedPostId(null), 2500)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timer)
    }
  }, [highlightedPostId])

  const thumbnailUrl =
    communities.find((community) => community.id === primaryCommunityId)?.thumbnailUrl ?? null
  const visiblePosts = posts.filter((post) => !hiddenPostIds.has(post.id))
  const headerData = useCommunityHeader(primaryCommunityId)
  // Só a ordem Recentes se divide no tempo; em Relevantes o tempo não é o eixo.
  const sections =
    sortOrder === "recent"
      ? sectionFeed(visiblePosts, now, novelty)
      : [{ label: null, posts: visiblePosts }]

  return (
    <div className="flex flex-1 flex-col">
      {/* Onda E Task 2: quando o membro não pertence a nenhuma comunidade, a
          home é a referência da cidade (§6.2), não o feed da vila. O feed
          municipal é morto pela D48. Acima dela, o mesmo convite a entrar numa
          comunidade que o Início mostra. O CreatePostModal continua disponível
          — o membro ainda pode publicar com alcance da cidade. */}
      {hasResolved && !primaryCommunityId && !error ? (
        <>
          <div className="mx-auto w-full max-w-[72rem] space-y-4 px-4 pt-4 sm:pt-6 lg:px-8">
            <JoinCommunityCard />
            {/* Sem comunidade, as indicações da cidade continuam ao alcance. */}
            <CommunityViewSwitch view={view} />
            {view === "indicacoes" ? (
              <div className="pb-8">
                <IndicationsPanel
                  localityId={current.id}
                  cityName={current.cityName}
                  autoFocusAsk={autoFocusAsk}
                  initialQuery={initialQuery}
                />
              </div>
            ) : null}
          </div>
          {view === "conversa" ? <CityReference onPublish={() => handleOpenModal()} /> : null}
          {showCreateModal && (
            <CreatePostModal
              localityId={current.id}
              initialAttachment={entryAttachment}
              onCreated={handleCreated}
              onClose={() => {
                setShowCreateModal(false)
                setEntryAttachment(undefined)
              }}
            />
          )}
        </>
      ) : (
        <>
          <div className="mx-auto flex w-full max-w-[72rem] flex-1 gap-8 px-4 pt-4 pb-8 sm:pt-6 md:pb-10 lg:px-8">
            <div className="min-w-0 flex-1 space-y-4">
              {primaryCommunityId && primaryCommunityName ? (
                <CommunityHeader
                  communityId={primaryCommunityId}
                  name={primaryCommunityName}
                  thumbnailUrl={thumbnailUrl}
                  cityLabel={cityLabel}
                  data={headerData}
                />
              ) : (
                <h1 className="text-xl font-semibold tracking-tight text-ui-ink">Comunidade</h1>
              )}

              <CommunityViewSwitch view={view} />

              {view === "indicacoes" ? (
                <IndicationsPanel
                  localityId={current.id}
                  cityName={current.cityName}
                  autoFocusAsk={autoFocusAsk}
                  initialQuery={initialQuery}
                />
              ) : (
                <>
                  <FeedComposer
                    onOpenModal={handleOpenModal}
                    communityName={primaryCommunityName}
                  />

                  {/* As abas ficam presas ao topo do contêiner que rola (o `main` do
                  shell): trocar a ordem continua a um toque no meio da leitura. */}
                  <div className="sticky top-0 z-20 -mx-4 border-b border-ui-line bg-ui-bg/95 px-4 backdrop-blur lg:mx-0 lg:px-0">
                    <Tabs
                      aria-label="Ordenar publicações"
                      selectedKey={sortOrder}
                      onSelectionChange={(key) => handleSortChange(key as SortOrder)}
                      className="tabs--secondary"
                    >
                      <Tabs.ListContainer>
                        <Tabs.List>
                          {SORT_TABS.map((item) => (
                            <Tabs.Tab key={item.key} id={item.key}>
                              {item.label}
                            </Tabs.Tab>
                          ))}
                        </Tabs.List>
                      </Tabs.ListContainer>
                    </Tabs>
                  </div>

                  {/* Abaixo de 1024px o trilho não existe: o que ele carrega (eventos,
                  grupos e as regras) não aparece em nenhum outro lugar desta rota,
                  então desce fechado para a coluna do feed. Fechado porque o feed
                  não tem limite de itens — aberto por padrão, empurraria as
                  publicações para baixo de uma lista de contexto. */}
                  <FeedRailDisclosure data={railData} />

                  {error && <ErrorState message={error} onRetry={() => loadFeed(sortOrder)} />}

                  {loading && !error && (
                    <div className="space-y-4" aria-busy="true">
                      <FeedCardSkeleton />
                      <FeedCardSkeleton />
                      <FeedCardSkeleton />
                    </div>
                  )}

                  {/* P0 Task 9: abaixo do limiar de densidade §3.4 o vazio diz "Você
                  é dos primeiros aqui" em vez de "Nenhuma publicação ainda" — a
                  segunda frase descreve uma sala quieta, não um começo. */}
                  {!loading && !error && posts.length === 0 && (
                    <EmptyBlock
                      title={
                        isLocalityStale(memberCount)
                          ? "Você é dos primeiros aqui."
                          : "Nenhuma publicação ainda"
                      }
                      description={
                        isLocalityStale(memberCount)
                          ? "Esta comunidade está começando. Publique algo para abrir caminho para quem chegar depois."
                          : "Seja o primeiro a compartilhar algo com a sua comunidade."
                      }
                      action={
                        <Button variant="primary" onClick={() => handleOpenModal()}>
                          Publicar
                        </Button>
                      }
                    />
                  )}

                  {!loading && posts.length > 0 && (
                    <div
                      className={`space-y-4 transition-opacity duration-200 ${transitioning ? "opacity-60" : "opacity-100"}`}
                    >
                      {sections.map((section) => (
                        <section
                          key={section.label ?? "todas"}
                          aria-label={section.label ?? undefined}
                          className="space-y-4"
                        >
                          {section.label ? (
                            <h2 className="flex items-center gap-3 pt-2 text-xs font-semibold tracking-wide text-ui-ink-2 uppercase">
                              {section.label}
                              {section.showCount ? (
                                <span className="rounded-full bg-ui-brand px-2 py-0.5 text-xs font-semibold tracking-normal text-ui-on-brand normal-case">
                                  {section.posts.length}
                                </span>
                              ) : null}
                              <span aria-hidden="true" className="h-px flex-1 bg-ui-line" />
                            </h2>
                          ) : null}
                          {section.posts.map((post, index) => (
                            <div
                              key={post.id}
                              ref={(el) => {
                                if (el) {
                                  postRefs.current.set(post.id, el)
                                } else {
                                  postRefs.current.delete(post.id)
                                }
                              }}
                              className={
                                highlightedPostId === post.id
                                  ? "rounded-ui-lg ring-2 ring-ui-brand ring-offset-2 ring-offset-ui-bg transition-shadow duration-300"
                                  : undefined
                              }
                            >
                              <FeedPost post={post} index={index} onHide={handleHidePost} />
                            </div>
                          ))}
                        </section>
                      ))}
                    </div>
                  )}

                  {!loading && !error && posts.length > 0 ? (
                    hasMore ? (
                      <LoadMore
                        loading={loadingMore}
                        failed={loadMoreError}
                        onLoad={() => void loadMore()}
                      />
                    ) : (
                      <p className="flex items-center justify-center gap-2 py-6 text-sm text-ui-ink-2">
                        <CheckCircle2 size={16} className="text-ui-brand" aria-hidden="true" />
                        Você está em dia
                      </p>
                    )
                  ) : null}
                </>
              )}
            </div>

            <FeedRightRail data={railData} />
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
        </>
      )}
    </div>
  )
}

// O fim da lista enquanto há mais: chegar perto dele carrega a próxima página
// sozinho (IntersectionObserver, 600px antes); o botão continua lá para quem
// navega por teclado ou leitor de tela, e para quando a busca falha.
function LoadMore({
  loading,
  failed,
  onLoad,
}: {
  loading: boolean
  failed: boolean
  onLoad: () => void
}) {
  const sentinel = useRef<HTMLDivElement>(null)
  const onLoadRef = useRef(onLoad)
  onLoadRef.current = onLoad

  useEffect(() => {
    const node = sentinel.current
    if (!node || failed) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onLoadRef.current()
      },
      { rootMargin: "600px 0px" },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [failed])

  return (
    <div ref={sentinel} className="space-y-4 pb-4">
      {loading ? (
        <div aria-busy="true">
          <span className="sr-only" role="status">
            Carregando mais publicações
          </span>
          <FeedCardSkeleton />
        </div>
      ) : null}
      {failed ? (
        <p className="text-center text-sm text-ui-ink-2" role="status">
          Não foi possível carregar mais publicações.
        </p>
      ) : null}
      <div className="flex justify-center">
        <Button onClick={onLoad} disabled={loading}>
          {failed ? "Tentar de novo" : loading ? "Carregando…" : "Carregar mais"}
        </Button>
      </div>
    </div>
  )
}
