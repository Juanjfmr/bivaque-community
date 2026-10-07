"use client"

import { Modal } from "@heroui/react"
import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import styles from "./listing-cards.module.css"

export function ListingEditSurface({
  listingId,
  children,
}: {
  listingId: string
  children: ReactNode
}) {
  const router = useRouter()
  return (
    <Modal
      isOpen
      onOpenChange={(open) => {
        if (!open) router.push(`/imoveis/${listingId}`)
      }}
    >
      <Modal.Backdrop>
        <Modal.Container size="lg" className={styles["publishContainer"] ?? ""}>
          <Modal.Dialog aria-label="Editar imóvel">
            <Modal.CloseTrigger aria-label="Fechar edição" className={styles["editClose"] ?? ""} />
            <Modal.Body className={styles["modalBody"] ?? ""}>{children}</Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}
