"use client"

import { Link } from "@heroui/react"
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
        message="Não foi possível carregar esta página."
        {...(onRetry === undefined ? {} : { onRetry })}
      />
    </div>
  )
}

export function SegmentNotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <EmptyState
        title="Página não encontrada"
        description="O endereço que você acessou não existe."
        action={
          <Link
            href="/inicio"
            className="inline-flex min-h-11 min-w-11 items-center justify-center text-sm font-medium underline"
          >
            Voltar para o início
          </Link>
        }
      />
    </div>
  )
}
