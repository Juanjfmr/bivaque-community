"use client"

import { Button, Chip } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import {
  hasUsefulRecommendationQuery,
  type RankedRecommendationCandidate,
  type RecommendationSimilarityCandidate,
  rankSimilarRecommendationRequests,
} from "../../../lib/recommendation-similarity"
import { createBrowserClient } from "../../../lib/supabase/client"
import { FeedbackAlert } from "./feedback-alert"
import { Skeleton } from "./skeleton"

type RecommendationCategory =
  | "servicos_locais"
  | "saude_bem_estar"
  | "educacao"
  | "esporte_lazer"
  | "alimentacao"
  | "transporte"
  | "moradia"
  | "outros"

type Props = {
  category: RecommendationCategory | ""
  scope: "locality" | string
  title: string
  body: string
  onMatchStateChange?: (hasMatches: boolean) => void
}

export function RecommendationConvergence({
  category,
  scope,
  title,
  body,
  onMatchStateChange,
}: Props) {
  const { current } = useLocalityContext()
  const router = useRouter()
  const supabase = useMemo(() => createBrowserClient(), [])
  const [matches, setMatches] = useState<RankedRecommendationCandidate[]>([])
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [followingId, setFollowingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!category || !hasUsefulRecommendationQuery(title, body)) {
      setMatches([])
      setLoading(false)
      onMatchStateChange?.(false)
      return
    }

    const timer = window.setTimeout(async () => {
      setLoading(true)
      setFeedback("")

      const scopeIsGroup = scope !== "locality"
      let requestQuery = supabase
        .from("recommendation_requests")
        .select("id, title, body, category, locality_id, group_id, created_at, is_resolved")
        .eq("category", category)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(40)

      requestQuery = scopeIsGroup
        ? requestQuery.eq("group_id", scope).is("locality_id", null)
        : requestQuery.eq("locality_id", current.id).is("group_id", null)

      const { data, error } = await requestQuery
      if (cancelled) return

      if (error) {
        // Similarity is an assistive affordance, never a gate to publishing.
        setMatches([])
        setLoading(false)
        onMatchStateChange?.(false)
        return
      }

      const candidates = (data as RecommendationSimilarityCandidate[] | null) ?? []
      const ranked = rankSimilarRecommendationRequests(
        {
          category,
          locality_id: scopeIsGroup ? null : current.id,
          group_id: scopeIsGroup ? scope : null,
          title,
          body,
        },
        candidates,
      )
      setMatches(ranked)
      onMatchStateChange?.(ranked.length > 0)

      if (ranked.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (cancelled || !user) {
          setLoading(false)
          return
        }

        const ids = ranked.map((match) => match.id)
        const { data: saved } = await supabase
          .from("recommendation_saves")
          .select("request_id")
          .eq("user_id", user.id)
          .in("request_id", ids)

        if (!cancelled) {
          setSavedIds(
            new Set((saved as { request_id: string }[] | null)?.map((item) => item.request_id)),
          )
        }
      } else {
        setSavedIds(new Set())
      }

      if (!cancelled) setLoading(false)
    }, 400)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [supabase, current.id, category, scope, title, body, onMatchStateChange])

  async function followRequest(requestId: string) {
    if (savedIds.has(requestId)) {
      setFeedback("Você já está acompanhando este pedido.")
      return
    }

    setFollowingId(requestId)
    setFeedback("")

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setFollowingId(null)
      setFeedback("Entre novamente para acompanhar este pedido.")
      return
    }

    const { error } = await supabase.from("recommendation_saves").insert({
      user_id: user.id,
      request_id: requestId,
    })

    setFollowingId(null)
    if (error) {
      setFeedback(
        "Não foi possível acompanhar agora. O seu pedido ainda pode ser publicado normalmente.",
      )
      return
    }

    setSavedIds((previous) => new Set(previous).add(requestId))
    setFeedback("Pedido acompanhado. Novas respostas ficam concentradas no tópico existente.")
  }

  if (!category || !hasUsefulRecommendationQuery(title, body)) return null

  if (loading && matches.length === 0) {
    return (
      <div
        role="status"
        className="flex flex-col gap-2"
        aria-label="Procurando pedidos parecidos"
        aria-busy="true"
      >
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (matches.length === 0) return null

  return (
    <section
      aria-labelledby="similar-requests-heading"
      className="flex flex-col gap-3 rounded-xl border border-border bg-[var(--surface-subtle)] p-4"
    >
      <div className="flex flex-col gap-1">
        <h3 id="similar-requests-heading" className="text-sm font-semibold">
          Já perguntaram algo parecido por aqui
        </h3>
        <p className="text-xs text-muted">
          Você pode aproveitar as respostas existentes e concentrar novas indicações no mesmo
          tópico.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {matches.map((match) => {
          const isSaved = savedIds.has(match.id)
          return (
            <li
              key={match.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-[var(--surface)] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                {match.is_resolved ? (
                  <Chip size="sm" variant="soft">
                    Resolvido
                  </Chip>
                ) : null}
                <span className="text-xs text-muted">
                  {Math.round(match.similarity * 100)}% parecido
                </span>
              </div>
              <p className="text-sm font-semibold">{match.title}</p>
              <p className="line-clamp-2 text-xs text-muted">{match.body}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onPress={() => router.push(`/recommendations?focus=${match.id}#req-${match.id}`)}
                >
                  Ver respostas
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="tertiary"
                  isDisabled={isSaved || followingId === match.id}
                  onPress={() => followRequest(match.id)}
                >
                  {isSaved
                    ? "Acompanhando"
                    : followingId === match.id
                      ? "Salvando..."
                      : "Acompanhar"}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="text-xs text-muted">
        Não é o mesmo caso? Continue o formulário e escolha “Perguntar mesmo assim”.
      </p>

      {feedback ? <FeedbackAlert variant="info" description={feedback} /> : null}
    </section>
  )
}
