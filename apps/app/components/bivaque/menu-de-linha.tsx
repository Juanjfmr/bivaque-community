"use client"

import type { ReactNode } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { cn } from "@/lib/utils"
import { BotaoDeIcone } from "./botao"

/**
 * O menu ⋮ da linha (inventário §7: `Menu ⋮`, `iconBtn('more_vert', …)`).
 *
 * O nome acessível depende do contexto — "Opções da conversa", "Opções da
 * publicação" — e o `aria-haspopup` do protótipo era adivinhado pelo sufixo da
 * ação; aqui é prop explícita.
 *
 * **Aberto pelo mecanismo único da onda 1b**: o menu é uma sobreposição da
 * entrada, então o Voltar do sistema fecha o menu antes de sair da tela, como
 * no protótipo (`shell/create-menu.js` com `contextMenu=true` empilha
 * histórico). Os itens continuam sendo de quem usa o componente: eles são
 * conteúdo da tela, não do menu.
 *
 * A caixa vem da base shadcn (`components/ui/dropdown-menu`), não do Radix
 * direto: é a correção do achado S01 da auditoria de 26/10. O comportamento de
 * foco, teclado e portal continua sendo do Radix, por baixo da base.
 */
export function MenuDaLinha({
  rotulo,
  children,
  className,
}: {
  readonly rotulo: string
  readonly children: ReactNode
  readonly className?: string
}) {
  const { aberto, aoMudarAberto } = useSobreposicaoDaEntrada("menu-de-linha")

  return (
    <DropdownMenu open={aberto} onOpenChange={aoMudarAberto} modal>
      <DropdownMenuTrigger asChild>
        <BotaoDeIcone
          rotulo={rotulo}
          nome="more_vert"
          aberto="menu"
          data-acao="opcoes"
          onClick={() => aoMudarAberto(true)}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-sobreposicao="menu-de-linha"
        aria-label={rotulo}
        sideOffset={6}
        align="end"
        className={cn("min-w-52", className)}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function ItemDoMenu({
  children,
  perigo = false,
  ...props
}: React.ComponentProps<typeof DropdownMenuItem> & { perigo?: boolean }) {
  return (
    <DropdownMenuItem variant={perigo ? "destructive" : "default"} {...props}>
      {children}
    </DropdownMenuItem>
  )
}
