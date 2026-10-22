"use client"

// PORT-001 (R73): adaptador cliente do `md-filled-button`. O texto do CTA é
// escrito no componente de servidor e chega aqui como children — quem é
// cliente é só o wrapper e o registro do elemento.
import { useEffect } from "react"
import type { MaterialFilledButtonProperties } from "../../../types/material-web"
import { registerLandingElements } from "./register"

export function MaterialFilledButton({
  children,
  className,
  "data-href": dataHref,
  disabled,
  id,
  type = "button",
}: MaterialFilledButtonProperties) {
  useEffect(() => {
    void registerLandingElements()
  }, [])

  // A forma e a cor vêm dos tokens (brand-tokens.css); o clique é delegado pela
  // ilha de comportamento, que lê `data-href`.
  return (
    <md-filled-button
      className={className}
      data-href={dataHref}
      disabled={disabled}
      id={id}
      type={type}
    >
      {children}
    </md-filled-button>
  )
}
