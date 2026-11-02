import type { ReactNode } from "react"

import { cn } from "@/lib/utils"
import { Icone } from "./icone"

/**
 * As quatro semânticas de chip do inventário §7 (linha `chip` / `pill`): a
 * etiqueta estática é a `Etiqueta`; aqui ficam o filtro, a comodidade e a
 * sugestão. O filtro selecionável é a `ChipsDeFiltro` — este arquivo cobre o
 * que não é filtro.
 */

/** Comodidade marcada no detalhe do imóvel (`attributes.js:20`). */
export function ChipDeAjuda({ children }: { children: ReactNode }) {
  return (
    <span
      data-chip="ajuda"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-(--outline-variant) px-3 text-sm"
    >
      <Icone nome="check" className="size-4 text-(--primary)" />
      {children}
    </span>
  )
}

/** Resposta rápida da conversa (`messaging/views.js:17`). */
export function ChipDeSugestao({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      data-chip="sugestao"
      className={cn("min-h-11 rounded-xl bg-(--secondary-container) px-4 text-sm font-medium")}
      {...props}
    >
      {children}
    </button>
  )
}
