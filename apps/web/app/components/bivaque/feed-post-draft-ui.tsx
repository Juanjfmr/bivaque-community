"use client"

// UI do rascunho no compositor: o aviso de recuperação, o aviso de
// armazenamento indisponível e o diálogo de descarte confirmado. O texto do
// rascunho só existe no navegador da pessoa (feed-post-draft); descartar é
// sempre uma ação explícita com confirmação — nunca acontece em silêncio.

import { Button, Modal } from "@heroui/react"
import { ModalCloseTrigger } from "./close-button"
import { FeedbackAlert } from "./feedback-alert"

interface DraftNoticesProps {
  draftRestored: boolean
  storageUnavailable: boolean
  onRequestDiscard: () => void
}

export function DraftNotices({
  draftRestored,
  storageUnavailable,
  onRequestDiscard,
}: DraftNoticesProps) {
  return (
    <>
      {draftRestored ? (
        <div className="mt-4">
          <FeedbackAlert
            variant="info"
            title="Rascunho recuperado"
            description="Você tinha um texto não publicado. Ele continua aqui até você publicar ou descartar."
            actions={
              <Button
                size="sm"
                variant="tertiary"
                onPress={onRequestDiscard}
                aria-label="Descartar rascunho"
              >
                Descartar rascunho
              </Button>
            }
          />
        </div>
      ) : null}

      {storageUnavailable ? (
        <div className="mt-4" aria-live="polite">
          <FeedbackAlert
            variant="warning"
            description="Não foi possível guardar o rascunho neste navegador (dados de site bloqueados?). Seu texto continua aqui, mas se a página fechar ele se perde."
          />
        </div>
      ) : null}
    </>
  )
}

interface DraftDiscardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onDiscard: () => void
}

export function DraftDiscardDialog({ open, onOpenChange, onDiscard }: DraftDiscardDialogProps) {
  if (!open) return null
  return (
    <Modal isOpen onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container size="sm">
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>Descartar rascunho?</Modal.Heading>
              <ModalCloseTrigger className="min-h-11 min-w-11" />
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm">O rascunho será apagado e não poderá ser recuperado.</p>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="primary" onPress={() => onOpenChange(false)}>
                Manter rascunho
              </Button>
              <Button variant="danger" onPress={onDiscard}>
                Descartar rascunho
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
