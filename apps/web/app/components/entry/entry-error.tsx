import type { ReactNode } from "react"

// PORT-002 (lote 4 da entrada): a área de erro do protótipo (`.en-err` em
// entry.css, usada por `entryError` em account.js). A linha existe sempre, com
// altura mínima, para o formulário não pular quando a mensagem aparece; e
// `role="alert"` faz o leitor de tela anunciar a mensagem no momento em que ela
// entra, sem a pessoa precisar procurá-la.
type EntryErrorProperties = Readonly<{
  children?: ReactNode
  id?: string | undefined
}>

export function EntryError({ children, id }: EntryErrorProperties) {
  return (
    <p className="en-err" id={id} role="alert">
      {children}
    </p>
  )
}
