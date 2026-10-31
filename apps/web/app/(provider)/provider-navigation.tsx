"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { activeProviderNavId, PROVIDER_NAV_ENTRIES } from "./provider-nav"

// FIGMA-001 — reparos finais (despacho Codex 06/10/2026): a navegação do painel
// do prestador com exatamente UM aria-current por pathname — a regra pura mora
// em provider-nav.ts (o thread /prestador/conversas/<id> ativa Conversas) — e
// estados active/focus/hover visíveis com transição de 120ms, desligada sob
// prefers-reduced-motion. A linguagem visual é a do shell do membro
// (.navLink/.navLinkActive do app-shell.module.css) expressa nos papéis
// semânticos shell-* dos tokens canônicos — nenhum hex local.

export function ProviderNavigation() {
  const pathname = usePathname()
  const activeId = activeProviderNavId(pathname)

  return (
    <nav aria-label="Painel do prestador" className="border-b border-border bg-surface px-6 py-3">
      <ul className="flex flex-wrap gap-4 text-sm">
        {PROVIDER_NAV_ENTRIES.map((entry) => {
          const active = entry.id === activeId
          return (
            <li key={entry.id}>
              <Link
                href={entry.href}
                aria-current={active ? "page" : undefined}
                className={[
                  // Geometria e alvo 44px herdados da nav anterior do layout.
                  "inline-flex min-h-11 items-center rounded-md px-3 font-semibold no-underline",
                  // 120ms visíveis; reduced motion corta a transição, não o estado.
                  "transition-[background-color,color] duration-[120ms] ease-out motion-reduce:transition-none",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--semantic-shell-action)]",
                  active
                    ? "bg-[var(--semantic-shell-brand-subtle)] font-normal text-[var(--semantic-shell-action)]"
                    : "text-[var(--semantic-shell-text-secondary)] hover:bg-[var(--semantic-shell-canvas)] hover:text-[var(--semantic-shell-text-primary)]",
                ].join(" ")}
              >
                {entry.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
