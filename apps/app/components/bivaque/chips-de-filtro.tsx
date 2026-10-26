"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

/**
 * Chips de filtro (inventário §7: `filterChips` + `segmentsAfterRender`).
 *
 * O filtro escolhido **não** pinta o próprio chip: uma pílula única desliza até
 * ele (§6, item 20). O protótipo mede o chip selecionado em
 * `requestAnimationFrame` e acompanha `ResizeObserver`; aqui o indicador é
 * colocado na mesma hora do layout e observado do mesmo jeito, com a transição
 * no CSS — e desligada por movimento reduzido.
 */

export type ItemDeFiltro = { readonly id: string; readonly rotulo: string }

export function ChipsDeFiltro({
  itens,
  valor,
  aoEscolher,
  rotulo,
  className,
}: {
  itens: readonly ItemDeFiltro[]
  valor: string
  aoEscolher: (id: string) => void
  /** Nome do grupo para leitor de tela ("Filtrar por …"?). */
  rotulo: string
  className?: string
}) {
  const caixa = useRef<HTMLDivElement | null>(null)
  const [indicador, setIndicador] = useState({ esquerda: 0, largura: 0, pronto: false })

  const posicionar = useCallback(() => {
    const elemento = caixa.current
    if (!elemento) return
    const chip = elemento.querySelector<HTMLElement>(`[data-chip="${valor}"]`)
    if (!chip) return
    setIndicador((anterior) => {
      const proximo = { esquerda: chip.offsetLeft, largura: chip.offsetWidth, pronto: true }
      if (
        anterior.esquerda === proximo.esquerda &&
        anterior.largura === proximo.largura &&
        anterior.pronto
      ) {
        return anterior
      }
      return proximo
    })
  }, [valor])

  useLayoutEffect(() => {
    // A lista mudou de tamanho: mede o chip de novo. Sem itens, o indicador
    // some — é esta leitura de `itens.length` que reage à nova lista.
    if (itens.length === 0) {
      setIndicador({ esquerda: 0, largura: 0, pronto: false })
      return
    }
    posicionar()
  }, [posicionar, itens.length])

  useEffect(() => {
    const elemento = caixa.current
    if (!elemento || typeof ResizeObserver !== "function") return
    const observador = new ResizeObserver(() => posicionar())
    observador.observe(elemento)
    for (const chip of elemento.querySelectorAll("[data-chip]")) observador.observe(chip)
    return () => observador.disconnect()
  }, [posicionar])

  return (
    <div ref={caixa} data-segmento="sim" className={cn("relative flex-wrap", className)}>
      <span
        aria-hidden="true"
        data-indicador="segmento"
        className={cn(
          "bv-indicador absolute top-0 left-0 z-0 rounded-xl bg-(--secondary-container)",
          indicador.pronto ? "opacity-100" : "opacity-0",
        )}
        style={{
          width: `${indicador.largura}px`,
          height: "100%",
          transform: `translateX(${indicador.esquerda}px)`,
        }}
      />
      <ToggleGroup
        type="single"
        value={valor}
        onValueChange={(novo) => {
          if (novo !== "") aoEscolher(novo)
        }}
        variant="outline"
        spacing={2}
        aria-label={rotulo}
        className="relative z-1 flex-wrap"
      >
        {itens.map((item) => (
          <ToggleGroupItem
            key={item.id}
            value={item.id}
            data-chip={item.id}
            data-estado={valor === item.id ? "on" : "off"}
            aria-label={`Filtrar por ${item.rotulo}`}
            className="min-h-11 rounded-xl border-transparent px-4 text-(--foreground) data-[state=on]:bg-transparent data-[state=on]:text-(--on-secondary-container)"
          >
            {item.rotulo}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
