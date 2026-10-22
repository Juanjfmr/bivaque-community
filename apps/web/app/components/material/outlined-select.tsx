"use client"

// PORT-002 (lote 4 da entrada): adaptador cliente do `md-outlined-select` com
// `md-select-option`. A tela passa as opções como dados; o adaptador escreve os
// `<md-select-option>` no slot do Material, que é o que a seleção lê para
// montar o menu e o texto exibido.
import { useEffect, useRef } from "react"
import type {
  MaterialOutlinedSelectProperties,
  MaterialSelectElement,
} from "../../../types/material-web"
import { registerOutlinedSelect } from "./register"

export function MaterialOutlinedSelect({
  className,
  disabled,
  error,
  errorText,
  id,
  label,
  onChange,
  options,
  required,
  supportingText,
  value = "",
}: MaterialOutlinedSelectProperties) {
  const select = useRef<MaterialSelectElement | null>(null)

  useEffect(() => {
    void registerOutlinedSelect()
  }, [])

  // A seleção não é um `<select>` nativo: `value` é acessor do elemento e
  // escrevê-lo antes do registro criaria uma propriedade própria que passaria
  // por cima do acessor. A escrita espera o registro, como no campo de texto.
  useEffect(() => {
    let active = true
    void registerOutlinedSelect().then(() => {
      const element = select.current
      if (!active || !element || element.value === value) return
      element.value = value
    })
    return () => {
      active = false
    }
  }, [value])

  useEffect(() => {
    const element = select.current
    if (!element) return
    const handleChange = () => onChange?.(element.value)
    element.addEventListener("change", handleChange)
    return () => element.removeEventListener("change", handleChange)
  }, [onChange])

  return (
    <md-outlined-select
      className={className}
      disabled={disabled}
      error={error}
      error-text={errorText}
      id={id}
      label={label}
      ref={select}
      required={required}
      supporting-text={supportingText}
      value={value}
    >
      {options.map((option) => (
        <md-select-option
          disabled={option.disabled}
          key={option.value}
          selected={option.value === value}
          value={option.value}
        >
          <div slot="headline">{option.label}</div>
        </md-select-option>
      ))}
    </md-outlined-select>
  )
}
