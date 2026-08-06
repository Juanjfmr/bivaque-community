"use client"

import {
  CalendarDaysIcon,
  HomeIcon,
  SparklesIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline"
import {
  CalendarDaysIcon as CalendarDaysSolid,
  HomeIcon as HomeSolid,
  SparklesIcon as SparklesSolid,
  UserCircleIcon as UserCircleSolid,
  UserGroupIcon as UserGroupSolid,
} from "@heroicons/react/24/solid"
import { Tabs } from "@heroui/react"
import { usePathname } from "next/navigation"
import type { ComponentType, SVGProps } from "react"

export interface NavItem {
  id: string
  label: string
  shortLabel?: string
  href: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  IconActive: ComponentType<SVGProps<SVGSVGElement>>
}

export const NAV_ITEMS: NavItem[] = [
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
    id: "events",
    label: "Eventos",
    href: "/events",
    Icon: CalendarDaysIcon,
    IconActive: CalendarDaysSolid,
  },
  {
    id: "indications",
    label: "Indicações",
    shortLabel: "Indicações",
    href: "/recommendations",
    Icon: SparklesIcon,
    IconActive: SparklesSolid,
  },
  {
    id: "profile",
    label: "Perfil",
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
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  IconActive: ComponentType<SVGProps<SVGSVGElement>>
  active: boolean
}) {
  const fade = "transition-opacity duration-[var(--duration-fast)]"
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

  const selectedKey =
    NAV_ITEMS.find((item) => item.href === pathname || pathname.startsWith(`${item.href}/`))?.id ??
    "community"

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[var(--surface)] pb-[env(safe-area-inset-bottom,0px)] md:hidden"
    >
      <Tabs selectedKey={selectedKey} variant="primary" aria-label="Navegação principal">
        <Tabs.List aria-label="Seções do aplicativo" className="flex justify-around">
          {NAV_ITEMS.map((item) => (
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
