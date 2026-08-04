import { EmptyState as HeroEmptyState } from "@heroui/react"
import type { ReactNode } from "react"

interface EmptyStateProps {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

// Token-driven empty state. Inset area uses --surface-sunken; text uses
// --muted. Optional action (e.g. a composer CTA) renders below the copy.
export function EmptyState({ title, description, action, className = "" }: EmptyStateProps) {
  return (
    <HeroEmptyState
      className={`rounded-2xl border border-dashed border-border bg-[var(--surface-sunken)] px-6 py-10 text-center ${className}`}
    >
      <div className="mx-auto flex max-w-sm flex-col items-center gap-2">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="text-sm text-muted">{description}</p>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </HeroEmptyState>
  )
}
