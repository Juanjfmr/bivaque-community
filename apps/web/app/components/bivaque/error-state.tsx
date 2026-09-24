"use client"

import { Button } from "@heroui/react"
import { useEffect, useState } from "react"
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
  retryDisabled?: boolean
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
  retryDisabled = false,
  className = "",
}: ConnectionLostStateProps) {
  const [online, setOnline] = useState(true)
  useEffect(() => {
    const update = () => setOnline(window.navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])
  const handleRetry = onRetry ?? (() => window.location.reload())
  const retryIsDisabled = retryDisabled || !online
  return (
    <FeedbackAlert
      variant="warning"
      title="Sem conexão"
      description={description}
      className={className}
      actions={
        <Button variant="tertiary" size="sm" onPress={handleRetry} isDisabled={retryIsDisabled}>
          {retryLabel}
        </Button>
      }
    />
  )
}
