"use client"

import { useEffect, useState } from "react"
import { type NoveltyWindow, noveltyWindow, swapLastVisit } from "./novelty"

// Lida uma vez por carga do app: voltar ao Início pela barra inferior no meio
// da mesma sessão mantém a mesma linha de corte (a novidade não some porque a
// pessoa foi ao Mercado e voltou), e o efeito dobrado do modo estrito não lê o
// que ele mesmo acabou de gravar.
let session: { previous: number | null; openedAt: Date } | undefined

function readStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * `undefined` enquanto não montou (o servidor não conhece o navegador); `null`
 * quando não há visita anterior; senão, a janela do que é novo.
 */
export function useNoveltyWindow(): NoveltyWindow | null | undefined {
  const [span, setSpan] = useState<NoveltyWindow | null | undefined>(undefined)

  useEffect(() => {
    if (session === undefined) {
      const openedAt = new Date()
      session = { previous: swapLastVisit(readStorage(), openedAt), openedAt }
    }
    setSpan(noveltyWindow(session.previous, session.openedAt))
  }, [])

  return span
}
