"use client"

import { Button, Modal, TextArea, useOverlayState } from "@heroui/react"
import { useCallback, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../../lib/supabase/client"
import { FeedbackAlert } from "./feedback-alert"

interface ReportButtonProps {
  targetType: "post" | "comment" | "group" | "message"
  targetId: string
  label?: string
}

export function ReportButton({ targetType, targetId, label = "Denunciar" }: ReportButtonProps) {
  const modal = useOverlayState()
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
      modal.close()
    }

    setSubmitting(false)
  }, [reason, targetType, targetId, supabase, modal])

  const handleClose = useCallback(() => {
    modal.close()
    setReason("")
    setError("")
  }, [modal])

  if (success) {
    return (
      <span className="text-xs text-accent">
        Denuncia recebida. A analise acontece e o resultado chega como notificacao no app.
      </span>
    )
  }

  return (
    <>
      <Button
        variant="tertiary"
        size="sm"
        onPress={modal.open}
        aria-label={`${label} ${targetType}`}
      >
        {label}
      </Button>

      <Modal state={modal}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Denunciar conteudo</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-muted">
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
                {error && (
                  <div className="mt-2">
                    <FeedbackAlert variant="danger" description={error} />
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={handleClose}>
                  Cancelar
                </Button>
                <Button
                  onPress={handleSubmit}
                  isDisabled={submitting || !reason.trim()}
                  variant="primary"
                >
                  {submitting ? "Enviando..." : "Enviar denuncia"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
