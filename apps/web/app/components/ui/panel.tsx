import type { ReactNode } from "react"

// A única superfície do sistema. Com `title`, ganha cabeçalho separado por
// linha — o mesmo desenho em todo lugar, para o olho aprender uma vez.
interface PanelProps {
  title?: ReactNode
  action?: ReactNode
  titleId?: string
  className?: string
  bodyClassName?: string
  children: ReactNode
}

export function Panel({
  title,
  action,
  titleId,
  className = "",
  bodyClassName = "p-4",
  children,
}: PanelProps) {
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={`rounded-ui-lg border border-ui-line bg-ui-surface shadow-ui ${className}`}
    >
      {title ? (
        <header className="flex min-h-14 items-center justify-between gap-3 border-b border-ui-line px-5">
          <h2 id={titleId} className="text-sm font-semibold text-ui-ink">
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

// Estado vazio: sem ilustração, sem borda tracejada. Uma frase que diz o que
// falta, uma que diz o que fazer, e a ação.
export function EmptyBlock({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-ui-lg border border-ui-line bg-ui-surface px-4 py-10 text-center shadow-ui sm:px-8">
      <p className="text-base font-semibold text-ui-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ui-ink-2">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

// Rótulo de seção em caixa alta, como os cabeçalhos de indicador do painel.
export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="text-xs font-semibold tracking-wide text-ui-ink-2 uppercase">{children}</p>
}
