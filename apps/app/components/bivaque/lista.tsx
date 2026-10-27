import type { ReactNode } from "react"
import type { NomeDeIcone } from "@/lib/icones"
import { cn } from "@/lib/utils"
import { Icone } from "./icone"

/**
 * Lista e linha de lista (inventário §7: `list` / `list-row`).
 *
 * É a base das dez linhas de uma tela só (`questionRow`, `eventRow`,
 * `profileRow`, `threadRow`, `requestRow`, `noticeRow`, `alertRow`,
 * `hiddenRow`, `blockedRow`, `ticketRow`): cada uma tem ícone, coluna e
 * etiquetas próprios, e o valor está em herdar a linha, não em repeti-la.
 */
export function Lista({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-lista="itens"
      className={cn(
        "overflow-hidden rounded-2xl border border-(--outline-variant) bg-(--surface-lowest)",
        "divide-y divide-(--outline-variant)",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function LinhaDeLista({
  icone,
  titulo,
  subtitulo,
  fim,
  tituloMultilinha = false,
  className,
  children,
  ...props
}: React.ComponentProps<"button"> & {
  icone?: NomeDeIcone
  titulo: ReactNode
  subtitulo?: ReactNode
  /** O que vai à direita: etiqueta, contagem, ou o chevron do padrão. */
  fim?: ReactNode
  /** Preserva títulos de perguntas longas, sem alterar outras linhas. */
  tituloMultilinha?: boolean
}) {
  return (
    <button
      type="button"
      data-linha="lista"
      className={cn(
        "bv-press flex min-h-20 w-full items-center gap-3 px-4 py-3 text-left",
        "hover:bg-(--muted) focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-(--ring)",
        className,
      )}
      {...props}
    >
      {icone === undefined ? null : (
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--muted) text-(--on-surface-variant)">
          <Icone nome={icone} className="size-6" />
        </span>
      )}
      <span className="grid min-w-0 grow gap-0.5">
        <b
          data-titulo-linha
          className={cn(
            "text-[15px] font-semibold",
            tituloMultilinha ? "whitespace-normal break-words" : "truncate",
          )}
        >
          {titulo}
        </b>
        {subtitulo === undefined ? null : (
          <small className="truncate text-[13px] text-(--on-surface-variant)">{subtitulo}</small>
        )}
        {children}
      </span>
      {fim ?? <Icone nome="chevron_right" className="size-5 shrink-0 opacity-70" />}
    </button>
  )
}

/** A linha de ajuste (inventário §7: `profileRow`). */
export function LinhaDeAjuste({
  icone,
  titulo,
  subtitulo,
  ...props
}: React.ComponentProps<"button"> & { icone: NomeDeIcone; titulo: string; subtitulo?: string }) {
  return <LinhaDeLista icone={icone} titulo={titulo} subtitulo={subtitulo} {...props} />
}
