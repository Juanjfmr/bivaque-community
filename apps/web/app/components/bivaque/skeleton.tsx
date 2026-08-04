import { Skeleton as HeroSkeleton } from "@heroui/react"

interface SkeletonProps {
  className?: string
}

// Token-driven loading placeholder. Base fill is --surface-sunken with a
// shimmer sweep (DESIGN_SPEC §2). Skeletons must mirror the real component's
// box so nothing reflows on load — pass the same width/height classes used
// by the loaded element.
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <HeroSkeleton animationType="shimmer" className={`bg-[var(--surface-sunken)] ${className}`} />
  )
}

// Skeleton for one feed post card — mirrors the real card's box so nothing
// reflows when the post loads (DESIGN_SPEC §2).
export function FeedCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando publicacoes"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-[var(--surface-raised)] p-4"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="mt-1 flex gap-6">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  )
}
