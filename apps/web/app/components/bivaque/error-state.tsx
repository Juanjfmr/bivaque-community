"use client"

import { Button } from "@heroui/react"
import { FeedbackAlert } from "./feedback-alert"

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  className?: string
}

// Token-driven error state. Renders a user-safe message — never pass a raw
// Supabase/Postgres error string here; callers map failures to friendly copy
// (DESIGN_SPEC §3.3).
export function ErrorState({ message, onRetry, className = "" }: ErrorStateProps) {
  return (
    <FeedbackAlert
      variant="danger"
      title="Algo deu errado"
      description={message}
      className={className}
      actions={
        onRetry ? (
          <Button variant="tertiary" size="sm" onPress={onRetry}>
            Tentar novamente
          </Button>
        ) : undefined
      }
    />
  )
}
