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

// Mirrors a group card: title row + visibility badge + description + action buttons.
export function GroupCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando grupo"
      className="flex flex-col gap-3 rounded-lg border border-border p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-3 w-3/4" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>
    </div>
  )
}

// Mirrors an event card: title + cancelled badge + description + date + venue + RSVP + buttons.
export function EventCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando evento"
      className="flex flex-col gap-2 rounded-lg border border-border p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
          <div className="mt-1 flex gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      </div>
    </div>
  )
}

// Mirrors conversation list items: small buttons with truncated name + context label.
export function ConversationListSkeleton() {
  return (
    <div role="status" aria-label="Carregando conversas" className="flex flex-col gap-1">
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-10 w-full rounded-md" />
    </div>
  )
}

// Mirrors an empty message area placeholder.
export function MessageAreaSkeleton() {
  return (
    <div role="status" aria-label="Carregando mensagens" className="flex flex-1 flex-col gap-2 p-4">
      <Skeleton className="h-8 w-3/4 self-start rounded-lg" />
      <Skeleton className="h-8 w-1/2 self-end rounded-lg" />
      <Skeleton className="h-8 w-2/3 self-start rounded-lg" />
      <Skeleton className="h-8 w-1/3 self-end rounded-lg" />
    </div>
  )
}

// Mirrors a notification row: text line + time label.
export function NotificationItemSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando notificacoes"
      className="flex flex-col gap-1 rounded-lg px-3 py-2.5"
    >
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/6" />
    </div>
  )
}
