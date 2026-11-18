import { useEffect } from "react"

/**
 * O tema do lado do JS: o `data-tema` do documento e a cor da barra do
 * navegador (inventário §5.9: `theme()`).
 *
 * O lançamento é só claro (dono, 14/11): o app força `data-tema="claro"` e a
 * barra clara, sem seguir o `prefers-color-scheme`. O escuro continua no CSS,
 * dormente atrás de `:root[data-tema="escuro"]`, para voltar sem reescrever
 * tokens.
 */
export const COR_DA_BARRA = { claro: "#F3F5F6", escuro: "#101417" } as const

export function useCorDaBarraDoSistema(): void {
  useEffect(() => {
    document.documentElement.dataset["tema"] = "claro"
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute("content", COR_DA_BARRA.claro)
  }, [])
}
