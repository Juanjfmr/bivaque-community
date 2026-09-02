import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

// Sticky screen header rendering exactly one h1 (the audit requires a single
// h1 and no skipped levels). Actions (e.g. "Publicar") sit on the right.
export function PageHeader({ title, description, actions, className = "" }: PageHeaderProps) {
  return (
    <div
      className={`sticky top-12 z-30 border-b border-border bg-[var(--semantic-surface)] ${className}`}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {description && <p className="mt-0.5 truncate text-xs text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
