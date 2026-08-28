import type { ReactNode } from "react"

interface EmptyStateProps {
  title: string
  description?: string
  /** Artwork from ./illustrations. Decorative — the title carries the meaning. */
  illustration?: ReactNode
  /** Primary recovery action. An empty state without one is a dead end. */
  action?: ReactNode
  /** Quieter escape hatch beside the primary action (e.g. "limpar filtros"). */
  secondaryAction?: ReactNode
  /** Last line, smaller: the rule that explains *why* it is empty. */
  hint?: string
  className?: string
}

// A real empty state: artwork, a headline set like a headline, one sentence of
// explanation at a readable measure, and a way out.
//
// The previous version was a dashed-border box with 14px semibold text and an
// optional CTA — the placeholder look that reads as "this screen is unfinished"
// rather than "there is genuinely nothing here yet". VISUAL_GUIDE §0 already
// forbade the dashed box; it was still the component's own default.
//
// The container is now the same paper surface as real content, so an empty
// region sits in the page instead of punching a hole in it.
export function EmptyState({
  title,
  description,
  illustration,
  action,
  secondaryAction,
  hint,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`rounded-[var(--radius)] border border-border bg-[var(--surface-raised)] px-6 py-12 text-center ${className}`}
    >
      <div className="mx-auto flex max-w-md flex-col items-center">
        {illustration && <div className="mb-5">{illustration}</div>}
        <h3 className="font-serif text-[var(--text-xl)] font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="mt-2 text-pretty text-sm leading-relaxed text-muted">{description}</p>
        )}
        {(action || secondaryAction) && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {action}
            {secondaryAction}
          </div>
        )}
        {hint && (
          <p className="mt-5 border-t border-border pt-4 text-xs leading-relaxed text-muted">
            {hint}
          </p>
        )}
      </div>
    </div>
  )
}
