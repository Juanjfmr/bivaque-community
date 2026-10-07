"use client"

import { HomeIcon, MagnifyingGlassIcon, UserCircleIcon } from "@heroicons/react/24/outline"
import {
  HomeIcon as HomeSolid,
  MagnifyingGlassIcon as MagnifyingGlassSolid,
  UserCircleIcon as UserCircleSolid,
} from "@heroicons/react/24/solid"
import { Tabs } from "@heroui/react"
import { usePathname } from "next/navigation"
import type { ElementType, SVGProps } from "react"

export interface NavItem {
  id: string
  label: string
  shortLabel?: string
  href: string
  Icon: ElementType<SVGProps<SVGSVGElement>>
  IconActive: ElementType<SVGProps<SVGSVGElement>>
}

// ── Os containers de navegação ──────────────────────────────────────────────
//
// FIGMA-001 (decisão direta do dono em 05/10/2026, reconciliada em
// tests/scope/navigation.test.mjs): Comunidades e Grupos SAÍRAM da navegação
// desta versão. As rotas, os dados e as políticas de autorização históricas
// permanecem; apenas não são mais container de navegação. Conversas vive no
// shell superior (e na sidebar), não como aba mobile.
//
//   - "inicio"   → home de quem participa: a chegada, o que está acontecendo
//                  na cidade da pessoa.
//   - "explorar" → descoberta: busca de serviços e prestadores, com entradas
//                  explícitas para Guia e Mercado.
//   - "perfil"   → o membro: perfil, conta e configurações.
//
// REGRA FALSIFICÁVEL (ADR-20260816, regra 2, preservada): se um destino novo
// não couber em nenhum container, o destino está confuso — pare e reporte;
// NÃO adicione uma aba. Teto de cinco itens; três ≤ cinco.
export const NAV_ITEMS: NavItem[] = [
  {
    id: "inicio",
    label: "Início",
    shortLabel: "Início",
    href: "/inicio",
    Icon: HomeIcon,
    IconActive: HomeSolid,
  },
  {
    id: "explorar",
    label: "Explorar",
    shortLabel: "Explorar",
    href: "/explorar",
    Icon: MagnifyingGlassIcon,
    IconActive: MagnifyingGlassSolid,
  },
  {
    id: "perfil",
    label: "Perfil",
    shortLabel: "Perfil",
    href: "/profile",
    Icon: UserCircleIcon,
    IconActive: UserCircleSolid,
  },
]

function NavIcon({
  Icon,
  IconActive,
  active,
}: {
  Icon: ElementType<SVGProps<SVGSVGElement>>
  IconActive: ElementType<SVGProps<SVGSVGElement>>
  active: boolean
}) {
  const fade = "transition-opacity duration-[var(--semantic-motion-duration-fast)]"
  return (
    <span className="relative inline-flex h-5 w-5" aria-hidden="true">
      <Icon
        className={`absolute inset-0 h-5 w-5 ${fade} ${active ? "opacity-0" : "opacity-100"}`}
      />
      <IconActive
        className={`absolute inset-0 h-5 w-5 ${fade} ${active ? "opacity-100" : "opacity-0"}`}
      />
    </span>
  )
}

export function BottomNav() {
  const pathname = usePathname()

  const items = NAV_ITEMS

  const fallbackId =
    pathname.startsWith("/messages") || pathname.startsWith("/notifications") ? "perfil" : "inicio"
  const selectedKey =
    items.find((item) => item.href === pathname || pathname.startsWith(`${item.href}/`))?.id ??
    fallbackId

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[var(--semantic-surface)] pb-[env(safe-area-inset-bottom,0px)] md:hidden"
    >
      <Tabs selectedKey={selectedKey} variant="primary" aria-label="Navegação principal">
        <Tabs.List aria-label="Seções do aplicativo" className="flex justify-around">
          {items.map((item) => (
            <Tabs.Tab
              key={item.id}
              id={item.id}
              href={item.href}
              className="flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 px-1 py-1 text-xs font-medium"
            >
              <NavIcon
                Icon={item.Icon}
                IconActive={item.IconActive}
                active={selectedKey === item.id}
              />
              <span>{item.shortLabel ?? item.label}</span>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    </nav>
  )
}
