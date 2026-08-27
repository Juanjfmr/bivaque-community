"use client"

import { scrubReportReason } from "@bivaque/domain"
import { Button, Modal, TextArea, useOverlayState } from "@heroui/react"
import { useCallback, useState } from "react"
import type { Database } from "supabase/database.generated"
import { createBrowserClient } from "../../../lib/supabase/client"
import { SUPPORT_SLA_HOURS } from "../../../lib/support"
import { FeedbackAlert } from "./feedback-alert"

// Os seis alvos de `public.report_target_type`. Os dois de indicacao entraram
// na H-Task 1 (20260821000031): a onda F transformou a resposta de indicacao no
// ciclo central do produto e ela nao era denunciavel.
export type ReportTargetType =
  | "post"
  | "comment"
  | "group"
  | "message"
  | "recommendation_request"
  | "recommendation_reply"

interface ReportButtonProps {
  targetType: ReportTargetType
  targetId: string
  label?: string
  /**
   * Estado de overlay controlado pelo pai. Existe para o alvo `post`: o menu da
   * publicacao (LeanOverflowMenu) precisa abrir o modal a partir de um
   * `Dropdown.Item`, e nao de um botao proprio — o feed nao aguenta um
   * "Denunciar" visivel em cada card. Quando vem preenchido, o gatilho proprio
   * do componente nao e renderizado.
   */
  externalState?: ReturnType<typeof useOverlayState>
}

export function ReportButton({
  targetType,
  targetId,
  label = "Denunciar",
  externalState,
}: ReportButtonProps) {
  const ownModal = useOverlayState()
  const modal = externalState ?? ownModal
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

    // H-Task 2: aplica a redação de CPF antes do insert. O trigger no banco
    // (supabase/migrations/<ts>_report_reason_guard.sql) aplica a mesma
    // redação como cinto de segurança server-side.
    const safeReason = scrubReportReason(trimmed)

    const { error: insertError } = await supabase.from("reports").insert({
      target_type: targetType,
      target_id: targetId,
      reason: safeReason,
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
      // O feedback fica dentro do modal aberto: fechar aqui escondia a
      // confirmacao junto com o dialogo e o membro nunca via o desfecho.
      setSuccess(true)
      setReason("")
    }

    setSubmitting(false)
  }, [reason, targetType, targetId, supabase])

  const handleClose = useCallback(() => {
    modal.close()
    setReason("")
    setError("")
  }, [modal])

  if (success) {
    return (
      <span className="text-xs text-accent">
        Denuncia recebida. A analise acontece em ate {SUPPORT_SLA_HOURS} horas e o resultado chega
        como notificacao no app.
      </span>
    )
  }

  return (
    <>
      {externalState ? null : (
        <Button
          variant="tertiary"
          size="sm"
          onPress={modal.open}
          aria-label={`${label} ${targetType}`}
        >
          {label}
        </Button>
      )}

      <Modal state={modal}>
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Denunciar conteudo</Modal.Heading>
                <Modal.CloseTrigger />
              </Modal.Header>
              <Modal.Body>
                {success ? (
                  <span className="text-sm text-accent">
                    Denuncia recebida. A analise acontece em ate {SUPPORT_SLA_HOURS} horas e o
                    resultado chega como notificacao no app.
                  </span>
                ) : (
                  <>
                    <p className="text-sm text-muted">
                      Descreva por que este conteudo viola as regras da comunidade.
                    </p>
                    <p className="mt-2 text-xs text-muted" role="note">
                      Nao digite CPF, telefone nem endereco. O motivo fica registrado por dois anos
                      e passa por redacao automatica antes de chegar ao operador.
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
                  </>
                )}
              </Modal.Body>
              <Modal.Footer>
                {success ? (
                  <Button variant="primary" onPress={handleClose}>
                    Fechar
                  </Button>
                ) : (
                  <>
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
                  </>
                )}
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
