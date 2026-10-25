import { Dialog } from "radix-ui"

import type { Sobreposicao } from "@/lib/navegacao/entrada"
import { useEntradaDaTela, useNavegacao } from "@/lib/navegacao/react"

const ROTULO: Record<Sobreposicao, string> = {
  dialogo: "Diálogo",
  folha: "Folha",
  "menu-criar": "Criar no Bivaque",
}

// Inventário §4: as escolhas do menu Criar. Onda 1c liga cada uma ao seu fluxo.
const ESCOLHAS_DO_CRIAR: readonly string[] = [
  "Pedir indicação",
  "Contratar serviço",
  "Anunciar desapego",
  "Anunciar imóvel",
  "Indicar um negócio",
  "Criar encontro",
  "Divulgar meu negócio",
]

/**
 * As sobreposições da casca, modais de verdade (Radix Dialog).
 *
 * Cada uma é uma entrada própria no histórico: o Voltar do sistema fecha antes
 * de trocar de rota. O Radix cuida do que uma sobreposição modal exige — fundo
 * inerte, foco contido dentro dela e devolução do foco ao fechar — e o Escape e
 * o clique fora fecham pelo mesmo caminho. O conteúdo é provisório: a onda 1c
 * traz o conteúdo de cada diálogo.
 */
export function Sobreposicoes() {
  const entrada = useEntradaDaTela()
  const navegacao = useNavegacao()
  const aberta = entrada.sobreposicao

  if (aberta === null) return null

  return (
    <Dialog.Root
      open
      onOpenChange={(aberto) => {
        if (!aberto) navegacao.fecharSobreposicao()
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay data-scrim="sobreposicao" />
        <Dialog.Content data-sobreposicao={aberta}>
          <Dialog.Title>{ROTULO[aberta]}</Dialog.Title>
          <Dialog.Description>
            Área da sobreposição em prova. A onda 1c traz o conteúdo.
          </Dialog.Description>
          <Dialog.Close data-acao="fechar-sobreposicao" data-valor="prova">
            Fechar
          </Dialog.Close>
          {aberta === "menu-criar" ? (
            <div role="menu" aria-label="Criar no Bivaque">
              {ESCOLHAS_DO_CRIAR.map((escolha) => (
                <button key={escolha} type="button" role="menuitem" disabled>
                  {escolha}
                </button>
              ))}
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
