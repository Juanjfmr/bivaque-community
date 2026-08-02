"use client"

import { brandTokens } from "@bivaque/tokens"
import { Button } from "@heroui/react"
import type { ReactNode } from "react"
import { BottomNav } from "./bottom-nav"

function IndicationsIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  )
}

interface AppShellProperties {
  children: ReactNode
}

export function AppShell({ children }: AppShellProperties) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-50 border-b border-[color-mix(in_oklch,var(--foreground)_8%,transparent)] bg-[var(--surface)]">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-4">
          <span className="text-base font-semibold tracking-tight">{brandTokens.productName}</span>

          <Button
            variant="tertiary"
            size="sm"
            isIconOnly
            aria-label="Indicações"
            className="min-h-11 min-w-11"
            style={{ minWidth: "44px", minHeight: "44px" }}
          >
            <IndicationsIcon />
            <span className="sr-only">Indicações</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 pb-16">{children}</main>

      <BottomNav />
    </div>
  )
}
