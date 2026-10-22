"use client"

// PORT-002 (lote 4 da entrada): adaptador cliente do `md-checkbox`. O protótipo
// envolve o checkbox num `<label>` com o texto ao lado (`en-check` em
// account.js), e é assim que o clique no texto também marca. O estado é
// controlado: o `change` do Material volta como booleano pelo `onChange`, e o
// adaptador reescreve a propriedade quando o valor de fora muda.
import { useEffect, useId, useRef } from "react"
import type {
  MaterialCheckboxElement,
  MaterialCheckboxProperties,
} from "../../../types/material-web"
import { registerCheckbox } from "./register"

export function MaterialCheckbox({
  "aria-describedby": describedBy,
  checked = false,
  className,
  disabled,
  id,
  label,
  onChange,
}: MaterialCheckboxProperties) {
  const checkbox = useRef<MaterialCheckboxElement | null>(null)
  // O `<label>` precisa apontar para o controle. O id vem de quem chama quando
  // a tela usa `aria-describedby` ou erro por id; sem id, um `useId` local
  // mantém o clique no texto marcando o checkbox sem inventar um id global.
  const generatedId = useId()
  const checkboxId = id ?? generatedId

  useEffect(() => {
    void registerCheckbox()
  }, [])

  useEffect(() => {
    let active = true
    void registerCheckbox().then(() => {
      const element = checkbox.current
      if (!active || !element || element.checked === checked) return
      element.checked = checked
    })
    return () => {
      active = false
    }
  }, [checked])

  useEffect(() => {
    const element = checkbox.current
    if (!element) return
    const handleChange = () => onChange?.(element.checked)
    element.addEventListener("change", handleChange)
    return () => element.removeEventListener("change", handleChange)
  }, [onChange])

  return (
    <label className={className} htmlFor={checkboxId}>
      <md-checkbox
        aria-describedby={describedBy}
        checked={checked}
        disabled={disabled}
        id={checkboxId}
        ref={checkbox}
      />
      <span>{label}</span>
    </label>
  )
}
