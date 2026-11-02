import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Cabeça de página (inventário §7: `page-head`).
 *
 * Dezoito telas do protótipo repetem o mesmo `<div><h1><p></div>`; as variações
 * (avatar, sem subtítulo, sem ação) são props. O `h1` carrega
 * `data-titulo-da-tela`, que é o alvo de foco da restauração por entrada.
 */
export function CabecaDePagina({
  titulo,
  subtitulo,
  acao,
  antes,
  className,
}: {
  titulo: ReactNode
  subtitulo?: ReactNode
  acao?: ReactNode
  /** O que vem antes do título: avatar ou volta, nas telas que têm. */
  antes?: ReactNode
  className?: string
}) {
  return (
    <div
      data-cabeca="pagina"
      className={cn("flex items-start justify-between gap-3 py-4", className)}
    >
      <div className="flex min-w-0 items-center gap-3">
        {antes}
        <div className="min-w-0">
          <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1}>
            {titulo}
          </h1>
          {subtitulo === undefined ? null : (
            <p className="mt-0.5 text-sm text-(--on-surface-variant)">{subtitulo}</p>
          )}
        </div>
      </div>
      {acao === undefined ? null : <div className="shrink-0">{acao}</div>}
    </div>
  )
}
