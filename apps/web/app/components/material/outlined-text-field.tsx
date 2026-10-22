"use client"

// PORT-002 (lote 4 da entrada): adaptador cliente do `md-outlined-text-field`.
// O registro do elemento é do cliente e só do módulo do campo; o React não
// controla elemento desconhecido como controla `<input>`, então o valor e o
// evento são sincronizados à mão.
import { useEffect, useRef } from "react"
import type {
  MaterialOutlinedTextFieldProperties,
  MaterialTextFieldElement,
} from "../../../types/material-web"
import { registerOutlinedTextField } from "./register"

export function MaterialOutlinedTextField({
  autocomplete,
  children,
  className,
  disabled,
  error,
  errorText,
  id,
  inputmode,
  label,
  maxlength,
  minlength,
  name,
  onChange,
  placeholder,
  readOnly,
  required,
  supportingText,
  type,
  value = "",
}: MaterialOutlinedTextFieldProperties) {
  const field = useRef<MaterialTextFieldElement | null>(null)

  useEffect(() => {
    void registerOutlinedTextField()
  }, [])

  // Depois do registro, o `value` é propriedade reativa do elemento: escrever a
  // propriedade atualiza o `<input>` do shadow root, inclusive quando o programa
  // limpa o campo. Escrever antes do registro criaria uma propriedade própria no
  // elemento ainda não definido, que passaria por cima do acessor do Material
  // para sempre. Por isso a escrita espera a promessa.
  useEffect(() => {
    let active = true
    void registerOutlinedTextField().then(() => {
      const element = field.current
      if (!active || !element || element.value === value) return
      element.value = value
    })
    return () => {
      active = false
    }
  }, [value])

  // O Material reemite o `input` do `<input>` do shadow root, e o valor já está
  // atualizado quando o evento sai. `onChange` recebe a string, não o evento:
  // quem chama não precisa saber que existe um shadow root no caminho.
  useEffect(() => {
    const element = field.current
    if (!element) return
    const handleInput = () => onChange?.(element.value)
    element.addEventListener("input", handleInput)
    return () => element.removeEventListener("input", handleInput)
  }, [onChange])

  return (
    <md-outlined-text-field
      autocomplete={autocomplete}
      className={className}
      disabled={disabled}
      error={error}
      error-text={errorText}
      id={id}
      inputmode={inputmode}
      label={label}
      maxlength={maxlength}
      minlength={minlength}
      name={name}
      placeholder={placeholder}
      readonly={readOnly}
      ref={field}
      required={required}
      supporting-text={supportingText}
      type={type}
      value={value}
    >
      {children}
    </md-outlined-text-field>
  )
}
