"use client"

import { Button, TextArea } from "@heroui/react"
import { useCallback, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../../lib/supabase/client"

interface ReportButtonProps {
  targetType: "post" | "comment" | "group" | "message"
  targetId: string
  label?: string
}

export function ReportButton({ targetType, targetId, label = "Denunciar" }: ReportButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const supabase = createBrowserClient()

  const handleSubmit = useCallback(async () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setError("Descreva o motivo da denuncia.")
      return
    }

    setSubmitting(true)
    setError("")

    const { error: insertError } = await supabase.from("reports").insert({
      target_type: targetType,
      target_id: targetId,
      reason: trimmed,
    } as Database["public"]["Tables"]["reports"]["Insert"])

    if (insertError) {
      if (insertError.message.includes("duplicate") || insertError.code === "23505") {
        setError("Voce ja denunciou este conteudo.")
      } else if (insertError.message.includes("own content")) {
        setError("Voce nao pode denunciar seu proprio conteudo.")
      } else {
        setError(insertError.message)
      }
    } else {
      setSuccess(true)
      setReason("")
    }

    setSubmitting(false)
  }, [reason, targetType, targetId, supabase])

  if (success) {
    return <span className="text-xs text-accent">Denuncia enviada</span>
  }

  return (
    <>
      <Button
        variant="tertiary"
        size="sm"
        onPress={() => setShowModal(true)}
        aria-label={`${label} ${targetType}`}
      >
        {label}
      </Button>

      {showModal && (
        <div className="motion-scrim-enter fixed inset-0 z-50 flex items-center justify-center bg-[var(--backdrop)] p-4">
          <div className="motion-panel-enter w-full max-w-md rounded-xl border border-border bg-[var(--surface)] p-6 shadow-[var(--elevation-3)]">
            <h2 className="text-lg font-semibold">Denunciar conteudo</h2>
            <p className="mt-1 text-sm text-muted">
              Descreva por que este conteudo viola as regras da comunidade.
            </p>

            <div className="mt-4">
              <TextArea
                aria-label="Motivo da denuncia"
                placeholder="Descreva o motivo..."
                value={reason}
                onChange={(e) => setReason((e.target as HTMLTextAreaElement).value)}
                className="w-full"
              />
            </div>

            {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="tertiary"
                onPress={() => {
                  setShowModal(false)
                  setReason("")
                  setError("")
                }}
              >
                Cancelar
              </Button>
              <Button
                onPress={handleSubmit}
                isDisabled={submitting || !reason.trim()}
                variant="primary"
              >
                {submitting ? "Enviando..." : "Enviar denuncia"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
