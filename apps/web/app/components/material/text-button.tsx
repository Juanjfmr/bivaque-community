"use client"

// PORT-002 (lote 4 da entrada): adaptador cliente do `md-text-button` — a ação
// de texto da entrada ("Entrar", "Esqueci minha senha", "Cancelar" no
// diálogo). Com `href`, o Material renderiza um `<a>` no shadow root; sem ele,
// um `<button>`.
import { useEffect } from "react"
import type { MaterialActionButtonProperties } from "../../../types/material-web"
import { registerTextButton } from "./register"

export function MaterialTextButton({
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
    void registerTextButton()
  }, [])

  return (
    <md-text-button
      className={className}
      disabled={disabled}
      href={href}
      id={id}
      onClick={onClick}
      target={target}
      type={type}
    >
      {children}
    </md-text-button>
  )
}
