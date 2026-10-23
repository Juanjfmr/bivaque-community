"use client"

// PORT-002 (lote 4 da entrada): adaptador cliente do `md-outlined-text-field`.
// O registro do elemento é do cliente e só do módulo do campo; o React não
// controla elemento desconhecido como controla `<input>`, então o valor e o
// evento são sincronizados à mão.
import { useCallback, useEffect, useRef } from "react"
import type {
  MaterialOutlinedTextFieldProperties,
  MaterialTextFieldElement,
} from "../../../types/material-web"
import { valueToRestore } from "./controlled-value"
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
  // Antes do registro, `value` não é acessor: escrever criaria uma propriedade
  // própria no elemento ainda não definido, que passaria por cima do acessor do
  // Material para sempre. Por isso a sincronização só age depois da promessa.
  const ready = useRef(false)
  // A checagem pós-evento e o efeito de cada render leem a prop do render mais
  // recente; a ref evita re-registrar o listener a cada tecla digitada.
  const controlled = useRef(value)
  controlled.current = value

  const syncValue = useCallback(() => {
    const element = field.current
    if (!element || !ready.current) return
    const restore = valueToRestore(element.value, controlled.current)
    if (restore !== undefined) element.value = restore
  }, [])

  useEffect(() => {
    let active = true
    void registerOutlinedTextField().then(() => {
      if (!active) return
      ready.current = true
      syncValue()
    })
    return () => {
      active = false
    }
  }, [syncValue])

  // A cada render: quando o pai recusa a mudança, o estado pode nem mudar, mas
  // se mudou para outro valor o elemento precisa voltar ao valor da prop.
  useEffect(() => {
    syncValue()
  })

  // O Material reemite o `input` do `<input>` do shadow root, e o valor já está
  // atualizado quando o evento sai. `onChange` recebe a string, não o evento:
  // quem chama não precisa saber que existe um shadow root no caminho.
  useEffect(() => {
    const element = field.current
    if (!element) return
    const handleInput = () => {
      onChange?.(element.value)
      // O pai pode recusar sem re-renderizar (um `onChange` que só filtra
      // letras, por exemplo). O microtask roda depois do lote do React: se o pai
      // aceitou, o valor do elemento já é a prop e nada é escrito; se recusou, a
      // prop volta para o elemento.
      queueMicrotask(syncValue)
    }
    element.addEventListener("input", handleInput)
    return () => element.removeEventListener("input", handleInput)
  }, [onChange, syncValue])

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
