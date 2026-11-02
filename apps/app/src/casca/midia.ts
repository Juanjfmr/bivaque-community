import { useEffect, useState } from "react"

/**
 * Uma consulta de mídia como estado do React. Serve para o menu Criar saber se
 * está em pilha (celular) ou painel (a partir de 1024 px) e para o painel se
 * fechar sozinho quando a janela encolhe — como no protótipo
 * (`shell/create-menu.js:84`).
 */
export function useStateComMidia(consulta: string): boolean {
  const [combina, definirCombina] = useState(() =>
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? false
      : window.matchMedia(consulta).matches,
  )

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const midia = window.matchMedia(consulta)
    const aoMudar = () => definirCombina(midia.matches)
    definirCombina(midia.matches)
    midia.addEventListener("change", aoMudar)
    return () => midia.removeEventListener("change", aoMudar)
  }, [consulta])

  return combina
}
