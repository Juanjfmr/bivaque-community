import { cn } from "@/lib/utils"
import { Botao } from "./botao"

/**
 * O nome de outra pessoa. Com `aoAbrir` é o link para o perfil dela (F10); sem,
 * é o texto de sempre — nome que não leva a lugar nenhum não finge que leva.
 */
export function NomeDeMembro({
  nome,
  aoAbrir,
  className,
}: {
  nome: string
  aoAbrir?: (() => void) | undefined
  className?: string
}) {
  if (aoAbrir === undefined) return <b className={className}>{nome}</b>
  return (
    <Botao
      tom="texto"
      data-acao="abrir-perfil"
      className={cn(
        "h-auto min-h-0 min-w-0 justify-start px-0 py-0 text-sm font-semibold",
        className,
      )}
      onClick={aoAbrir}
    >
      {nome}
    </Botao>
  )
}
