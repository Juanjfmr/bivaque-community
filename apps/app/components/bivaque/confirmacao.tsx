"use client"

import { AlertDialog } from "radix-ui"

import { useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { Botao } from "./botao"

/**
 * A confirmação (inventário §7, `shell/dialogs.js`: `confirm`).
 *
 * Título, texto (uma linha por `\n` no protótipo, aqui por prop), "Continuar" e
 * "Confirmar" — com a variante de perigo pintada. É o par obrigatório do
 * fechamento com edição não salva.
 *
 * Como o menu ⋮, ela é uma sobreposição da **entrada**: o Voltar do sistema a
 * fecha antes de trocar de rota (`overlayDepth` do protótipo).
 */
export function Confirmacao({
  titulo,
  texto,
  confirmar = "Confirmar",
  cancelar = "Continuar",
  perigo = false,
  aoConfirmar,
}: {
  readonly titulo: string
  readonly texto: string
  readonly confirmar?: string
  readonly cancelar?: string
  readonly perigo?: boolean
  readonly aoConfirmar: () => void
}) {
  const { aberto, aoMudarAberto } = useSobreposicaoDaEntrada("confirmacao")

  return (
    <AlertDialog.Root open={aberto} onOpenChange={aoMudarAberto}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay data-scrim="sobreposicao" className="bv-scrim" />
        <AlertDialog.Content
          data-sobreposicao="confirmacao"
          className="bv-painel fixed inset-x-4 top-24 z-45 mx-auto grid max-w-110 gap-3 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-4"
        >
          <AlertDialog.Title className="text-lg leading-6">{titulo}</AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-(--on-surface-variant)">
            {texto}
          </AlertDialog.Description>
          <div className="flex flex-wrap justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Botao tom="texto" data-acao="cancelar">
                {cancelar}
              </Botao>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Botao
                tom={perigo ? "perigo" : "preenchido"}
                data-acao="confirmar"
                onClick={() => {
                  aoConfirmar()
                }}
              >
                {confirmar}
              </Botao>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
