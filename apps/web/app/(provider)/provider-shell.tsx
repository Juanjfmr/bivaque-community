"use client"

import type { LucideIcon } from "lucide-react"
import {
  ChevronDown,
  ChevronRight,
  CircleUser,
  Headphones,
  Images,
  Inbox,
  Search,
  Settings,
  Store,
} from "lucide-react"
import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { ReactNode } from "react"

// Shell PRÓPRIO do prestador (prancha 23). Não é o shell do membro: aqui não
// existe navegação de comunidade, e o middleware só deixa o prestador andar em
// /prestador* — por isso Salvos e Notificações da prancha ficam de fora: suas
// rotas são do shell do membro e devolveriam o prestador para cá. Divergência
// declarada no relatório do RECON-024.

interface ProviderShellProps {
  businessName: string
  categoryLabel: string
  children: ReactNode
}

interface NavItem {
  href: string
  label: string
  Icon: LucideIcon
  isActive: (pathname: string) => boolean
}

const isExact = (href: string) => (pathname: string) => pathname === href

const NAV_ITEMS: NavItem[] = [
  {
    href: "/prestador",
    label: "Pedidos",
    Icon: Inbox,
    // "Pedidos" é dono de /prestador e de /prestador/pedidos/*, mas NÃO de
    // /prestador/ficha — um `startsWith("/prestador/")` genérico acenderia
    // Pedidos em todas as subrotas e a auditoria reprova dois itens ativos.
    isActive: (pathname) => pathname === "/prestador" || pathname.startsWith("/prestador/pedidos/"),
  },
  {
    href: "/prestador/ficha",
    label: "Minha ficha",
    Icon: Store,
    isActive: isExact("/prestador/ficha"),
  },
  {
    href: "/prestador/catalogo",
    label: "Catálogo",
    Icon: Images,
    isActive: isExact("/prestador/catalogo"),
  },
  {
    href: "/prestador/atendimento",
    label: "Área de atendimento",
    Icon: Headphones,
    isActive: isExact("/prestador/atendimento"),
  },
  {
    href: "/prestador/conta",
    label: "Conta",
    Icon: CircleUser,
    isActive: isExact("/prestador/conta"),
  },
]

function NavLinks({ compact }: Readonly<{ compact: boolean }>) {
  const pathname = usePathname()

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const active = item.isActive(pathname)
        return (
          <Link
            key={item.href}
            href={item.href as Route}
            aria-current={active ? "page" : undefined}
            className={
              compact
                ? `flex min-h-11 min-w-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]"
                      : "text-muted"
                  }`
                : `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]"
                      : "text-muted hover:bg-[var(--semantic-selected)] hover:text-foreground"
                  }`
            }
          >
            <item.Icon size={20} className="shrink-0" aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </>
  )
}

export function ProviderShell({
  businessName,
  categoryLabel,
  children,
}: Readonly<ProviderShellProps>) {
  return (
    <div className="min-h-dvh bg-[var(--semantic-canvas)]">
      <div className="flex min-h-dvh">
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-[var(--semantic-surface)]">
          <div className="px-4 py-5">
            <Link
              href="/prestador"
              className="inline-flex min-h-11 items-center text-lg font-bold uppercase tracking-wide text-[var(--semantic-action-primary)] transition-colors"
            >
              Bivaque
            </Link>
          </div>

          <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
            Meu negócio
          </p>

          <div className="mx-3 mb-3 flex items-center gap-3 rounded-lg border border-border px-3 py-2">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]"
            >
              <Store size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{businessName}</span>
              <span className="block truncate text-xs text-muted">{categoryLabel}</span>
            </span>
            <ChevronDown size={16} className="shrink-0 text-muted" aria-hidden="true" />
          </div>

          <nav aria-label="Painel do negócio" className="flex flex-col gap-1 px-3">
            <NavLinks compact={false} />
          </nav>

          <div className="flex-1" />

          <div className="border-t border-border p-3">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <span
                aria-hidden="true"
                className="grid h-8 w-8 place-items-center rounded-full bg-[var(--semantic-selected)] text-xs font-semibold text-[var(--semantic-action-primary)]"
              >
                {businessName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{businessName}</span>
              <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden="true" />
            </div>
            <Link
              href="/prestador/conta"
              className="flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-[var(--semantic-selected)] hover:text-foreground"
            >
              <Settings size={20} className="shrink-0" aria-hidden="true" />
              <span>Configurações</span>
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border bg-[var(--semantic-surface)]">
            <div className="flex h-16 items-center gap-3 px-4">
              <search className="min-w-0 flex-1">
                <form action="/prestador" method="get">
                  <label htmlFor="provider-order-search" className="sr-only">
                    Buscar nos pedidos
                  </label>
                  <div className="relative max-w-md">
                    <Search
                      size={18}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                      aria-hidden="true"
                    />
                    <input
                      id="provider-order-search"
                      name="q"
                      type="search"
                      placeholder="Buscar nos pedidos"
                      className="min-h-11 w-full rounded-lg border border-border bg-[var(--semantic-surface)] pl-10 pr-3 text-sm transition-colors"
                    />
                  </div>
                </form>
              </search>
              <Link
                href="/prestador/conta"
                aria-label="Conta do negócio"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-full transition-colors"
              >
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 place-items-center rounded-full bg-[var(--semantic-selected)] text-sm font-semibold text-[var(--semantic-action-primary)]"
                >
                  {businessName.charAt(0).toUpperCase()}
                </span>
              </Link>
            </div>

            {/* Navegação compacta no mobile: mesma lista, um único ativo. A
                auditoria ignora o nav de largura zero, então só um dos dois
                conta por viewport. */}
            <nav
              aria-label="Painel do negócio (mobile)"
              className="flex gap-1 overflow-x-auto px-3 pb-2 md:hidden"
            >
              <NavLinks compact />
            </nav>
          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  )
}
