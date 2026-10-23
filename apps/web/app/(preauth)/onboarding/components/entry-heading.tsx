"use client"

import { type ReactNode, useEffect, useRef } from "react"

// PORT-004: o título de cada passo recebe o foco ao abrir, como
// `entryFocusTitle` no protótipo: o leitor de tela anuncia o passo novo em vez
// de deixar a pessoa procurando onde a tela mudou. O contorno sai em
// entry-elegibilidade.css, porque o título não é interativo.
//
// É cliente porque o foco é um efeito do navegador. As telas de servidor
// (documento e análise) usam este componente; a de CPF também, para que as três
// se comportem do mesmo jeito.
export function EntryHeading({ children }: Readonly<{ children: ReactNode }>) {
  const heading = useRef<HTMLHeadingElement | null>(null)

  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [])

  return (
    <h1 className="en-h1" ref={heading} tabIndex={-1}>
      {children}
    </h1>
  )
}
