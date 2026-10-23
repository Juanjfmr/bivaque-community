"use client"

// PORT-002 (lote 4 da entrada): adaptador cliente do `md-icon-button`. O rótulo
// acessível é obrigatório: o botão só tem um glifo, e sem `aria-label` o leitor
// de tela anuncia "botão" e nada mais. Com `href`, o Material renderiza um
// `<a>` dentro do shadow root, como no botão preenchido — é o que o "Voltar" da
// casca da entrada usa para continuar sendo navegação de verdade.
import { useEffect } from "react"
import type { MaterialIconButtonProperties } from "../../../types/material-web"
import { registerIconButton } from "./register"

export function MaterialIconButton({
  children,
  className,
  disabled,
  href,
  id,
  label,
  onClick,
  slot,
  target,
  type = "button",
}: MaterialIconButtonProperties) {
  useEffect(() => {
    void registerIconButton()
  }, [])

  return (
    <md-icon-button
      aria-label={label}
      className={className}
      disabled={disabled}
      href={href}
      id={id}
      onClick={onClick}
      slot={slot}
      target={target}
      type={type}
    >
      {children}
    </md-icon-button>
  )
}
