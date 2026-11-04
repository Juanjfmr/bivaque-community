"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useSobreposicaoDaEntrada } from "@/lib/navegacao/react"

/**
 * A confirmação (inventário §7, `shell/dialogs.js`: `confirm`).
 *
 * Título, texto (uma linha por `\n` no protótipo, aqui por prop), "Continuar" e
 * "Confirmar" — com a variante de perigo pintada. É o par obrigatório do
 * fechamento com edição não salva.
 *
 * Como o menu ⋮, ela é uma sobreposição da **entrada**: o Voltar do sistema a
 * fecha antes de trocar de rota (`overlayDepth` do protótipo).
 *
 * A caixa e as ações vêm da base shadcn (`components/ui/alert-dialog`), não do
 * Radix direto: é a correção do achado S01 da auditoria de 26/10. A ação de
 * perigo usa a variante `destructive` do botão; a de concluir usa a `brasa`,
 * que é a ação da peça (ADR-20261102-paleta-fria mantém a brasa no criar).
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
    <AlertDialog open={aberto} onOpenChange={aoMudarAberto}>
      <AlertDialogContent data-sobreposicao="confirmacao" className="max-w-110">
        <AlertDialogTitle>{titulo}</AlertDialogTitle>
        <AlertDialogDescription>{texto}</AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel
            variant="ghost"
            data-acao="cancelar"
            className="min-h-11 rounded-xl px-4 text-sm"
          >
            {cancelar}
          </AlertDialogCancel>
          <AlertDialogAction
            variant={perigo ? "destructive" : "brasa"}
            data-acao="confirmar"
            className="min-h-11 rounded-xl px-4 text-sm"
            onClick={() => {
              aoConfirmar()
            }}
          >
            {confirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
