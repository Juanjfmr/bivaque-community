"use client"

// Prévia "Como sua publicação será vista" (prancha 45). Componente
// apresentacional: tudo chega por props, já resolvido de consulta real — o
// painel repete o público escolhido e mostra exatamente o texto que a pessoa
// escreveu. Nada aqui inventa autor, cidade ou conteúdo.

import { MemberAvatar } from "./avatar"
import { type AudienceDestination, DestinationIcon } from "./feed-post-audience"
import { Skeleton } from "./skeleton"

interface PostPreviewProps {
  destination: AudienceDestination | null
  destinationLoading: boolean
  authorName: string | null
  authorLoading: boolean
  /** texto principal ao vivo, já composto como será publicado */
  content: string
  /** nome do lugar de visibilidade: cidade, comunidade ou grupo real */
  placeName: string | null
}

export function PostPreview({
  destination,
  destinationLoading,
  authorName,
  authorLoading,
  content,
  placeName,
}: PostPreviewProps) {
  return (
    <aside
      aria-label="Como sua publicação será vista"
      className="rounded-2xl border border-border bg-[var(--semantic-surface)] p-4"
    >
      <p className="text-sm font-semibold">Como sua publicação será vista</p>

      <div className="mt-3 flex items-start gap-2">
        {destinationLoading ? (
          <>
            <Skeleton className="h-9 w-9 rounded-lg" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </>
        ) : destination ? (
          <>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]">
              <DestinationIcon kind={destination.kind} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{destination.name}</p>
              <p className="truncate text-xs text-muted">{destination.description}</p>
            </div>
          </>
        ) : (
          <p className="text-xs text-muted">Destino indisponível.</p>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
        {authorLoading ? (
          <>
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-3.5 w-1/3" />
          </>
        ) : (
          <>
            <MemberAvatar name={authorName ?? "?"} className="h-8 w-8 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{authorName ?? "Você"}</p>
              <p className="text-xs text-muted">Agora mesmo</p>
            </div>
          </>
        )}
      </div>

      <div className="mt-3 min-h-16 rounded-lg bg-[var(--semantic-surface-sunken)] p-3">
        {content.trim() ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{content}</p>
        ) : (
          <p className="text-xs text-muted">O que você escrever aparece aqui.</p>
        )}
      </div>

      <p aria-live="polite" className="mt-3 text-xs text-[var(--semantic-action-primary)]">
        {placeName
          ? `Visível para membros do Bivaque em ${placeName}.`
          : "Escolha quem pode ver para saber o alcance."}
      </p>
    </aside>
  )
}
