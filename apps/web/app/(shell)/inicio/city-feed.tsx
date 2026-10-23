"use client"

import { Tabs } from "@heroui/react"
import { CheckCircle2 } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { isLocalityStale } from "../../../lib/locality-density"
import { createBrowserClient } from "../../../lib/supabase/client"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedPost, type FeedPostProps } from "../../components/bivaque/feed-post"
import { FeedCardSkeleton } from "../../components/bivaque/skeleton"
import { Button } from "../../components/ui/button"
import { EmptyBlock } from "../../components/ui/panel"
import { appendPage, hasMoreAfter } from "../community/feed-pages"
import { createRequestGuard, loadCityFeed, loadFollowedFeed } from "./home-loaders"

// O feed da cidade no Início (lote 5, tarefa N2 — ADR-20261023, item
// "Navegação e estrutura").
//
// Antes, esta seção era uma PRÉVIA da vila (feed_community, três publicações, e
// o feed inteiro morava em /community). O protótipo coloca o feed da cidade no
// Início e tira a vista "Conversa" da Comunidade: a leitura nova
// (`public.feed_locality`, migration 20261024100000) devolve as publicações da
// cidade da pessoa SEM grupo e SEM vila, e o servidor é quem decide isso — a
// tela nunca filtra escopo por conta própria.
//
// A seção deixou de ser prévia porque não há mais outro lugar com o feed: ela
// pagina pela própria função (p_limit/p_offset) e carrega a próxima ao chegar
// no fim. As duas abas são as que a seção já tinha (RECON-049): Recentes lê a
// cidade; Acompanhando lê `feed_following`, que revalida a matriz de
// visibilidade no servidor — seguir uma publicação nunca concede leitura que a
// pessoa já não teria.
//
// Estados deliberados: carregando (esqueleto), vazio honesto (abaixo do limiar
// de densidade §3.4, "Você é dos primeiros aqui." em vez de "Nenhuma publicação
// ainda"), erro recuperável com nova tentativa, e fim de lista ("Você está em
// dia"). Consulta que falha nunca vira lista vazia.

type FeedPostRow = FeedPostProps["post"]
type FeedTabKey = "cidade" | "acompanhando"

const TABS = [
  { key: "cidade", label: "Recentes" },
  { key: "acompanhando", label: "Acompanhando" },
] as const

interface CityFeedProps {
  localityId: string
  /** Abre o compositor que já existe (montado pela página). */
  onPublish: () => void
  /** Incrementado pela página quando uma publicação é criada — recarrega o feed. */
  refreshKey: number
}

export function CityFeed({ localityId, onPublish, refreshKey }: CityFeedProps) {
  const [posts, setPosts] = useState<FeedPostRow[]>([])
  const [phase, setPhase] = useState<"loading" | "done">("loading")
  const [error, setError] = useState("")
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<FeedTabKey>("cidade")
  const [followedPosts, setFollowedPosts] = useState<FeedPostRow[]>([])
  const [followPhase, setFollowPhase] = useState<"idle" | "loading" | "done">("idle")
  const [followError, setFollowError] = useState("")
  // A cada visita à aba, os acompanhados são relidos: um "Acompanhar" novo no
  // cartão aparece sem exigir recarregar a página.
  const [followReload, setFollowReload] = useState(0)
  // Distinguir "sem número" de "cidade pequena": sem a contagem, o vazio não
  // afirma densidade que não conhecemos (DESIGN_SPEC §3.2).
  const [memberCount, setMemberCount] = useState<number | null>(null)
  const supabase = createBrowserClient()
  const guardRef = useRef(createRequestGuard())
  const followGuardRef = useRef(createRequestGuard())

  const loadFeed = useCallback(() => {
    const isCurrent = guardRef.current.begin()
    setPhase("loading")
    setError("")
    setLoadMoreError(false)
    setHasMore(false)

    void loadCityFeed(supabase, localityId, 0).then((outcome) => {
      if (!isCurrent()) return
      if (outcome.status === "error") {
        setError(outcome.message)
        setPhase("done")
        return
      }
      const rows = outcome.posts as unknown as FeedPostRow[]
      setPosts(rows)
      setHasMore(hasMoreAfter(rows.length))
      setPhase("done")
    })
  }, [localityId, supabase])

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    const isCurrent = guardRef.current.begin()
    setLoadingMore(true)
    setLoadMoreError(false)

    const outcome = await loadCityFeed(supabase, localityId, posts.length)
    if (!isCurrent()) return
    setLoadingMore(false)
    if (outcome.status === "error") {
      setLoadMoreError(true)
      return
    }
    const rows = outcome.posts as unknown as FeedPostRow[]
    setPosts((previous) => appendPage(previous, rows))
    setHasMore(hasMoreAfter(rows.length))
  }, [localityId, loadingMore, hasMore, posts.length, supabase])

  const loadFollowing = useCallback(() => {
    const isCurrent = followGuardRef.current.begin()
    setFollowPhase("loading")
    setFollowError("")

    void loadFollowedFeed(supabase).then((outcome) => {
      if (!isCurrent()) return
      if (outcome.status === "error") {
        setFollowError(outcome.message)
        setFollowPhase("done")
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: followReload só é gatilho de revisita — o efeito deve re-executar quando ele muda, mesmo sem lê-lo
  useEffect(() => {
    if (tab !== "acompanhando") return
    loadFollowing()
  }, [tab, loadFollowing, followReload])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // D51: contar apenas memberships correntes e com acesso ativo. Linhas
      // leaving/read_only inflariam o sinal de densidade §3.4 sem justificativa.
      const result = await supabase
        .from("locality_memberships")
        .select("*", { count: "exact", head: true })
        .eq("locality_id", localityId)
        .eq("kind", "current")
        .eq("access", "active")
      if (cancelled) return
      setMemberCount(result.error ? null : (result.count ?? 0))
    })()
    return () => {
      cancelled = true
    }
  }, [supabase, localityId])

  const handleHidePost = useCallback((postId: string) => {
    setHiddenPostIds((prev) => new Set(prev).add(postId))
  }, [])

  const visible = (list: FeedPostRow[]) => list.filter((post) => !hiddenPostIds.has(post.id))

  const cityListView =
    phase === "loading" ? (
      <div className="space-y-2" aria-busy="true">
        <FeedCardSkeleton />
        <FeedCardSkeleton />
      </div>
    ) : posts.length === 0 ? (
      <EmptyBlock
        title={
          isLocalityStale(memberCount) ? "Você é dos primeiros aqui." : "Nenhuma publicação ainda"
        }
        description={
          isLocalityStale(memberCount)
            ? "Esta cidade está começando. Publique algo para abrir caminho para quem chegar depois."
            : "Seja o primeiro a compartilhar algo com a sua cidade."
        }
        action={
          <Button variant="primary" onClick={onPublish}>
            Publicar
          </Button>
        }
      />
    ) : (
      visible(posts).map((post, index) => (
        <FeedPost key={post.id} post={post} index={index} onHide={handleHidePost} />
      ))
    )

  return (
    <section id="secao-cidade" aria-labelledby="na-cidade-titulo" className="scroll-mt-16">
      {/* Título e abas em linhas próprias: a 375 nada disputa a linha com o
          título (a regra que a seção já seguia como prévia da vila). */}
      <div className="flex items-center justify-between gap-3">
        <h2 id="na-cidade-titulo" className="min-w-0 text-base font-semibold text-ui-ink">
          <span className="block">Na sua cidade</span>
        </h2>
      </div>
      <div className="border-b border-ui-line">
        <Tabs
          aria-label="Feed da cidade"
          selectedKey={tab}
          onSelectionChange={(key) => setTab(key as FeedTabKey)}
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
        {tab === "acompanhando" ? (
          followError ? (
            <ErrorState message={followError} onRetry={() => setFollowReload((prev) => prev + 1)} />
          ) : followPhase !== "done" ? (
            <div className="space-y-2" aria-busy="true">
              <FeedCardSkeleton />
              <FeedCardSkeleton />
            </div>
          ) : followedPosts.length === 0 ? (
            <EmptyBlock
              title="Você ainda não acompanha publicações"
              description='Toque em "Acompanhar" em uma publicação para acompanhar as respostas por aqui.'
            />
          ) : (
            visible(followedPosts).map((post, index) => (
              <FeedPost key={post.id} post={post} index={index} onHide={handleHidePost} />
            ))
          )
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadFeed()} />
        ) : (
          cityListView
        )}

        {tab === "cidade" && phase === "done" && !error && posts.length > 0 ? (
          hasMore ? (
            <LoadMore loading={loadingMore} failed={loadMoreError} onLoad={() => void loadMore()} />
          ) : (
            <p className="flex items-center justify-center gap-2 py-6 text-sm text-ui-ink-2">
              <CheckCircle2 size={16} className="text-ui-brand" aria-hidden="true" />
              Você está em dia
            </p>
          )
        ) : null}
      </div>
    </section>
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
