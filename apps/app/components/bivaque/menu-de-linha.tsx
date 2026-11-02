"use client"

import { DropdownMenu } from "radix-ui"
import type { ReactNode } from "react"

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
    <DropdownMenu.Root open={aberto} onOpenChange={aoMudarAberto} modal>
      <DropdownMenu.Trigger asChild>
        <BotaoDeIcone
          rotulo={rotulo}
          nome="more_vert"
          aberto="menu"
          data-acao="opcoes"
          onClick={() => aoMudarAberto(true)}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          data-sobreposicao="menu-de-linha"
          aria-label={rotulo}
          sideOffset={6}
          align="end"
          className={cn(
            "z-60 min-w-52 rounded-xl border border-(--outline-variant) bg-(--popover) p-1 text-(--popover-foreground) shadow-[0_8px_24px_var(--shadow-soft)]",
            className,
          )}
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function ItemDoMenu({
  children,
  perigo = false,
  ...props
}: React.ComponentProps<typeof DropdownMenu.Item> & { perigo?: boolean }) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex min-h-11 cursor-default items-center gap-2 rounded-lg px-3 text-sm outline-none select-none data-[highlighted]:bg-(--muted)",
        perigo && "text-(--destructive)",
      )}
      {...props}
    >
      {children}
    </DropdownMenu.Item>
  )
}
