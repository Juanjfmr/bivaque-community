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
// role="status" announces the empty state politely (DESIGN_SYSTEM §9.2): a
// true empty is a fact of the screen, not a failure, so it never uses an
// assertive live region. A failed query must render ErrorState instead —
// never this component with a swallowed error.
export function EmptyState({
  title,
  description,
  illustration,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={`rounded-2xl border border-dashed border-border bg-[var(--semantic-surface-sunken)] px-6 py-10 text-center ${className}`}
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

interface AccessUnavailableStateProps {
  title: string
  description?: string
  icon?: ReactNode
  primaryAction?: ReactNode
  secondaryAction?: ReactNode
  className?: string
}

// Prancha 60 (painel esquerdo): a pessoa não é membro ou não tem permissão.
// Isto NÃO é falha de conexão — recarregar não muda autorização, então não há
// "tentar novamente" aqui: seria cruel e mentiroso. O estado diz o que
// aconteceu e, quando existe, qual é o caminho legítimo (primaryAction).
// Anunciado polite (role="status"): é um fato da tela, não uma urgência.
export function AccessUnavailableState({
  title,
  description,
  icon,
  primaryAction,
  secondaryAction,
  className = "",
}: AccessUnavailableStateProps) {
  return (
    <div
      role="status"
      className={`flex flex-col items-center gap-4 px-6 py-12 text-center ${className}`}
    >
      {icon && (
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]"
        >
          {icon}
        </span>
      )}
      <div className="flex max-w-md flex-col items-center gap-2">
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="text-sm leading-relaxed text-muted">{description}</p>}
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="mt-2 flex w-full max-w-xs flex-col items-stretch gap-2">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
