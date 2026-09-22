"use client"

import { Bell, Lock, ShieldCheck, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Prancha 52: a coluna vertical de seções fica dentro do cartão, à esquerda do
// conteúdo. "Perfil" leva ao perfil real; as outras três abrem as subrotas de
// configurações. O item ativo usa `aria-current="page"` — a auditoria exige
// exatamente um item ativo por navegação.
const ITEMS = [
  {
    href: "/profile",
    label: "Perfil",
    icon: User,
    matches: ["/profile"],
  },
  {
    href: "/configuracoes/notificacoes",
    label: "Notificações",
    icon: Bell,
    matches: ["/configuracoes/notificacoes"],
  },
  {
    href: "/configuracoes/conta",
    label: "Conta",
    icon: Lock,
    matches: ["/configuracoes/conta"],
  },
  {
    href: "/configuracoes/bloqueados",
    label: "Privacidade",
    icon: ShieldCheck,
    matches: ["/configuracoes/bloqueados", "/configuracoes/familia"],
  },
] as const

export function ConfiguracoesNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Seções de configurações"
      className="rounded-xl border border-border bg-[var(--surface)] p-2 md:self-start"
    >
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {ITEMS.map((item) => {
          const active = item.matches.some(
            (match) => pathname === match || pathname.startsWith(`${match}/`),
          )
          const Icon = item.icon
          return (
            <li key={item.href} className="flex-1 md:flex-none">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-[var(--semantic-selection)] text-[var(--semantic-text)]"
                    : "text-muted hover:bg-[var(--surface-sunken)]"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
