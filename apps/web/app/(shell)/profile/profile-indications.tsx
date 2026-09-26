"use client"

import { CheckCircle2, MessageCircle } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import {
  ASK_INDICATION_HREF,
  indicationHref,
  relativeAge,
} from "../../../lib/indications/indications"
import { log } from "../../../lib/logger"
import { createBrowserClient } from "../../../lib/supabase/client"
import { ErrorState } from "../../components/bivaque/error-state"
import { Skeleton } from "../../components/bivaque/skeleton"

// "Suas indicações" no perfil: o que a pessoa pediu e o que ela respondeu, com
// o caminho de volta para cada conversa. É a memória dela dentro da memória da
// cidade (ADR-20260925-memoria-de-indicacoes). Sem contagem, placar ou selo: a
// marca de "Ajudou a resolver" não vira reputação no perfil de ninguém
// (ADR-20260909-resposta-que-resolveu, D5, mantida pela D2 de 25/09).

const LIMIT = 5

type AskedRow = {
  id: string
  title: string
  is_resolved: boolean
  created_at: string
  replies: { count: number }[]
}

type AnsweredRow = {
  id: string
  body: string
  created_at: string
  request: { id: string; title: string; resolved_reply_id: string | null } | null
}

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "done"; asked: AskedRow[]; answered: AnsweredRow[] }

export function ProfileIndications({ userId }: { userId: string }) {
  const [state, setState] = useState<State>({ kind: "loading" })
  const [now] = useState(() => new Date())

  const load = useCallback(async () => {
    setState({ kind: "loading" })
    const supabase = createBrowserClient()
    const [askedResult, answeredResult] = await Promise.all([
      supabase
        .from("recommendation_requests")
        .select(
          "id, title, is_resolved, created_at, replies:recommendation_replies!recommendation_replies_request_id_fkey(count)",
        )
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
      supabase
        .from("recommendation_replies")
        .select(
          "id, body, created_at, request:recommendation_requests!recommendation_replies_request_id_fkey(id, title, resolved_reply_id)",
        )
        .eq("author_id", userId)
        .order("created_at", { ascending: false })
        .limit(LIMIT),
    ])
    const failure = askedResult.error ?? answeredResult.error
    if (failure) {
      log.error("profile_indications_failed", { serverMessage: failure.message })
      setState({ kind: "error" })
      return
    }
    setState({
      kind: "done",
      asked: (askedResult.data ?? []) as unknown as AskedRow[],
      answered: ((answeredResult.data ?? []) as unknown as AnsweredRow[]).filter(
        (row) => row.request !== null,
      ),
    })
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <section
      aria-labelledby="perfil-indicacoes"
      className="rounded-ui-lg bg-ui-surface p-4 shadow-ui ring-1 ring-ui-line sm:p-5"
    >
      <h2 id="perfil-indicacoes" className="text-base font-semibold text-ui-ink">
        Suas indicações
      </h2>

      {state.kind === "loading" ? (
        <div className="mt-3 space-y-2" aria-busy="true">
          <Skeleton className="h-12 w-full rounded-ui" />
          <Skeleton className="h-12 w-full rounded-ui" />
        </div>
      ) : null}

      {state.kind === "error" ? (
        <div className="mt-3">
          <ErrorState
            message="Não foi possível carregar suas indicações."
            onRetry={() => void load()}
          />
        </div>
      ) : null}

      {state.kind === "done" ? (
        <div className="mt-3 grid gap-5 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold tracking-wide text-ui-ink-2 uppercase">
              Seus pedidos
            </h3>
            {state.asked.length === 0 ? (
              <p className="mt-2 text-sm text-ui-ink-2">
                Precisa de alguém de confiança?{" "}
                <Link href={ASK_INDICATION_HREF as Route} className="font-semibold text-ui-brand">
                  Peça à cidade
                </Link>
                .
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-ui-line">
                {state.asked.map((row) => {
                  const replies = row.replies[0]?.count ?? 0
                  const status = row.is_resolved
                    ? "Resolvido"
                    : replies === 0
                      ? "Sem resposta"
                      : `${replies} ${replies === 1 ? "resposta" : "respostas"}`
                  return (
                    <li key={row.id}>
                      <Link
                        href={indicationHref(row.id) as Route}
                        className="flex min-h-11 items-center justify-between gap-3 py-2 hover:text-ui-brand"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-ui-ink">
                          {row.title}
                        </span>
                        <span
                          className={`shrink-0 text-xs font-semibold ${row.is_resolved ? "text-ui-brand" : "text-ui-ink-2"}`}
                        >
                          {status}
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-xs font-semibold tracking-wide text-ui-ink-2 uppercase">
              Suas respostas
            </h3>
            {state.answered.length === 0 ? (
              <p className="mt-2 text-sm text-ui-ink-2">
                Quando você indicar alguém, sua resposta aparece aqui.
              </p>
            ) : (
              <ul className="mt-2 divide-y divide-ui-line">
                {state.answered.map((row) => {
                  const helped = row.request?.resolved_reply_id === row.id
                  return (
                    <li key={row.id}>
                      <Link
                        href={indicationHref(row.request?.id ?? "") as Route}
                        className="flex min-h-11 items-start gap-2 py-2 hover:text-ui-brand"
                      >
                        {helped ? (
                          <CheckCircle2
                            size={16}
                            className="mt-0.5 shrink-0 text-ui-brand"
                            aria-label="Ajudou a resolver"
                          />
                        ) : (
                          <MessageCircle
                            size={16}
                            className="mt-0.5 shrink-0 text-ui-ink-2"
                            aria-hidden="true"
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ui-ink">
                            {row.request?.title}
                          </span>
                          <span className="block truncate text-xs text-ui-ink-2">
                            {relativeAge(row.created_at, now)} · {row.body}
                          </span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  )
}
