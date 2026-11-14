import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { useNavegacao, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { useCasca } from "@/src/contexto/casca"
import { Perguntar } from "./Perguntar"

export function DialogoDePergunta() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const { aberto, aoMudarAberto } = useSobreposicaoDaEntrada("perguntar")
  return (
    <Dialog open={aberto} onOpenChange={aoMudarAberto}>
      <DialogContent
        showCloseButton
        unstyled
        data-fluxo="perguntar"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] max-w-xl overflow-y-auto rounded-t-2xl border border-(--outline-variant) bg-(--surface-lowest) p-5 shadow-xl sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-2xl"
      >
        <DialogTitle className="pr-12 text-xl">Pedir uma indicação</DialogTitle>
        <DialogDescription className="text-sm text-(--on-surface-variant)">
          Peça uma indicação à cidade da sua conta. Você revisa antes de publicar.
        </DialogDescription>
        {aberto ? (
          <Perguntar
            cidade={casca.cidade}
            aoCancelar={() => aoMudarAberto(false)}
            aoSalvar={(id) =>
              void navegacao.irPara("pergunta", { parametros: { id }, replace: true })
            }
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
