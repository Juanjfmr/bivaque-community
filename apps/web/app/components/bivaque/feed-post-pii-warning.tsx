"use client"

// Guarda de PII do compositor: detectou CPF/CEP, a pessoa precisa confirmar
// explicitamente antes de qualquer gravação. Nunca publica sozinha.

import { Button } from "@heroui/react"
import { FeedbackAlert } from "./feedback-alert"

interface PostPiiWarningProps {
  onConfirm: () => void
  onCancel: () => void
}

export function PostPiiWarning({ onConfirm, onCancel }: PostPiiWarningProps) {
  return (
    <div className="mt-4">
      <FeedbackAlert
        variant="warning"
        description="Isso parece um CPF ou CEP. Quer mesmo publicar?"
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="primary" onPress={onConfirm}>
          Publicar mesmo
        </Button>
        <Button size="sm" variant="tertiary" onPress={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
