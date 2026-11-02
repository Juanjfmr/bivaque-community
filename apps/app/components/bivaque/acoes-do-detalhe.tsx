import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * A barra de ações do detalhe (inventário §7: `actionsBar`).
 *
 * É um *slot* de tela, não um botão: fixo no rodapé do celular e à direita no
 * desktop, com as ações de quem está abrindo a tela (anúncio, negócio, evento,
 * grupo e conversa, no protótipo).
 */
export function AcoesDoDetalhe({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      data-acoes="detalhe"
      className={cn(
        "flex flex-wrap items-center gap-2 border-t border-(--outline-variant) bg-(--surface-low) px-4 py-3",
        "md:justify-end",
        className,
      )}
    >
      {children}
    </div>
  )
}
