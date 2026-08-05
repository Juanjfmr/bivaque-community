import type { ReactNode } from "react"

interface EmptyStateProps {
  title: string
  description?: string
  illustration?: ReactNode
  action?: ReactNode
  className?: string
}

// Nextdoor-grade empty state: optional hand-drawn illustration, short title,
// description, and a CTA button slot. Token-driven: inset surface with dashed
// border, muted text. Use inline SVGs via the `illustration` prop for a
// hand-drawn feel — no external images needed.
export function EmptyState({
  title,
  description,
  illustration,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-2xl border border-dashed border-border bg-[var(--surface-sunken)] px-6 py-10 text-center ${className}`}
    >
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        {illustration && <div className="mb-1 opacity-80">{illustration}</div>}
        <p className="text-sm font-semibold">{title}</p>
        {description && <p className="text-sm leading-relaxed text-muted">{description}</p>}
        {action && <div className="mt-1">{action}</div>}
      </div>
    </div>
  )
}
