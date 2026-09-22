"use client"

// Menu transbordante do cartão de publicação. Vive separado do cartão porque
// é a única peça que conhece as ações do post (ocultar, compartilhar,
// denunciar, editar) — o cartão decide SE oferece editar (autoria), o menu
// só renderiza o que recebeu.

import { Dropdown } from "@heroui/react"
import { MoreHorizontal } from "lucide-react"
import { useCallback } from "react"

interface LeanOverflowMenuProps {
  postId: string
  onHide?: ((postId: string) => void) | undefined
  onReport?: (() => void) | undefined
  /** presente só quando o post é da própria pessoa (autorias conferidas no
   *  servidor; o item aparece para quem o UPDATE da RLS aceita) */
  onEdit?: (() => void) | undefined
}

export function LeanOverflowMenu({ postId, onHide, onReport, onEdit }: LeanOverflowMenuProps) {
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/community?post=${postId}`
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Bivaque", url })
      } catch {
        try {
          await navigator.clipboard.writeText(url)
        } catch {
          /* noop */
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
      } catch {
        /* noop */
      }
    }
  }, [postId])

  const handleAction = useCallback(
    (key: React.KeyboardEvent | React.MouseEvent | string | number) => {
      if (key === "hide") {
        onHide?.(postId)
      } else if (key === "share") {
        void handleShare()
      } else if (key === "report") {
        onReport?.()
      } else if (key === "edit") {
        onEdit?.()
      }
    },
    [postId, onHide, onReport, onEdit, handleShare],
  )

  return (
    <Dropdown>
      {/* O Trigger JÁ é um Button (DropdownTriggerProps extends
          ComponentPropsWithRef<typeof Button>): envolver outro botão aqui
          produzia <button> dentro de <button> — HTML inválido e erro de
          hidratação no console de toda tela com cartão de publicação. As props
          do botão vão no próprio Trigger. O nome acessível segue "Mais opções"
          porque tests/e2e/reports-member-flow.spec.ts clica por ele. */}
      <Dropdown.Trigger aria-label="Mais opções" className="rounded-full min-h-11 min-w-11">
        <MoreHorizontal size={18} aria-hidden="true" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label="Ações da publicação" onAction={handleAction}>
          {onEdit ? (
            <Dropdown.Item key="edit" id="edit">
              Editar publicação
            </Dropdown.Item>
          ) : null}
          <Dropdown.Item key="hide" id="hide">
            Ocultar publicação
          </Dropdown.Item>
          <Dropdown.Item key="share" id="share">
            Compartilhar
          </Dropdown.Item>
          {/* F160: o post e o alvo central do fluxo de moderacao e era o unico
              sem acao de denuncia — o comentario tinha, o post nao. O menu e o
              lugar certo: um "Denunciar" visivel em cada card do feed convida
              ao uso e polui a leitura. */}
          <Dropdown.Item key="report" id="report">
            Denunciar publicação
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
