"use client"

import { Tabs } from "@heroui/react"
import { usePathname } from "next/navigation"

export interface NavItem {
  id: string
  label: string
  href: string
  paths: string[]
}

export const NAV_ITEMS: NavItem[] = [
  {
    id: "community",
    label: "Minha comunidade",
    href: "/community",
    paths: [
      "M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c0 .621.504 1.125 1.125 1.125h2.25c.621 0 1.125-.504 1.125-1.125V9.75",
    ],
  },
  {
    id: "groups",
    label: "Grupos",
    href: "/groups",
    paths: [
      "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z",
    ],
  },
  {
    id: "events",
    label: "Eventos",
    href: "/events",
    paths: [
      "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5",
    ],
  },
  {
    id: "profile",
    label: "Perfil",
    href: "/profile",
    paths: [
      "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z",
    ],
  },
]

// Icon that crossfades outline -> solid when active (DESIGN_SPEC §2).
function NavIcon({ paths, active }: { paths: string[]; active: boolean }) {
  const fade = "transition-opacity duration-[var(--duration-fast)]"
  return (
    <span className="relative inline-flex h-5 w-5" aria-hidden="true">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className={`absolute inset-0 h-5 w-5 ${fade} ${active ? "opacity-0" : "opacity-100"}`}
      >
        {paths.map((d) => (
          <path key={d} strokeLinecap="round" strokeLinejoin="round" d={d} />
        ))}
      </svg>
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="currentColor"
        className={`absolute inset-0 h-5 w-5 ${fade} ${active ? "opacity-100" : "opacity-0"}`}
      >
        {paths.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-[var(--surface)] pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
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
              <NavIcon paths={item.paths} active={selectedKey === item.id} />
              <span>{item.label}</span>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
    </nav>
  )
}
