"use client"

// PORT-002 (lote 4 da entrada): adaptador cliente do `md-checkbox`. O protótipo
// envolve o checkbox num `<label>` com o texto ao lado (`en-check` em
// account.js), e é assim que o clique no texto também marca. O estado é
// controlado: o `change` do Material volta como booleano pelo `onChange`, e o
// adaptador reescreve a propriedade quando o pai recusa a mudança.
import { useCallback, useEffect, useId, useRef } from "react"
import type {
  MaterialCheckboxElement,
  MaterialCheckboxProperties,
} from "../../../types/material-web"
import { valueToRestore } from "./controlled-value"
import { registerCheckbox } from "./register"

export function MaterialCheckbox({
  "aria-describedby": describedBy,
  ariaLabel,
  checked = false,
  className,
  disabled,
  id,
  label,
  onChange,
}: MaterialCheckboxProperties) {
  const checkbox = useRef<MaterialCheckboxElement | null>(null)
  const ready = useRef(false)
  const controlled = useRef(checked)
  controlled.current = checked
  // O `<label>` precisa apontar para o controle. O id vem de quem chama quando
  // a tela usa `aria-describedby` ou erro por id; sem id, um `useId` local
  // mantém o clique no texto marcando o checkbox sem inventar um id global.
  const generatedId = useId()
  const checkboxId = id ?? generatedId
  // O `<label>` nomeia o host, não o `<input>` dentro do shadow root: o Material
  // repassa o ARIA do host para o controle interno, então o nome acessível vai
  // por `aria-label`. Rótulo composto (com links, como o aceite dos Termos) não
  // é string; quem usa passa `ariaLabel` com o texto puro.
  const accessibleName = ariaLabel ?? (typeof label === "string" ? label : undefined)

  const syncChecked = useCallback(() => {
    const element = checkbox.current
    if (!element || !ready.current) return
    const restore = valueToRestore(element.checked, controlled.current)
    if (restore !== undefined) element.checked = restore
  }, [])

  useEffect(() => {
    let active = true
    void registerCheckbox().then(() => {
      if (!active) return
      ready.current = true
      syncChecked()
    })
    return () => {
      active = false
    }
  }, [syncChecked])

  // A cada render: se o pai recusou a marcação, o elemento volta ao `checked`
  // da prop, mesmo quando o estado de fora não mudou.
  useEffect(() => {
    syncChecked()
  })

  useEffect(() => {
    const element = checkbox.current
    if (!element) return
    const handleChange = () => {
      onChange?.(element.checked)
      // Recusa sem novo render (um `onChange` que ignora o evento) não passaria
      // pelo efeito acima; o microtask devolve a prop depois do lote do React.
      queueMicrotask(syncChecked)
    }
    element.addEventListener("change", handleChange)
    return () => element.removeEventListener("change", handleChange)
  }, [onChange, syncChecked])

  return (
    <label className={className} htmlFor={checkboxId}>
      <md-checkbox
        aria-describedby={describedBy}
        aria-label={accessibleName}
        checked={checked}
        disabled={disabled}
        id={checkboxId}
        ref={checkbox}
      />
      <span>{label}</span>
    </label>
  )
}
