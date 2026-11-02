"use client"

// PORT-001 (R73) e PORT-002: adaptador cliente do `md-filled-button`. O texto
// do CTA é escrito no componente de servidor e chega aqui como children — quem
// é cliente é só o wrapper e o registro do elemento.
import { useEffect } from "react"
import type { MaterialFilledButtonProperties } from "../../../types/material-web"
import { registerFilledButton } from "./register"

export function MaterialFilledButton({
  children,
  className,
  disabled,
  href,
  id,
  onClick,
  target,
  type = "button",
}: MaterialFilledButtonProperties) {
  useEffect(() => {
    void registerFilledButton()
  }, [])

  // Com `href`, o Material Web renderiza um `<a>` dentro do shadow root: o CTA
  // continua sendo um link de verdade (o leitor de tela anuncia "link", o
  // navegador abre em outra aba e o clique direito oferece o endereço). Sem
  // `href`, o mesmo componente segue sendo um `<button>`.
  //
  // O `<a>` nasce quando o Material registra o elemento, no efeito deste
  // adaptador — não antes. O que o HTML do servidor entrega é o conteúdo da
  // landing (inclusive o rótulo "Criar conta") dentro de `<md-filled-button>`;
  // sem JavaScript, o CTA não navega. Os links nativos da página (o "Entrar" do
  // topo e os do rodapé) continuam funcionando. A forma e a cor vêm dos tokens
  // (brand-tokens.css).
  return (
    <md-filled-button
      className={className}
      disabled={disabled}
      href={href}
      id={id}
      onClick={onClick}
      target={target}
      type={type}
    >
      {children}
    </md-filled-button>
  )
}
