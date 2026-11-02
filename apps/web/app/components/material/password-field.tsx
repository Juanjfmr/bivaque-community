"use client"

// PORT-002 (lote 4 da entrada): o campo de senha do protótipo
// (`entryPasswordField` em account.js) — `md-outlined-text-field` com um
// `md-icon-button` no slot `trailing-icon`. O botão alterna entre mostrar e
// esconder a senha e troca o próprio nome acessível, para o leitor de tela
// anunciar a ação que o clique executa, não o estado.
import { useEffect, useState } from "react"
import type { MaterialOutlinedTextFieldProperties } from "../../../types/material-web"
import { MaterialIconButton } from "./icon-button"
import { MaterialIcon } from "./material-icon"
import { MaterialOutlinedTextField } from "./outlined-text-field"
import { passwordFieldType, passwordToggleIcon, passwordToggleLabel } from "./password-toggle"
import { registerIconButton, registerOutlinedTextField } from "./register"

type MaterialPasswordFieldProperties = Omit<MaterialOutlinedTextFieldProperties, "type"> &
  Readonly<{
    // O campo de senha do protótipo usa `current-password` para entrar e
    // `new-password` para criar a conta; quem chama escolhe.
    autocomplete?: "current-password" | "new-password" | undefined
  }>

export function MaterialPasswordField({
  autocomplete = "current-password",
  id,
  label = "Senha",
  minlength = 8,
  ...field
}: MaterialPasswordFieldProperties) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // O campo e o botão são deste componente; registrar os dois aqui evita que
    // um campo de senha sozinho dependa da ordem de montagem dos adaptadores.
    void registerOutlinedTextField()
    void registerIconButton()
  }, [])

  return (
    <MaterialOutlinedTextField
      {...field}
      autocomplete={autocomplete}
      id={id}
      label={label}
      minlength={minlength}
      type={passwordFieldType(visible)}
    >
      <MaterialIconButton
        label={passwordToggleLabel(visible)}
        onClick={() => setVisible((current) => !current)}
        slot="trailing-icon"
        type="button"
      >
        <MaterialIcon name={passwordToggleIcon(visible)} />
      </MaterialIconButton>
    </MaterialOutlinedTextField>
  )
}
