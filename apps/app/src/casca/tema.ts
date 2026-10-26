import { useEffect } from "react"

/**
 * O tema do sistema, do lado do JS: o `data-tema` do documento e a cor da barra
 * do navegador (inventário §5.9: `theme()`).
 *
 * As **cores** não passam por aqui: elas são tokens de CSS que trocam sozinhos
 * com `prefers-color-scheme`. O que não dá para fazer só com CSS é o
 * `<meta name="theme-color">`, e é isso que este gancho acompanha — inclusive
 * quando a pessoa troca o tema com o app aberto.
 */
export const COR_DA_BARRA = { claro: "#F2F0EB", escuro: "#171E20" } as const

export function useCorDaBarraDoSistema(): void {
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return
    const midia = window.matchMedia("(prefers-color-scheme: dark)")
    const aplicar = () => {
      const escuro = midia.matches
      document.documentElement.dataset["tema"] = escuro ? "escuro" : "claro"
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute("content", escuro ? COR_DA_BARRA.escuro : COR_DA_BARRA.claro)
    }
    aplicar()
    midia.addEventListener("change", aplicar)
    return () => midia.removeEventListener("change", aplicar)
  }, [])
}
