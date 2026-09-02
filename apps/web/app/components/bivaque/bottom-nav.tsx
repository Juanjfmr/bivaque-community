"use client"

import { HomeIcon, MapPinIcon, UserCircleIcon, UserGroupIcon } from "@heroicons/react/24/outline"
import {
  HomeIcon as HomeSolid,
  MapPinIcon as MapPinSolid,
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
// A navegação do shell do membro espelha o MODELO DE PRODUTO, não a lista de
// features (ADR-20260816-shells-e-navegacao, regra 2). Os containers derivam de
// BIVAQUE.md §3.1 (três níveis de pertencimento: localidade → comunidade →
// grupo) e §6.3 (os dois ciclos). São exatamente quatro, e o quarto é o próprio
// membro ("Eu"), onde moram perfil, conta, mensagens e — quando existir — o
// convite de membro.
//
//   - "cidade"     → o nível da localidade: eventos da cidade, guia de chegada,
//                    vitrine e busca de prestador (onda G). O ADR é explícito:
//                    vitrine e busca de prestador caem AQUI.
//   - "community"  → o nível da comunidade: a home (feed da vila) e os dois
//                    ciclos (§6.3: pedir/responder na semana, o encontro mensal).
//   - "groups"     → o nível do grupo: conversa por interesse (§3.2).
//   - "me"         → o membro: perfil, conta, mensagens (DM, mantida pela D36)
//                    e convite de membro (onda E Task 6), que cai em "eu".
//
// Eventos não é aba própria: "eventos da cidade" é uma das quatro coisas que o
// nível municipal é (§6.2), e eventos de vila pertencem à vila. Ele aterrissa
// dentro do container "cidade". Indicações e Mensagens também saem da nav de
// nível superior: Indicações vive no header (spec §0 Navegação) e Mensagens
// dentro de "eu".
//
// REGRA FALSIFICÁVEL (ADR, regra 2): se um destino novo não couber em nenhum
// container, o destino está confuso — não falta vaga. Nesse caso, pare e
// reporte; NÃO adicione uma nova aba.
//
// O teto continua cinco (iOS HIG / Material). Quatro containers ≤ cinco.
export const NAV_ITEMS: NavItem[] = [
  {
    id: "cidade",
    label: "Cidade",
    shortLabel: "Cidade",
    href: "/localidade",
    Icon: MapPinIcon,
    IconActive: MapPinSolid,
  },
  {
    id: "community",
    label: "Minha comunidade",
    shortLabel: "Comunidade",
    href: "/community",
    Icon: HomeIcon,
    IconActive: HomeSolid,
  },
  {
    id: "groups",
    label: "Grupos",
    href: "/groups",
    Icon: UserGroupIcon,
    IconActive: UserGroupSolid,
  },
  {
    id: "me",
    label: "Eu",
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
    pathname.startsWith("/messages") || pathname.startsWith("/notifications") ? "me" : "community"
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
