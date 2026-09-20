"use client"

// Menu transbordante do cartão de publicação. Vive separado do cartão porque
// é a única peça que conhece as ações do post (ocultar, compartilhar,
// denunciar, editar) — o cartão decide SE oferece editar (autoria), o menu
// só renderiza o que recebeu.
//
// DS-006: o mesmo menu serve o pedido e a resposta de indicação. Os rótulos
// mudam (o alvo não é uma publicação) e o link de compartilhar é o do pedido;
// o comportamento e o nome acessível do gatilho — "Mais opções", que
// tests/e2e/reports-member-flow.spec.ts clica — continuam os do feed.

import { Dropdown } from "@heroui/react"
import { MoreHorizontal } from "lucide-react"
import { useCallback } from "react"

// Alvo mínimo dos itens do menu: 44px, a régua que a auditoria pediu para o menu
// contextual. O componente é compartilhado, então o feed e o fluxo de indicação
// passam a cumprir juntos — a mudança é deliberada, não efeito colateral.
const ITEM_CLASS = "min-h-11"

interface LeanOverflowMenuProps {
  postId: string
  onHide?: ((postId: string) => void) | undefined
  onReport?: (() => void) | undefined
  /** presente só quando o post é da própria pessoa (autorias conferidas no
   *  servidor; o item aparece para quem o UPDATE da RLS aceita) */
  onEdit?: (() => void) | undefined
  /** Exclusão do próprio conteúdo. O feed não usa este item; o pedido e a
   *  resposta de indicação usam, para a ação destrutiva não virar botão
   *  visível ao lado da ação primária. */
  onDelete?: (() => void) | undefined
  /** Nomes dos itens quando o alvo é um pedido ou uma resposta de indicação. */
  labels?: {
    edit?: string
    delete?: string
    hide?: string
    share?: string
    report?: string
  }
  /** Caminho a compartilhar quando não é uma publicação (ex.: /recommendations). */
  sharePath?: string
  /** Nome acessível do menu; o padrão é o da publicação. */
  menuLabel?: string
  /** Nome acessível do gatilho. Mantido "Mais opções" por padrão: o e2e do
   *  fluxo de denúncia clica exatamente por ele. */
  triggerLabel?: string
}

export function LeanOverflowMenu({
  postId,
  onHide,
  onReport,
  onEdit,
  onDelete,
  labels,
  sharePath,
  menuLabel = "Ações da publicação",
  triggerLabel = "Mais opções",
}: LeanOverflowMenuProps) {
  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}${sharePath ?? `/community?post=${postId}`}`
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
  }, [postId, sharePath])

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
      } else if (key === "delete") {
        onDelete?.()
      }
    },
    [postId, onHide, onReport, onEdit, onDelete, handleShare],
  )

  return (
    <Dropdown>
      {/* O Trigger JÁ é um Button (DropdownTriggerProps extends
          ComponentPropsWithRef<typeof Button>): envolver outro botão aqui
          produzia <button> dentro de <button> — HTML inválido e erro de
          hidratação no console de toda tela com cartão de publicação. As props
          do botão vão no próprio Trigger. O nome acessível segue "Mais opções"
          porque tests/e2e/reports-member-flow.spec.ts clica por ele. */}
      <Dropdown.Trigger aria-label={triggerLabel} className="rounded-full min-h-11 min-w-11">
        <MoreHorizontal size={18} aria-hidden="true" />
      </Dropdown.Trigger>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label={menuLabel} onAction={handleAction}>
          {onEdit ? (
            <Dropdown.Item key="edit" id="edit" className={ITEM_CLASS}>
              {labels?.edit ?? "Editar publicação"}
            </Dropdown.Item>
          ) : null}
          {onDelete ? (
            <Dropdown.Item key="delete" id="delete" className={ITEM_CLASS}>
              {labels?.delete ?? "Excluir publicação"}
            </Dropdown.Item>
          ) : null}
          <Dropdown.Item key="hide" id="hide" className={ITEM_CLASS}>
            {labels?.hide ?? "Ocultar publicação"}
          </Dropdown.Item>
          <Dropdown.Item key="share" id="share" className={ITEM_CLASS}>
            {labels?.share ?? "Compartilhar"}
          </Dropdown.Item>
          {/* F160: o post e o alvo central do fluxo de moderacao e era o unico
              sem acao de denuncia — o comentario tinha, o post nao. O menu e o
              lugar certo: um "Denunciar" visivel em cada card do feed convida
              ao uso e polui a leitura. */}
          <Dropdown.Item key="report" id="report" className={ITEM_CLASS}>
            {labels?.report ?? "Denunciar publicação"}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
