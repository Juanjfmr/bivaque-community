"use client"

import { Dialog } from "radix-ui"
import { type ReactNode, useEffect, useRef } from "react"
import { distanciaFechaFolha, paginaEncolhe } from "@/lib/movimento"
import type { Sobreposicao as IdDeSobreposicao } from "@/lib/navegacao/entrada"
import { cn } from "@/lib/utils"
import { BotaoDeIcone } from "./botao"

/**
 * A sobreposição (inventário §7, `shell/dialogs.js`: `showDialog`).
 *
 * Um componente para os três formatos do protótipo: a folha (`form-dialog`), o
 * diálogo e a gaveta lateral, escolhidos por `formato`. O Radix cuida do que
 * uma sobreposição modal exige — fundo inerte, foco contido e devolvido ao
 * acionador — e o Escape e o clique fora fecham pelo mesmo caminho.
 *
 * Duas coisas do protótipo vivem aqui: a página de trás encolhe com a folha
 * aberta abaixo de 720 px (`shell/sheet-depth.js`) e o puxador da folha fecha
 * ao arrastar mais de 110 px, ou 30 px com gesto rápido (`shell/dialogs.js:35`).
 * Quem empilha histórico é o roteador, na camada de navegação: isto é só a
 * caixa.
 */
export function Sobreposicao({
  id,
  titulo,
  descricao,
  formato = "folha",
  children,
  aoFechar,
}: {
  readonly id: IdDeSobreposicao
  readonly titulo: string
  readonly descricao?: string
  readonly formato?: "folha" | "dialogo" | "gaveta"
  readonly children?: ReactNode
  readonly aoFechar: () => void
}) {
  const gaveta = formato === "gaveta"
  const inicioDoArrasto = useRef<{ y: number; quando: number } | null>(null)

  // O encolhimento da página de trás, que o protótipo faz por classe no body.
  useEffect(() => {
    const largura = window.innerWidth
    const encolhe = formato === "folha" && paginaEncolhe(largura, gaveta)
    if (!encolhe) return
    document.body.dataset["profundidade"] = "sim"
    return () => {
      delete document.body.dataset["profundidade"]
    }
  }, [formato, gaveta])

  return (
    <Dialog.Root
      open
      onOpenChange={(aberto) => {
        if (!aberto) aoFechar()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay data-scrim="sobreposicao" className="bv-scrim" />
        <Dialog.Content
          data-sobreposicao={id}
          data-formato={formato}
          className={cn(
            "bv-painel fixed z-45 border border-(--outline-variant) bg-(--surface-lowest) shadow-[0_10px_32px_var(--shadow-strong)]",
            formato === "folha" &&
              "inset-x-0 bottom-0 mx-auto max-h-[88dvh] max-w-150 overflow-y-auto rounded-t-2xl p-4",
            formato === "dialogo" &&
              "inset-x-4 top-[12%] mx-auto max-h-[76dvh] max-w-140 overflow-y-auto rounded-2xl p-4",
            gaveta && "inset-y-0 right-0 w-[min(400px,100vw)] overflow-y-auto rounded-l-2xl p-4",
          )}
        >
          {formato !== "folha" ? null : (
            <button
              type="button"
              data-pega="folha"
              aria-label="Arrastar para fechar"
              onClick={aoFechar}
              onPointerDown={(evento) => {
                inicioDoArrasto.current = { y: evento.clientY, quando: performance.now() }
                evento.currentTarget.setPointerCapture(evento.pointerId)
              }}
              onPointerUp={() => {
                inicioDoArrasto.current = null
              }}
              onPointerMove={(evento) => {
                const inicio = inicioDoArrasto.current
                if (!inicio) return
                const deslocamento = evento.clientY - inicio.y
                if (deslocamento <= 0) return
                const decorrido = Math.max(1, performance.now() - inicio.quando)
                const velocidade = deslocamento / decorrido
                if (distanciaFechaFolha(deslocamento, velocidade)) {
                  inicioDoArrasto.current = null
                  aoFechar()
                }
              }}
              className="mx-auto mb-2 block h-7 w-18 touch-none cursor-grab"
            >
              <i
                aria-hidden="true"
                className="mx-auto mt-2 block h-1 w-9 rounded-sm bg-(--outline-variant)"
              />
            </button>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Dialog.Title className="text-lg leading-6">{titulo}</Dialog.Title>
              {descricao === undefined ? null : (
                <Dialog.Description className="mt-0.5 text-sm text-(--on-surface-variant)">
                  {descricao}
                </Dialog.Description>
              )}
            </div>
            <BotaoDeIcone
              rotulo="Fechar"
              nome="close"
              data-acao="fechar-sobreposicao"
              onClick={aoFechar}
            />
          </div>

          <div className="mt-3">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
