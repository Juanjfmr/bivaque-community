import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  /** Small letterspaced label above the title — the section this screen belongs
   *  to ("Minha comunidade", "Cidade"). Decorative context, never a landmark. */
  eyebrow?: string
  actions?: ReactNode
  className?: string
}

// Screen header rendering exactly one h1 (the audit requires a single h1 and no
// skipped levels).
//
// The title is set in the serif display face at a real display size. Previously
// it was text-lg semibold in the UI sans — visually indistinguishable from the
// card titles below it, which is what made every screen open on an undifferentiated
// wall of 16-18px sans. An optional eyebrow names the section above it, so a page
// announces itself the way a publication does.
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`sticky top-12 z-30 border-b border-border bg-[var(--background)]/95 backdrop-blur-sm ${className}`}
    >
      <div className="mx-auto flex max-w-2xl items-end justify-between gap-4 px-4 py-4">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h1 className="truncate text-[var(--text-2xl)]">{title}</h1>
          {description && <p className="mt-1 truncate text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2 pb-1">{actions}</div>}
      </div>
    </div>
  )
}
