"use client"

import { Button, Modal, useOverlayState } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createBrowserClient } from "../../../../lib/supabase/client"
import { ModalCloseTrigger } from "../../../components/bivaque/close-button"
import { FeedbackAlert } from "../../../components/bivaque/feedback-alert"

// COM-005 (B2 do lote 5): o pedido de entrada no grupo Fechado.
//
// O protótipo manda o pedido com um recado; o ADR-20261023 §3 fixa o motivo de
// até 300 caracteres, lido só por quem aprova e pela própria pessoa, e a tela
// que avisa o que não incluir. O motivo é opcional: o pedido sem motivo vale.
//
// A escrita é a RPC `join_group(uuid, text)`, definer: ela decide status
// (Fechado → pendente), grava o motivo na mesma transação e conta a tentativa
// (no máximo 3 em 30 dias, erro 54000).

const REASON_MAX = 300

export function GroupJoinRequest({ groupId }: { groupId: string }) {
  const supabase = createBrowserClient()
  const router = useRouter()
  const modal = useOverlayState()
  const [reason, setReason] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function reset() {
    setReason("")
    setError("")
  }

  async function submit() {
    setError("")
    setSubmitting(true)

    const trimmed = reason.trim()
    const { error: rpcError } = await supabase.rpc("join_group", {
      p_group_id: groupId,
      ...(trimmed.length > 0 ? { p_reason: trimmed } : {}),
    })

    setSubmitting(false)

    if (rpcError) {
      // 54000 é o teto de pedidos do ADR: três em 30 dias. A frase diz o que
      // aconteceu e o que fazer, sem citar o mecanismo.
      if (rpcError.code === "54000") {
        setError(
          "Você já pediu para entrar neste grupo três vezes nos últimos 30 dias. Tente de novo mais tarde.",
        )
      } else {
        setError("Não foi possível enviar o pedido agora. Tente novamente.")
      }
      return
    }

    modal.close()
    reset()
    router.refresh()
  }

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onPress={() => {
          reset()
          modal.open()
        }}
      >
        Pedir entrada
      </Button>

      <Modal
        state={modal}
        onOpenChange={(isOpen) => {
          if (!isOpen) reset()
        }}
      >
        <Modal.Backdrop>
          <Modal.Container size="md">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Pedido de entrada</Modal.Heading>
                <ModalCloseTrigger className="min-h-11 min-w-11" />
              </Modal.Header>
              <Modal.Body>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="join-reason" className="text-sm font-medium">
                    Por que você quer entrar? (opcional)
                  </label>
                  <textarea
                    id="join-reason"
                    rows={3}
                    maxLength={REASON_MAX}
                    aria-describedby="join-reason-help"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="w-full rounded-lg border border-border bg-[var(--surface)] px-3 py-2 text-sm leading-relaxed transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--semantic-focus)]"
                  />
                  <p className="text-right text-xs text-muted">
                    {reason.length}/{REASON_MAX}
                  </p>
                  <p id="join-reason-help" className="text-xs text-muted" role="note">
                    Não inclua endereço, telefone, CPF ou dados de saúde. O motivo é lido só por
                    você e por quem aprova o pedido.
                  </p>
                </div>
                {error && (
                  <div className="mt-3">
                    <FeedbackAlert variant="danger" description={error} />
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={() => modal.close()}>
                  Cancelar
                </Button>
                <Button variant="primary" onPress={submit} isDisabled={submitting}>
                  {submitting ? "Enviando…" : "Enviar pedido"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  )
}
