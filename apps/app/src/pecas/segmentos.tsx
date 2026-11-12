import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Segmentos de uma página (peça nova, 12/11/2026): as seções irmãs de uma lista
 * que dividem o mesmo assunto — no Mercado, Desapegos · Imóveis · Negócios.
 *
 * Cada segmento navega de verdade, no molde das sub-abas do Mercado
 * (`ChipsDeFiltro` + `navegacao.irPara`); o ativo leva `aria-current="page"` e
 * pinta a Brasa, que o parecer de 12/11 pediu para o realce e que o medidor da
 * tela prova em AA nos dois temas. A contagem vem ao lado do rótulo, quando a
 * tela tem o número; com mais páginas o `+` diz que o número é um piso. Sem
 * número conhecido o segmento mostra só o nome: contagem inventada não existe.
 */
export type ItemDeSegmento = {
  readonly id: string
  readonly rotulo: string
  /** Itens que a lista já tem. `null` quando a contagem ainda não chegou. */
  readonly contagem?: number | null
  /** Há mais páginas: o número é um piso. */
  readonly temMais?: boolean
}

export function Segmentos({
  itens,
  valor,
  aoEscolher,
  rotulo,
  acao,
}: {
  itens: readonly ItemDeSegmento[]
  valor: string
  aoEscolher: (id: string) => void
  /** Nome do grupo para leitor de tela ("Seções do Mercado"). */
  rotulo: string
  /** O atalho de cadastro, quando a tela tem um: fica à direita dos segmentos. */
  acao?: ReactNode
}) {
  return (
    <div data-segmentos="mercado" className="flex min-w-0 flex-wrap items-center gap-2">
      <nav
        aria-label={rotulo}
        className="flex min-w-0 max-w-full flex-1 gap-1 overflow-x-auto overscroll-x-contain"
      >
        {itens.map((item) => {
          const ativo = item.id === valor
          return (
            <button
              key={item.id}
              type="button"
              data-secao={item.id}
              aria-current={ativo ? "page" : undefined}
              onClick={() => {
                if (!ativo) aoEscolher(item.id)
              }}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-4 text-sm font-medium",
                ativo
                  ? "bg-(--brasa) text-(--brasa-foreground)"
                  : "bg-(--surface-lowest) text-(--foreground) ring-1 ring-(--outline-variant) hover:bg-(--surface-low)",
              )}
            >
              {item.rotulo}
              {item.contagem === null || item.contagem === undefined ? null : (
                <span data-contagem="segmento" className="text-xs tabular-nums">
                  {item.contagem}
                  {item.temMais === true ? <span aria-hidden="true">+</span> : null}
                </span>
              )}
            </button>
          )
        })}
      </nav>
      {acao === undefined ? null : <div className="shrink-0">{acao}</div>}
    </div>
  )
}
