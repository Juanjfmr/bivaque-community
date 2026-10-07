import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  /** Slot antes do título — botão voltar, ícone da tela ou avatar. */
  leading?: ReactNode
  /**
   * `narrow` (max-w-2xl) serve formulários e leitura; `wide` (max-w-6xl) serve
   * telas de conteúdo largo. A largura era fixa em max-w-2xl, e isso prendia o
   * cabeçalho a duas telas — é a explicação do achado G-02: o esqueleto
   * compartilhado existia e não era adotável. O padrão não muda.
   */
  width?: "narrow" | "wide"
  className?: string
}

// Sticky screen header rendering exactly one h1 (the audit requires a single
// h1 and no skipped levels). Actions (e.g. "Publicar") sit on the right.
export function PageHeader({
  title,
  description,
  actions,
  leading,
  width = "narrow",
  className = "",
}: PageHeaderProps) {
  const container = width === "wide" ? "max-w-6xl" : "max-w-2xl"
  return (
    <div
      className={`sticky top-12 z-30 border-b border-border bg-[var(--semantic-surface)] ${className}`}
    >
      <div className={`mx-auto flex ${container} items-center justify-between gap-3 px-4 py-3`}>
        <div className="flex min-w-0 items-center gap-2">
          {leading}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
            {description && <p className="mt-0.5 truncate text-xs text-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
