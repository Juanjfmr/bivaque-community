import { useEffect, useState } from "react"

/**
 * O estado de tela que a casca lê do navegador — a largura — num lugar só.
 * As decisões que dependem dela são puras e vivem em `lib/casca.ts`; aqui é só
 * a leitura.
 */
export function useLarguraDaTela(): number {
  const [largura, definirLargura] = useState(() =>
    typeof window === "undefined" ? 1440 : window.innerWidth,
  )

  useEffect(() => {
    const aoMudar = () => definirLargura(window.innerWidth)
    window.addEventListener("resize", aoMudar)
    definirLargura(window.innerWidth)
    return () => window.removeEventListener("resize", aoMudar)
  }, [])

  return largura
}
