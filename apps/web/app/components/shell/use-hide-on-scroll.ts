"use client"

import { type RefObject, useEffect, useState } from "react"

// Rolar para baixo é ler: o que não é conteúdo sai do caminho. Rolar para cima
// é procurar: volta. Usado pelo botão flutuante de criação e pela linha de
// busca do cabeçalho no celular (25/09/2026). O contêiner que rola é o `main`
// do shell, não a janela.

/** Quanto rolar numa direção antes de reagir: tremida de dedo não conta. */
export const SCROLL_SLACK = 12
/** Perto do topo, tudo fica à vista. */
export const SCROLL_TOP_ZONE = 96

/**
 * `disabled` mantém à vista (menu aberto, por exemplo). `keepWhileFocused`:
 * enquanto o foco estiver dentro desse elemento (alguém digitando na busca),
 * ele não some.
 */
export function useHideOnScroll({
  disabled = false,
  keepWhileFocused,
}: {
  disabled?: boolean
  keepWhileFocused?: RefObject<HTMLElement | null>
} = {}) {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (disabled) {
      setHidden(false)
      return
    }
    const scroller = document.querySelector("main")
    if (!scroller) return
    let anchor = scroller.scrollTop
    const onScroll = () => {
      const y = scroller.scrollTop
      if (y < SCROLL_TOP_ZONE) {
        setHidden(false)
        anchor = y
        return
      }
      if (y - anchor > SCROLL_SLACK) {
        const focusInside = keepWhileFocused?.current?.contains(document.activeElement) ?? false
        if (!focusInside) setHidden(true)
        anchor = y
      } else if (anchor - y > SCROLL_SLACK) {
        setHidden(false)
        anchor = y
      }
    }
    scroller.addEventListener("scroll", onScroll, { passive: true })
    return () => scroller.removeEventListener("scroll", onScroll)
  }, [disabled, keepWhileFocused])

  return { hidden, reveal: () => setHidden(false) }
}
