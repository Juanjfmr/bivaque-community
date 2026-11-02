import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"
import { Icone } from "./icone"

// O estado vazio do protótipo (`shell/primitives.js`, empty + EMPTY_ART): a
// ilustração leve em volta do ícone, sem imagem nova. O texto e a ação quem diz.
export function EstadoVazio({
  titulo,
  texto,
  glifo,
  children,
}: {
  titulo: string
  texto: string
  glifo: LucideIcon
  children?: ReactNode
}) {
  return (
    <div className="grid justify-items-center gap-3 rounded-2xl bg-(--surface-lowest) px-5 py-8 text-center">
      <div className="relative grid size-33 place-items-center">
        <svg
          viewBox="0 0 132 112"
          aria-hidden="true"
          focusable="false"
          className="absolute inset-0 size-full"
        >
          <path
            fill="var(--secondary-container)"
            d="M66 6c22 0 44 10 52 30s4 44-12 58-42 20-64 12S8 80 10 56 26 14 46 8c7-2 13-2 20-2z"
          />
          <circle
            cx="66"
            cy="56"
            r="47"
            fill="none"
            stroke="var(--outline-variant)"
            strokeWidth="1.5"
            strokeDasharray="3 6"
          />
        </svg>
        <span className="bv-empty-float relative grid size-15 place-items-center rounded-full bg-(--surface-lowest) shadow-[0_6px_18px_var(--shadow-soft)]">
          <Icone glifo={glifo} className="size-7.5 text-(--primary)" />
        </span>
        <i className="bv-empty-twinkle absolute top-5.5 left-3.5 size-2.5 rounded-full bg-(--tertiary-container)" />
        <i className="bv-empty-twinkle absolute top-3.5 right-4 size-2 rounded-full bg-(--primary) [animation-delay:0.8s]" />
        <i className="bv-empty-twinkle absolute right-2.5 bottom-5 size-3 rounded-full bg-(--on-primary-container) [animation-delay:1.6s]" />
      </div>
      <h3>{titulo}</h3>
      <p className="max-w-md text-sm text-(--muted-foreground)">{texto}</p>
      {children}
    </div>
  )
}
