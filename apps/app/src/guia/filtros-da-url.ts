/**
 * O recorte do Guia no endereço (LAN-TROCA): o link `/guide?q=<termo>&categoria=<cat>`
 * chega ao app como `/app/guia?q=<termo>&categoria=<cat>` e a tela abre já com o
 * termo no campo e a categoria filtrada. Lógica pura, sem roteador: é aqui que a
 * leitura do endereço é provada por teste.
 *
 * O termo vale com o mesmo critério do servidor (`termoAceito` em
 * `apps/web/lib/guide/app-guia.ts`): aparado e até 80 caracteres. Um caractere
 * só já vale — no Guia a digitação filtra a partir da primeira letra. A
 * categoria só vale se for uma das que a tela conhece; qualquer outra abre o
 * Guia sem filtro de categoria, nunca num chip inventado. O `?locality=` do
 * guia antigo não é lido: o app lista só a cidade da sessão.
 */

import { CATEGORIAS_DO_GUIA, type CategoriaDoGuia } from "@/lib/dados/guia"

/** O mesmo teto de `q` da rota `/api/app/guia`: acima dele a resposta é recusa. */
export const LIMITE_DO_TERMO = 80

export type FiltrosDoGuia = Readonly<{ termo: string; categoria: CategoriaDoGuia | null }>

/** O termo do endereço, aparado quando cabe no pedido; senão `""`. */
export function termoDoGuia(valor: unknown): string {
  if (typeof valor !== "string") return ""
  const termo = valor.trim()
  return termo.length > 0 && termo.length <= LIMITE_DO_TERMO ? termo : ""
}

/** A categoria do endereço, quando é uma das do Guia; senão `null`. */
export function categoriaDaUrl(valor: unknown): CategoriaDoGuia | null {
  return typeof valor === "string" && (CATEGORIAS_DO_GUIA as readonly string[]).includes(valor)
    ? (valor as CategoriaDoGuia)
    : null
}

/** O recorte semeado pelo endereço; o que não passa vira o Guia sem filtro. */
export function filtrosDaUrl(busca: Record<string, unknown>): FiltrosDoGuia {
  return { termo: termoDoGuia(busca["q"]), categoria: categoriaDaUrl(busca["categoria"]) }
}
