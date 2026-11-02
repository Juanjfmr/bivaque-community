"use client"

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import type { NomeDeIcone } from "@/lib/icones"
import { idLocal } from "@/lib/id"
import { AVISOS } from "@/lib/movimento"
import { cn } from "@/lib/utils"
import { Icone } from "./icone"

/**
 * Os avisos (inventário §7, `shell/toasts.js`: `notify`).
 *
 * O contrato, não enfeite: o aviso mais novo fica sozinho na região viva
 * (`role="status"`, `aria-live="polite"`); os anteriores sobem para a pilha, que
 * é `aria-live="off"` para não repetir a leitura; o aviso com desfazer dura 7 s
 * em vez de 4,2 s, mostra o botão "Desfazer" e pausa no mouse ou no foco. A
 * barra fina do tempo anima — e some com movimento reduzido.
 */

export type Aviso = {
  readonly id: string
  readonly texto: string
  readonly tipo: "sucesso" | "erro" | "info"
  readonly aoDesfazer?: (() => void) | undefined
  readonly rotuloDoDesfazer: string
}

type AvisoComTempo = Aviso & { readonly criadoEm: number }

export type PedidoDeAviso = {
  readonly texto: string
  readonly tipo?: Aviso["tipo"]
  readonly desfazer?: { readonly rotulo?: string; readonly aoDesfazer: () => void }
}

export type PortaDeAvisos = {
  readonly fila: readonly Aviso[]
  avisar(pedido: PedidoDeAviso): void
  desfazer(id: string): void
  limpar(): void
}

const Contexto = createContext<PortaDeAvisos | null>(null)

const ICONE: Record<Aviso["tipo"], NomeDeIcone> = {
  sucesso: "check_circle",
  erro: "error",
  info: "info",
}

function duracaoDe(aviso: Aviso): number {
  return aviso.aoDesfazer ? AVISOS.duracaoComDesfazer : AVISOS.duracao
}

export function ProvedorDeAvisos({ children }: { children: ReactNode }) {
  const [fila, setFila] = useState<readonly AvisoComTempo[]>([])

  const desfazer = useCallback((id: string) => {
    setFila((anterior) => {
      const alvo = anterior.find((aviso) => aviso.id === id)
      if (alvo?.aoDesfazer) queueMicrotask(alvo.aoDesfazer)
      return anterior.filter((aviso) => aviso.id !== id)
    })
  }, [])

  const avisar = useCallback((pedido: PedidoDeAviso) => {
    const novo: AvisoComTempo = {
      id: idLocal("aviso-"),
      texto: pedido.texto,
      tipo: pedido.tipo ?? "sucesso",
      aoDesfazer: pedido.desfazer?.aoDesfazer,
      rotuloDoDesfazer: pedido.desfazer?.rotulo ?? "Desfazer",
      criadoEm: Date.now(),
    }
    setFila((anterior) => {
      // O aviso atual só sobe para a pilha se ainda tiver desfazer e tempo de
      // sobra; sem isso ele sai de cena quando o novo chega (`toasts.js:20-21`).
      const atual = anterior[0]
      const sobraEmpilha =
        atual !== undefined &&
        atual.aoDesfazer !== undefined &&
        duracaoDe(atual) - (Date.now() - atual.criadoEm) > AVISOS.restanteParaEmpilhar
      const pilha = sobraEmpilha ? [atual, ...anterior.slice(1)] : anterior.slice(1)
      return [novo, ...pilha].slice(0, AVISOS.maximoNaPilha + 1)
    })
  }, [])

  const limpar = useCallback(() => setFila([]), [])

  const porta = useMemo<PortaDeAvisos>(
    () => ({ fila, avisar, desfazer, limpar }),
    [fila, avisar, desfazer, limpar],
  )

  return (
    <Contexto.Provider value={porta}>
      {children}
      <RegiaoDeAvisos />
    </Contexto.Provider>
  )
}

export function useAvisos(): PortaDeAvisos {
  const porta = useContext(Contexto)
  if (!porta) throw new Error("Os avisos precisam do provedor")
  return porta
}

/** A região viva: o aviso atual e a pilha de trás. */
function RegiaoDeAvisos() {
  const { fila, desfazer } = useAvisos()
  const atual = fila[0]
  const pilha = fila.slice(1, AVISOS.maximoNaPilha + 1)
  const [emPausa, setEmPausa] = useState(false)
  const decorrido = useRef(0)
  const inicio = useRef(0)

  // O tempo do aviso que está na frente: pausa com o mouse ou o foco.
  useEffect(() => {
    if (!atual) return
    if (!atual.aoDesfazer) {
      const relogio = setTimeout(() => desfazer(atual.id), duracaoDe(atual))
      return () => clearTimeout(relogio)
    }
    if (emPausa) {
      decorrido.current += Date.now() - inicio.current
      return
    }
    inicio.current = Date.now()
    const restante = Math.max(0, duracaoDe(atual) - decorrido.current)
    const relogio = setTimeout(() => desfazer(atual.id), restante)
    return () => clearTimeout(relogio)
  }, [atual, desfazer, emPausa])

  // Reinicia o tempo decorrido quando o aviso da frente muda de identidade.
  useEffect(() => {
    if (atual?.id === undefined) return
    decorrido.current = 0
  }, [atual?.id])

  if (!atual) return null

  return (
    <div
      data-aviso-regiao="sim"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-70 grid justify-items-center gap-2 px-4 md:bottom-8"
    >
      <div
        data-aviso="atual"
        role="status"
        aria-live="polite"
        onMouseEnter={() => setEmPausa(true)}
        onMouseLeave={() => setEmPausa(false)}
        onFocus={() => setEmPausa(true)}
        onBlur={() => setEmPausa(false)}
        className="bv-aviso pointer-events-auto flex min-h-11 w-full max-w-140 items-center gap-3 overflow-hidden rounded-xl bg-(--inverse-surface) px-4 py-2 text-sm text-(--inverse-on-surface) shadow-[0_4px_16px_var(--shadow-strong)]"
      >
        <Icone nome={ICONE[atual.tipo]} className="size-5 shrink-0" />
        <span className="grow">{atual.texto}</span>
        {atual.aoDesfazer === undefined ? null : (
          <button
            type="button"
            data-acao="desfazer"
            aria-label={`Desfazer: ${atual.texto}`}
            onClick={() => desfazer(atual.id)}
            className="min-h-11 shrink-0 font-semibold underline underline-offset-4"
          >
            {atual.rotuloDoDesfazer}
          </button>
        )}
        <span
          aria-hidden="true"
          data-aviso-tempo="sim"
          className="bv-aviso-tempo absolute bottom-0 left-0 h-0.5 w-full origin-left bg-(--inverse-on-surface)"
          style={{ animationDuration: `${duracaoDe(atual)}ms` }}
        />
      </div>

      <div
        data-aviso="pilha"
        aria-live="off"
        className={cn(
          "pointer-events-auto grid w-full max-w-140 gap-2",
          pilha.length === 0 && "hidden",
        )}
      >
        {pilha.map((aviso) => (
          <div
            key={aviso.id}
            data-aviso="empilhado"
            className="flex min-h-11 items-center gap-3 rounded-xl bg-(--inverse-surface)/92 px-4 py-2 text-sm text-(--inverse-on-surface)"
          >
            <Icone nome={ICONE[aviso.tipo]} className="size-5 shrink-0" />
            <span className="grow">{aviso.texto}</span>
            {aviso.aoDesfazer === undefined ? null : (
              <button
                type="button"
                data-acao="desfazer"
                aria-label={`Desfazer: ${aviso.texto}`}
                onClick={() => desfazer(aviso.id)}
                className="min-h-11 shrink-0 font-semibold underline underline-offset-4"
              >
                {aviso.rotuloDoDesfazer}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
