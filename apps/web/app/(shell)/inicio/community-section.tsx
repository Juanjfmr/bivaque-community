"use client"

import { Button, Tabs } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedPost, type FeedPostProps } from "../../components/bivaque/feed-post"
import { FeedCardSkeleton } from "../../components/bivaque/skeleton"
import { createRequestGuard, loadCommunityFeed, type PrimaryCommunity } from "./home-loaders"

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
// REQUISITO PENDENTE (correção da coordenação, 08/09/2026): a aba
// "Acompanhando" saiu do runtime porque não existe mecanismo de
// acompanhamento no backend (nenhuma tabela/RPC), e exibí-la sempre vazia sem
// consulta era uma mentira. Ela só volta junto da integração real; restaurá-la
// com vazio inventado continua proibido.

// Re-exportado do módulo de carga: a página importa o tipo daqui, caminho que
// existia antes do extrato e foi preservado.
export type { PrimaryCommunity }

type FeedPostRow = FeedPostProps["post"]

const TABS = [{ key: "recentes", label: "Recentes" }] as const

interface CommunitySectionProps {
  primary: PrimaryCommunity
  onRetryPrimary: () => void
  onPublish: () => void
  // Incrementado pela página quando uma publicação é criada — recarrega o feed.
  refreshKey: number
}

export function CommunitySection({
  primary,
  onRetryPrimary,
  onPublish,
  refreshKey,
}: CommunitySectionProps) {
  const [posts, setPosts] = useState<FeedPostRow[]>([])
  // "idle" cobre o frame entre a comunidade ficar pronta e o efeito disparar:
  // sem ele, o EmptyState piscaria antes do skeleton numa comunidade com posts.
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle")
  const [error, setError] = useState("")
  const [hiddenPostIds, setHiddenPostIds] = useState<Set<string>>(new Set())
  const router = useRouter()
  const supabase = createBrowserClient()
  const guardRef = useRef(createRequestGuard())

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey é gatilho de nível página — o efeito deve re-executar quando ele muda, mesmo sem lê-lo
  useEffect(() => {
    loadFeed()
  }, [loadFeed, refreshKey])

  const handleHidePost = useCallback((postId: string) => {
    setHiddenPostIds((prev) => new Set(prev).add(postId))
  }, [])

  return (
    <section aria-labelledby="na-comunidade-titulo">
      <div className="flex items-center justify-between gap-3">
        <h2 id="na-comunidade-titulo" className="text-lg font-semibold tracking-tight">
          Na comunidade
        </h2>
        <Tabs aria-label="Conteúdo da comunidade" selectedKey="recentes" className="tabs--secondary">
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
        ) : error ? (
          <ErrorState message={error} onRetry={() => loadFeed()} />
        ) : phase !== "done" ? (
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
            .map((post, index) => (
              <FeedPost key={post.id} post={post} index={index} onHide={handleHidePost} />
            ))
        )}
      </div>
    </section>
  )
}
