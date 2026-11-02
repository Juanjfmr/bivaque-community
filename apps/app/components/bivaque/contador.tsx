"use client"

import { useEffect, useRef, useState } from "react"

import { CONTAGEM, prefersReduzido, progressoDaContagem } from "@/lib/movimento"
import { cn } from "@/lib/utils"
import { AvataresEmpilhados } from "./avatar"

/**
 * Contagem animada (inventário §7: `animateCounts` / `countUp` / `countHtml`) e
 * a pilha de avatares do mesmo arquivo.
 *
 * Regras do protótipo preservadas: só anima de 2 para cima, o valor final está
 * no DOM desde o começo (o intermediário fica escondido de leitor de tela) e,
 * com movimento reduzido, o valor final aparece na hora.
 */
export function Contador({
  para,
  de = 0,
  rotulo,
  className,
}: {
  para: number
  de?: number
  /** Nome curto do número, para leitor de tela. */
  rotulo?: string
  className?: string
}) {
  const animavel = para >= CONTAGEM.minimoParaAnimar
  const [mostrado, setMostrado] = useState(() => (prefersReduzido() ? para : de))
  const [animando, setAnimando] = useState(false)
  const jaRodou = useRef(false)

  useEffect(() => {
    if (!animavel || jaRodou.current || prefersReduzido()) {
      setMostrado(para)
      return
    }
    jaRodou.current = true
    setAnimando(true)
    let quadro = 0
    const inicio = performance.now()
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / CONTAGEM.duracao)
      setMostrado(Math.round(de + (para - de) * progressoDaContagem(t)))
      if (t < 1) {
        quadro = requestAnimationFrame(passo)
        return
      }
      setMostrado(para)
      setAnimando(false)
    }
    quadro = requestAnimationFrame(passo)
    return () => cancelAnimationFrame(quadro)
  }, [animavel, de, para])

  return (
    <span className={cn("inline-flex items-baseline gap-1", className)}>
      <b
        data-contador-animado="sim"
        data-contando={animando ? "sim" : "nao"}
        className="text-lg font-bold"
      >
        {mostrado}
      </b>
      {rotulo === undefined ? null : (
        <span className="text-[13px] text-(--on-surface-variant)">{rotulo}</span>
      )}
      {animando ? (
        // O leitor de tela não ouve o número correndo: ouve o valor final.
        <span
          className="sr-only"
          aria-hidden="false"
        >{`${para}${rotulo ? ` ${rotulo}` : ""}`}</span>
      ) : null}
    </span>
  )
}

/** O par do contador: quem indicou, em avatares sobrepostos. */
export function QuemIndicou({ nomes, total }: { nomes: readonly string[]; total: number }) {
  return (
    <span className="flex items-center gap-2">
      <AvataresEmpilhados nomes={nomes} total={total} />
      <span className="text-[13px] text-(--on-surface-variant)">{`${total} indicações`}</span>
    </span>
  )
}
