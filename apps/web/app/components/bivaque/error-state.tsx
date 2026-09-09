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

interface ConnectionLostStateProps {
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

// Prancha 60 (painel direito): a conexão caiu. Diferente de acesso
// indisponível — aqui tentar de novo resolve, porque a retomada refaz a
// consulta. onRetry deve reexecutar a mesma consulta que falhou (refetch ou
// reload); omiti-lo recarrega a página, que também é retomada real. Limpar a
// mensagem sem reconsultar não é retomada e não pertence a este estado.
// variant="warning" faz o FeedbackAlert usar role="alert" (assertivo).
export function ConnectionLostState({
  description = "Não foi possível completar esta consulta por falta de conexão. Verifique a internet e tente de novo.",
  onRetry,
  retryLabel = "Tentar novamente",
  className = "",
}: ConnectionLostStateProps) {
  const handleRetry = onRetry ?? (() => window.location.reload())
  return (
    <FeedbackAlert
      variant="warning"
      title="Sem conexão"
      description={description}
      className={className}
      actions={
        <Button variant="tertiary" size="sm" onPress={handleRetry}>
          {retryLabel}
        </Button>
      }
    />
  )
}
