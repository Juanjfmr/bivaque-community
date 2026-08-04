"use client"

import Link from "next/link"
import { EmptyState } from "./empty-state"
import { ErrorState } from "./error-state"
import { FeedCardSkeleton } from "./skeleton"

// Segment-level fallbacks (DESIGN_SPEC §2 "Route change"). Mounted by each
// segment's loading.tsx / error.tsx / not-found.tsx so route transitions never
// show a blank screen or a bare spinner.

export function SegmentLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 px-4 py-4" aria-busy="true">
      <FeedCardSkeleton />
      <FeedCardSkeleton />
      <FeedCardSkeleton />
    </div>
  )
}

export function SegmentError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <ErrorState
        message="Nao foi possivel carregar esta pagina. Tente novamente em instantes."
        {...(onRetry === undefined ? {} : { onRetry })}
      />
    </div>
  )
}

export function SegmentNotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <EmptyState
        title="Pagina nao encontrada"
        description="O endereco que voce acessou nao existe nesta comunidade."
        action={
          <Link href="/community" className="text-sm font-medium text-accent underline">
            Voltar para a comunidade
          </Link>
        }
      />
    </div>
  )
}
