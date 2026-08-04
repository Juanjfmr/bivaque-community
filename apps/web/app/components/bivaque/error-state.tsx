"use client"

import { Button } from "@heroui/react"

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  className?: string
}

// Token-driven error state. Renders a user-safe message — never pass a raw
// Supabase/Postgres error string here; callers map failures to friendly copy
// (DESIGN_SPEC §3.3). Optional retry button uses the danger surface.
export function ErrorState({ message, onRetry, className = "" }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-border bg-[var(--surface-raised)] px-6 py-8 text-center ${className}`}
    >
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <p className="text-sm font-medium text-[var(--danger)]">Algo deu errado</p>
        <p className="text-sm text-muted">{message}</p>
        {onRetry && (
          <Button variant="tertiary" size="sm" onPress={onRetry}>
            Tentar novamente
          </Button>
        )}
      </div>
    </div>
  )
}
