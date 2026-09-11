"use client"

import {
  HomeIcon,
  MagnifyingGlassIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline"
import {
  HomeIcon as HomeSolid,
  MagnifyingGlassIcon as MagnifyingGlassSolid,
  UserCircleIcon as UserCircleSolid,
  UserGroupIcon as UserGroupSolid,
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
// A navegação do shell do membro espelha o MODELO DE PRODUTO da versão de
// 2026-09-06 (docs/design/visual-guide-2026-09-06/PROCESSO-DE-CONSTRUCAO.md §7),
// que substitui os quatro containers históricos do ADR-20260816. São quatro:
//
//   - "inicio"      → home de quem participa: a chegada, o que está acontecendo
//                     na cidade e nas comunidades da pessoa (prancha 01).
//   - "explorar"    → descoberta: busca de serviços e prestadores, com entradas
//                     explícitas para Guia e Mercado (prancha 61).
//   - "comunidades" → minhas comunidades + descoberta + apresentação; grupos
//                     vivem dentro de uma comunidade, não como aba.
//   - "perfil"      → o membro: perfil, conta, notificações e a conversa
//                     contextual membro↔prestador. Não há inbox nem DM geral.
//
// REGRA FALSIFICÁVEL (ADR-20260816, regra 2, preservada): se um destino novo
// não couber em nenhum container, o destino está confuso — pare e reporte;
// NÃO adicione uma aba. Teto de cinco itens; quatro ≤ cinco.
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
    id: "comunidades",
    label: "Comunidades",
    shortLabel: "Comunidades",
    href: "/communities",
    Icon: UserGroupIcon,
    IconActive: UserGroupSolid,
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

  const secondaryPersonal =
    pathname.startsWith("/messages") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/salvos") ||
    pathname.startsWith("/denuncias") ||
    pathname.startsWith("/ajuda")
  const fallbackId = secondaryPersonal ? "perfil" : "inicio"
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
