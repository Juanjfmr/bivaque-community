"use client"

import { BookOpen, ChevronRight, MessageCircleQuestion } from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { relativeTime } from "../../../lib/listings/catalog"
import { Skeleton } from "../../components/bivaque/skeleton"
import {
  formatCount,
  type HubGuideEntry,
  type HubQuestions,
  type Loaded,
  type WithTimes,
} from "./hub-loaders"
import { HubError, HubSection } from "./hub-section"

// Duas seções de lista curta, lado a lado no desktop e empilhadas no telefone:
// perguntas da cidade ainda sem resposta (o convite a ajudar) e o que entrou no
// Guia por último. Linhas com borda, não cards dentro de card.

function ListSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true">
      <Skeleton className="h-12 w-full rounded-ui" />
      <Skeleton className="h-12 w-full rounded-ui" />
    </div>
  )
}

function Row({ href, title, meta }: { href: string; title: string; meta: string }) {
  return (
    <li>
      <Link
        href={href as Route}
        className="-mx-2 flex min-h-11 items-center gap-3 rounded-ui px-2 py-2 transition-colors hover:bg-ui-subtle"
      >
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-sm font-medium text-ui-ink">{title}</span>
          <span className="block text-xs text-ui-ink-2">{meta}</span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-ui-ink-2" aria-hidden="true" />
      </Link>
    </li>
  )
}

export function OpenQuestions({
  state,
  onRetry,
  badge,
}: {
  state: Loaded<HubQuestions>
  onRetry: () => void
  badge: string | null
}) {
  if (state.status === "ready" && state.data.items.length === 0) return null
  // Com selo de novidade, o total sai do título: os dois não cabem juntos a 375,
  // e o total continua no atalho Perguntas.
  const title =
    !badge && state.status === "ready" && state.data.count > 0
      ? `Perguntas abertas · ${formatCount(state.data.count)}`
      : "Perguntas abertas"
  return (
    <HubSection
      id="secao-perguntas"
      title={title}
      icon={MessageCircleQuestion}
      href="/recommendations"
      badge={badge}
    >
      {state.status === "loading" ? (
        <ListSkeleton />
      ) : state.status === "error" ? (
        <div className="-mx-4 sm:-mx-5">
          <HubError what="as perguntas" onRetry={onRetry} />
        </div>
      ) : (
        <ul className="divide-y divide-ui-line">
          {state.data.items.map((question) => (
            <Row
              key={question.id}
              href={`/recommendations?focus=${question.id}#req-${question.id}`}
              title={question.title}
              meta={`${relativeTime(question.createdAt)} · Você pode ajudar`}
            />
          ))}
        </ul>
      )}
    </HubSection>
  )
}

export function GuideNews({
  state,
  onRetry,
  badge,
  consult = false,
}: {
  state: Loaded<WithTimes<HubGuideEntry>>
  onRetry: () => void
  badge: string | null
  /** Consulta a outra cidade: o título diz "Guia", e o "Ver Guia" (da sua cidade) sai. */
  consult?: boolean
}) {
  if (state.status === "ready" && state.data.items.length === 0) return null
  return (
    <HubSection
      id="secao-guia"
      title={consult ? "Guia da cidade" : "Novo no Guia"}
      icon={BookOpen}
      href={consult ? null : "/guide"}
      linkLabel="Ver Guia"
      badge={badge}
    >
      {state.status === "loading" ? (
        <ListSkeleton />
      ) : state.status === "error" ? (
        <div className="-mx-4 sm:-mx-5">
          <HubError what="o Guia" onRetry={onRetry} />
        </div>
      ) : (
        <ul className="divide-y divide-ui-line">
          {state.data.items.map((entry) => (
            <Row
              key={entry.id}
              href={`/guide/${entry.id}`}
              title={entry.name}
              meta={entry.categoryLabel}
            />
          ))}
        </ul>
      )}
    </HubSection>
  )
}
