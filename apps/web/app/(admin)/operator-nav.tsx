"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Nav do painel do operador (RECON-049, fila nova do lote M): o item da rota
// atual recebe aria-current="page". Antes os quatro links eram indistinguíveis
// para leitor de tela e a auditoria visual acusava "0 active nav items" nas
// quatro telas de operação. A comparação é pelo pathname real, nunca por
// índice — o mesmo padrão do console do dono (owner-console-nav.tsx).

type NavItem = { href: string; label: string }

const ITEMS: NavItem[] = [
  { href: "/admissions", label: "Admissões" },
  { href: "/reports", label: "Denúncias" },
  { href: "/guide-queue", label: "Guia" },
  { href: "/arrivals", label: "Chegadas" },
]

export function OperatorNav() {
  const pathname = usePathname()

  return (
    <ul className="flex flex-wrap gap-4 text-sm">
      {ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <li key={item.href}>
            <Link
              href={item.href as Route}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-3 transition-colors duration-[var(--semantic-motion-duration-instant)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)] ${
                active
                  ? "bg-[var(--semantic-selected)] font-medium text-[var(--semantic-text-primary)]"
                  : "text-muted hover:bg-[var(--semantic-surface-hover)] hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
