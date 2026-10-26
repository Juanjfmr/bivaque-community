import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * A grade de cartões (inventário §7: `card-grid`): 1 coluna abaixo de 480 px,
 * 2 até 720, 3 até 1200 e 4 daí para cima — as mesmas faixas de
 * `styles/base.css:27-30`.
 */
export function Grade({
  children,
  formato = "cartoes",
  className,
}: {
  children: ReactNode
  formato?: "cartoes" | "lista" | "pilha"
  className?: string
}) {
  const formatos = {
    cartoes: "bv-grade",
    lista: "grid gap-2",
    pilha: "grid gap-3",
  } as const
  return (
    <div data-grade={formato} className={cn(formatos[formato], className)}>
      {children}
    </div>
  )
}
