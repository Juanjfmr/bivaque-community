"use client"

// PORT-002 (lote 4 da entrada): adaptador cliente do `md-outlined-button` — a
// ação secundária da entrada ("Continuar com Google", "Começar com outra
// conta"). Mesmo contrato do botão preenchido da landing: só o wrapper é
// cliente, o texto chega como children e `href` é nativo do Material.
import { useEffect } from "react"
import type { MaterialActionButtonProperties } from "../../../types/material-web"
import { registerOutlinedButton } from "./register"

export function MaterialOutlinedButton({
  children,
  className,
  disabled,
  href,
  id,
  onClick,
  target,
  type = "button",
}: MaterialActionButtonProperties) {
  useEffect(() => {
    void registerOutlinedButton()
  }, [])

  return (
    <md-outlined-button
      className={className}
      disabled={disabled}
      href={href}
      id={id}
      onClick={onClick}
      target={target}
      type={type}
    >
      {children}
    </md-outlined-button>
  )
}
