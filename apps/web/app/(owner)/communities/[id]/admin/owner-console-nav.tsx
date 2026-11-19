"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Nav do console do dono (RECON-049, par 81): o item da rota atual recebe
// aria-current="page" — antes os três links eram indistinguíveis para leitor
// de tela e para a auditoria visual ("0 active nav items"). A comparação é
// pelo pathname real, nunca por índice.

type NavItem = { href: string; label: string }

export function OwnerConsoleNav({ communityId }: { communityId: string }) {
  const pathname = usePathname()
  // Quatro itens como a prancha 81: a fila, as imagens, o hub de
  // administração e a volta para a comunidade.
  const items: NavItem[] = [
    { href: `/communities/${communityId}/admin/pending`, label: "Pedidos de entrada" },
    { href: `/communities/${communityId}/admin/media`, label: "Imagens" },
    { href: `/communities/${communityId}/admin`, label: "Administração" },
    { href: `/communities/${communityId}`, label: "Voltar à comunidade" },
  ]

  return (
    <ul className="flex flex-wrap gap-4">
      {items.map((item) => {
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
