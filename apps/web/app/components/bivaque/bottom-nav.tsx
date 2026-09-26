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
import { resolveActiveNav } from "../shell/active-nav"

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

  // A MESMA regra da lateral (active-nav.ts). Antes a barra tinha a própria:
  // casava só o prefixo do item e caía em "Início" para todo o resto — então
  // /community, /guide, /events, /mercado e /cidade acendiam Início no celular
  // enquanto a lateral do desktop acendia o lugar certo (25/09/2026). Salvos,
  // que na lateral tem item próprio, fica em Perfil aqui (é coisa da pessoa);
  // O componente de abas não tem "nenhuma selecionada"; "Início" fica só como
  // último recurso para rota sem área declarada — o que, dentro do shell, o
  // teste de escopo de active-nav já impede.
  const active = resolveActiveNav(pathname, items)
  const selectedKey =
    active.kind === "primary" ? active.id : active.kind === "secondary" ? "perfil" : "inicio"

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ui-line bg-ui-surface pb-[env(safe-area-inset-bottom,0px)] md:hidden"
    >
      <Tabs selectedKey={selectedKey} variant="primary" aria-label="Navegação principal">
        <Tabs.List aria-label="Seções do aplicativo" className="flex justify-around">
          {items.map((item) => (
            <Tabs.Tab
              key={item.id}
              id={item.id}
              href={item.href}
              className="flex h-16 min-w-11 flex-col items-center justify-center gap-0.5 px-1 text-xs font-medium text-ui-ink-2 data-[selected=true]:text-ui-brand"
            >
              {/* Pílula atrás do ícone ativo, como na prancha 00. */}
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-full transition-colors ${selectedKey === item.id ? "bg-ui-brand-soft" : ""}`}
              >
                <NavIcon
                  Icon={item.Icon}
                  IconActive={item.IconActive}
                  active={selectedKey === item.id}
                />
              </span>
              <span>{item.shortLabel ?? item.label}</span>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    </nav>
  )
}
