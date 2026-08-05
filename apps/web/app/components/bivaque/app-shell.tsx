"use client"

import { brandTokens } from "@bivaque/tokens"
import { SparklesIcon } from "@heroicons/react/24/outline"
import { Button } from "@heroui/react"
import { usePathname, useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { BottomNav, NAV_ITEMS } from "./bottom-nav"

interface AppShellProperties {
  children: ReactNode
}

export function AppShell({ children }: AppShellProperties) {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-[var(--surface)]">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
          <span className="text-base font-semibold tracking-tight">{brandTokens.productName}</span>

          <Button
            variant="tertiary"
            size="sm"
            isIconOnly
            aria-label="Indicações"
            className="min-h-11 min-w-11"
            onPress={() => router.push("/recommendations")}
          >
            <SparklesIcon className="h-5 w-5" />
            <span className="sr-only">Indicações</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar (>=1024px). Bottom nav is hidden at this breakpoint. */}
        <aside className="hidden w-56 shrink-0 border-r border-border bg-[var(--surface)] lg:block">
          <nav aria-label="Navegação principal" className="sticky top-12 flex flex-col gap-1 p-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.Icon
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <a
                  key={item.id}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-instant)] ${
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "text-muted hover:bg-[var(--surface-subtle)] hover:text-foreground"
                  }`}
                >
                  <Icon
                    aria-hidden="true"
                    fill={active ? "currentColor" : "none"}
                    stroke="currentColor"
                    strokeWidth={1.5}
                    className="h-5 w-5"
                  />
                  {item.label}
                </a>
              )
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-16 lg:pb-0">{children}</main>
      </div>

      <BottomNav />
    </div>
  )
}
