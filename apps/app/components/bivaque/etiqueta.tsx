import type { ReactNode } from "react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Icone } from "./icone"

/**
 * A etiqueta (inventário §7, `shell/primitives.js`: `pill`).
 *
 * Tons usados no protótipo: `ok` (resolvida), `aviso` (vencida, indisponível),
 * `patrocinado` (negócio patrocinado), `info` (selo verificado) e o neutro.
 */
export type TomDaEtiqueta = "neutro" | "ok" | "aviso" | "patrocinado" | "info"

const TONS: Record<TomDaEtiqueta, string> = {
  neutro: "bg-(--muted) text-(--foreground)",
  ok: "bg-(--tertiary-container) text-(--on-tertiary-container)",
  aviso: "bg-(--secondary-container) text-(--on-secondary-container)",
  patrocinado: "bg-(--primary) text-(--primary-foreground)",
  info: "bg-(--surface-high) text-(--on-surface-variant)",
}

export function Etiqueta({
  children,
  tom = "neutro",
  icone,
  className,
}: {
  children: ReactNode
  tom?: TomDaEtiqueta
  icone?: React.ComponentProps<typeof Icone>["nome"]
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      data-tom={tom}
      className={cn(
        "h-auto gap-1 rounded-lg border-transparent px-2.5 py-1 text-xs font-medium",
        TONS[tom],
        className,
      )}
    >
      {icone === undefined ? null : <Icone nome={icone} className="size-4" />}
      {children}
    </Badge>
  )
}
