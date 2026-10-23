"use client"

// Menu ⋮ da conversa de uma pergunta (lote 5, ADR-20261023, seção 2).
//
// O protótipo trata a autogestão como regra (`manage.js`): quem escreveu edita e
// exclui; a autora da pergunta também marca "Resolvida" ou "Reabrir pergunta" no
// mesmo menu. O menu do feed (`bivaque/feed-post-menu.tsx`) não carrega a ação
// de resolver, e o pedido precisa dela sem mexer no componente compartilhado —
// daí este menu próprio das Indicações, com o mesmo contrato de nome acessível
// do gatilho: sempre começa por "Mais opções" e termina no que aquele botão abre
// (`lib/recommendations/trigger-label.ts`).

import { Dropdown } from "@heroui/react"
import { MoreHorizontal } from "lucide-react"
import { useCallback } from "react"

// Alvo mínimo dos itens do menu: 44px, a régua do menu contextual (DS-006).
const ITEM_CLASS = "min-h-11"

interface ConversationMenuProps {
  /** Chave estável do alvo (pedido ou resposta), só para o compartilhar. */
  targetId: string
  menuLabel: string
  /** Nome acessível do gatilho; sempre prefixado por "Mais opções". */
  triggerLabel: string
  /** Caminho a compartilhar (o endereço do pedido). */
  sharePath?: string
  /** Edição do próprio conteúdo. */
  onEdit?: (() => void) | undefined
  /** "Marcar como resolvida" para a autora de uma pergunta aberta. */
  onResolve?: (() => void) | undefined
  /** "Reabrir pergunta" para a autora de uma pergunta resolvida. */
  onReopen?: (() => void) | undefined
  /** Exclusão do próprio conteúdo. */
  onDelete?: (() => void) | undefined
  /** Denúncia de conteúdo de outra pessoa. */
  onReport?: (() => void) | undefined
  /** Nomes dos itens, sempre no alvo que o menu abre. */
  labels?: {
    edit?: string
    resolve?: string
    reopen?: string
    delete?: string
    share?: string
    report?: string
  }
}

export function ConversationMenu({
  targetId,
  menuLabel,
  triggerLabel,
  sharePath,
  onEdit,
  onResolve,
  onReopen,
  onDelete,
  onReport,
  labels,
}: ConversationMenuProps) {
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${sharePath ?? `/community?post=${targetId}`}`
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
  }, [targetId, sharePath])

  const handleAction = useCallback(
    (key: React.KeyboardEvent | React.MouseEvent | string | number) => {
      if (key === "edit") {
        onEdit?.()
      } else if (key === "resolve") {
        onResolve?.()
      } else if (key === "reopen") {
        onReopen?.()
      } else if (key === "delete") {
        onDelete?.()
      } else if (key === "share") {
        void handleShare()
      } else if (key === "report") {
        onReport?.()
      }
    },
    [onEdit, onResolve, onReopen, onDelete, onReport, handleShare],
  )

  return (
    <Dropdown>
      <Dropdown.Trigger aria-label={triggerLabel} className="rounded-full min-h-11 min-w-11">
        <MoreHorizontal size={18} aria-hidden="true" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label={menuLabel} onAction={handleAction}>
          {onEdit ? (
            <Dropdown.Item key="edit" id="edit" className={ITEM_CLASS}>
              {labels?.edit ?? "Editar"}
            </Dropdown.Item>
          ) : null}
          {onResolve ? (
            <Dropdown.Item key="resolve" id="resolve" className={ITEM_CLASS}>
              {labels?.resolve ?? "Marcar como resolvida"}
            </Dropdown.Item>
          ) : null}
          {onReopen ? (
            <Dropdown.Item key="reopen" id="reopen" className={ITEM_CLASS}>
              {labels?.reopen ?? "Reabrir pergunta"}
            </Dropdown.Item>
          ) : null}
          <Dropdown.Item key="share" id="share" className={ITEM_CLASS}>
            {labels?.share ?? "Compartilhar"}
          </Dropdown.Item>
          {onDelete ? (
            <Dropdown.Item key="delete" id="delete" className={ITEM_CLASS}>
              {labels?.delete ?? "Excluir"}
            </Dropdown.Item>
          ) : null}
          {onReport ? (
            <Dropdown.Item key="report" id="report" className={ITEM_CLASS}>
              {labels?.report ?? "Denunciar"}
            </Dropdown.Item>
          ) : null}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
