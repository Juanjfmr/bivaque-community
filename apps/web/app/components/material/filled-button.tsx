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
  disabled,
  href,
  id,
  type = "button",
}: MaterialFilledButtonProperties) {
  useEffect(() => {
    void registerLandingElements()
  }, [])

  // Com `href`, o Material Web renderiza um `<a>` dentro do shadow root: o CTA
  // continua sendo um link de verdade (funciona sem JavaScript, o leitor de
  // tela anuncia "link" e o navegador abre em outra aba). Sem `href`, o mesmo
  // componente segue sendo um `<button>`. A forma e a cor vêm dos tokens
  // (brand-tokens.css).
  return (
    <md-filled-button className={className} disabled={disabled} href={href} id={id} type={type}>
      {children}
    </md-filled-button>
  )
}
