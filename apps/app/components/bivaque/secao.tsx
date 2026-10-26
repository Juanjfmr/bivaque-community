import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Seção e título de seção (inventário §7: `section` + `sectionTitle`).
 *
 * `sectionTitle` é o `<h2>` com ação de texto à direita; o protótipo escrevia
 * o mesmo bloco à mão em duas telas (`features/listings/catalog.js:37`,
 * `features/search/views.js:42`) e o inventário manda convergir — o slot
 * `acoes` é essa convergência.
 */
export function TituloDeSecao({
  children,
  acoes,
  id,
}: {
  children: ReactNode
  acoes?: ReactNode
  id?: string
}) {
  return (
    <div className="bv-titulo-de-secao flex items-center justify-between gap-3">
      <h2 id={id}>{children}</h2>
      {acoes === undefined ? null : <div className="flex shrink-0 items-center gap-2">{acoes}</div>}
    </div>
  )
}

export function Secao({
  titulo,
  acoes,
  children,
  className,
}: {
  titulo?: ReactNode
  acoes?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("mt-7 grid gap-3 md:mt-8", className)} data-secao="sim">
      {titulo === undefined ? null : <TituloDeSecao acoes={acoes}>{titulo}</TituloDeSecao>}
      {children}
    </section>
  )
}
