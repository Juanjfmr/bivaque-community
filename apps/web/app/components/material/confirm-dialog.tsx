"use client"

// PORT-002 (lote 4 da entrada): o diálogo de confirmação do protótipo
// (`confirm` em shell/dialogs.js): título, texto, uma ação de texto para
// cancelar e a ação que decide. O `md-dialog` prende o foco enquanto está
// aberto; o adaptador devolve o foco ao elemento que o abriu quando ele fecha,
// que é o que o protótipo faz no evento `closed`.
//
// O diálogo é controlado por `open`: quem chama guarda o booleano e o vira
// `false` em `onConfirm`/`onCancel`. Fechar pelo Esc ou pelo clique no scrim
// também passa por `onCancel`, para o estado de fora não ficar preso em aberto.
import { useEffect, useRef, useState } from "react"
import type {
  MaterialConfirmDialogProperties,
  MaterialDialogElement,
} from "../../../types/material-web"
import { MaterialFilledButton } from "./filled-button"
import { registerDialog } from "./register"
import { MaterialTextButton } from "./text-button"

export function MaterialConfirmDialog({
  cancelLabel = "Cancelar",
  confirmLabel,
  danger = false,
  onCancel,
  onConfirm,
  open,
  text,
  title,
}: MaterialConfirmDialogProperties) {
  const dialog = useRef<MaterialDialogElement | null>(null)
  const returnFocus = useRef<Element | null>(null)
  // `settled` separa "esta escolha veio do adaptador" de "o diálogo fechou
  // sozinho" (Esc, clique fora): só o segundo caso ainda precisa avisar quem
  // chamou. Sem ele, o `closed` de uma escolha já tratada chamaria `onCancel`
  // por cima do `onConfirm`.
  const settled = useRef(false)
  // Antes do registro, `md-dialog` é um elemento desconhecido: o conteúdo no
  // light DOM aparece como HTML comum, e o diálogo fechado mostraria título,
  // texto e ações sem JavaScript. Montar o conteúdo só depois do registro
  // mantém o fechado invisível; o `show()` espera o mesmo registro, então
  // quando ele roda os slots já estão preenchidos.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (open) returnFocus.current = document.activeElement
  }, [open])

  useEffect(() => {
    let active = true
    void registerDialog().then(() => {
      if (active) setReady(true)
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const element = dialog.current
    if (!element || !ready) return
    if (open && !element.open) {
      settled.current = false
      void element.show()
    }
    if (!open && element.open) void element.close()
  }, [open, ready])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const handleClosed = () => {
      const target = returnFocus.current
      returnFocus.current = null
      if (target instanceof HTMLElement && target.isConnected) target.focus({ preventScroll: true })
      if (settled.current) return
      settled.current = true
      onCancel()
    }
    element.addEventListener("closed", handleClosed)
    return () => element.removeEventListener("closed", handleClosed)
  }, [onCancel])

  // Desmontar com o diálogo aberto (a tela trocou de passo) não emite `closed`:
  // sem esta limpeza, o foco ficaria no `body`.
  useEffect(() => {
    return () => {
      const target = returnFocus.current
      returnFocus.current = null
      if (target instanceof HTMLElement && target.isConnected) target.focus({ preventScroll: true })
    }
  }, [])

  const choose = (confirmed: boolean) => {
    settled.current = true
    if (confirmed) onConfirm()
    else onCancel()
  }

  return (
    <md-dialog ref={dialog}>
      {ready ? (
        <>
          <div slot="headline">{title}</div>
          <div slot="content">{text}</div>
          <div className="dialog-actions" slot="actions">
            <MaterialTextButton onClick={() => choose(false)} type="button">
              {cancelLabel}
            </MaterialTextButton>
            <MaterialFilledButton
              className={danger ? "danger-fill" : undefined}
              onClick={() => choose(true)}
              type="button"
            >
              {confirmLabel}
            </MaterialFilledButton>
          </div>
        </>
      ) : null}
    </md-dialog>
  )
}
