import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// A pílula do protótipo (`shell/primitives.js`, pill): o estado da pergunta e o
// selo de "Em breve". As cores de "resolvida" são as do sucesso do Bivaque.
export function Pilula({
  children,
  tom = "neutro",
  className,
}: {
  children: ReactNode
  tom?: "neutro" | "ok"
  className?: string
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-auto rounded-lg border-transparent px-2.5 py-1 text-xs font-medium",
        tom === "ok"
          ? "bg-(--tertiary-container) text-(--on-tertiary-container)"
          : "bg-(--muted) text-(--foreground)",
        className,
      )}
    >
      {children}
    </Badge>
  )
}
