import { Skeleton as HeroSkeleton } from "@heroui/react"

interface SkeletonProps {
  className?: string
}

// Loading placeholder.
//
// The fill is the sunken paper rather than a grey wash, so a loading region
// belongs to the same page as the content that replaces it. Shapes below mirror
// the real component's box — DS-026: loading geometry approximates the region it
// replaces, so nothing reflows and no target moves under the user's finger.
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <HeroSkeleton animationType="shimmer" className={`bg-[var(--surface-sunken)] ${className}`} />
  )
}

// A run of text lines with a short last line, the way a paragraph actually ends.
// Uniform-width bars are the tell of a placeholder that was never looked at.
function TextLines({ widths }: { widths: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      {widths.map((width, index) => (
        <Skeleton
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length decorative run, never reordered
          key={index}
          className={`h-3.5 rounded-[var(--radius-sm)] ${width}`}
        />
      ))}
    </div>
  )
}

// Mirrors one feed post: avatar, author line, body, and the action row.
export function FeedCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando publicações"
      className="flex flex-col gap-4 bg-[var(--surface-raised)] px-4 py-5"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-40 rounded-[var(--radius-sm)]" />
          <Skeleton className="h-3 w-28 rounded-[var(--radius-sm)]" />
        </div>
      </div>
      <TextLines widths={["w-full", "w-full", "w-4/5", "w-2/5"]} />
      <div className="flex gap-6 pt-1">
        <Skeleton className="h-7 w-14 rounded-full" />
        <Skeleton className="h-7 w-14 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
    </div>
  )
}

// Mirrors a group row: thumbnail, name + member count, join control.
export function GroupCardSkeleton() {
  return (
    <div role="status" aria-label="Carregando grupo" className="flex items-center gap-4 px-4 py-4">
      <Skeleton className="h-12 w-12 shrink-0 rounded-[var(--radius)]" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-44 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-3 w-24 rounded-[var(--radius-sm)]" />
      </div>
      <Skeleton className="h-11 w-24 shrink-0 rounded-full" />
    </div>
  )
}

// Mirrors an event row: the square date block, title, venue line, RSVP control.
export function EventCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando evento"
      className="flex items-start gap-4 rounded-[var(--radius)] border border-border px-4 py-4"
    >
      <Skeleton className="h-14 w-14 shrink-0 rounded-[var(--radius)]" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-56 rounded-[var(--radius-sm)]" />
        <Skeleton className="h-3 w-40 rounded-[var(--radius-sm)]" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-[var(--radius-sm)]" />
        </div>
      </div>
      <Skeleton className="h-11 w-28 shrink-0 rounded-full" />
    </div>
  )
}

// Mirrors conversation list rows: avatar, name + preview, timestamp.
export function ConversationListSkeleton() {
  return (
    <div role="status" aria-label="Carregando conversas" className="flex flex-col">
      {["a", "b", "c", "d"].map((key) => (
        <div key={key} className="flex items-center gap-3 border-b border-border px-3 py-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-32 rounded-[var(--radius-sm)]" />
            <Skeleton className="h-3 w-full rounded-[var(--radius-sm)]" />
          </div>
          <Skeleton className="h-3 w-10 shrink-0 rounded-[var(--radius-sm)]" />
        </div>
      ))}
    </div>
  )
}

// Mirrors a thread: alternating bubbles, uneven lengths, own messages right.
export function MessageAreaSkeleton() {
  return (
    <div role="status" aria-label="Carregando mensagens" className="flex flex-1 flex-col gap-3 p-4">
      <Skeleton className="h-10 w-3/5 self-start rounded-[var(--radius-lg)]" />
      <Skeleton className="h-8 w-2/5 self-end rounded-[var(--radius-lg)]" />
      <Skeleton className="h-16 w-4/5 self-start rounded-[var(--radius-lg)]" />
      <Skeleton className="h-8 w-1/3 self-end rounded-[var(--radius-lg)]" />
      <Skeleton className="h-10 w-1/2 self-end rounded-[var(--radius-lg)]" />
    </div>
  )
}

// Mirrors a notification row: unread marker, text line, timestamp.
export function NotificationItemSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando notificações"
      className="flex items-start gap-3 px-4 py-3.5"
    >
      <Skeleton className="mt-1 h-2 w-2 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-full rounded-[var(--radius-sm)]" />
        <Skeleton className="h-3 w-16 rounded-[var(--radius-sm)]" />
      </div>
    </div>
  )
}
