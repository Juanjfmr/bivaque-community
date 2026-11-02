import type { ReactNode } from "react"

import { textoDaFaixaDeVisita } from "@/lib/casca"
import { cn } from "@/lib/utils"
import { Icone } from "./icone"

/**
 * Faixa de contexto (inventário §7: `.context-strip` e `readonlyHtml`).
 *
 * A faixa genérica aparece em 18 lugares (grupo fechado, local do encontro,
 * endereço do anúncio); a variante `.readonly` é a visita a outra cidade, com a
 * volta para a cidade da pessoa.
 */
export function FaixaDeContexto({
  children,
  icone,
  tom = "neutro",
  className,
}: {
  children: ReactNode
  icone?: React.ComponentProps<typeof Icone>["nome"]
  tom?: "neutro" | "nota"
  className?: string
}) {
  return (
    <div
      data-faixa="contexto"
      className={cn(
        "flex items-start gap-3 rounded-xl px-4 py-3.5 text-sm",
        tom === "nota"
          ? "bg-(--secondary-container) text-(--on-secondary-container)"
          : "bg-(--surface-low) text-(--on-surface)",
        className,
      )}
    >
      {icone === undefined ? null : <Icone nome={icone} className="mt-0.5 size-5 shrink-0" />}
      <div className="min-w-0 grow">{children}</div>
    </div>
  )
}

export function FaixaDeVisita({
  cidadeVista,
  cidadeDaPessoa,
  aoVoltar,
}: {
  cidadeVista: string
  cidadeDaPessoa: string
  aoVoltar: () => void
}) {
  return (
    <div data-faixa="visita" className="px-1 pt-3">
      <FaixaDeContexto icone="visibility" tom="nota">
        <span className="flex flex-wrap items-center justify-between gap-3">
          <span>{textoDaFaixaDeVisita(cidadeVista, cidadeDaPessoa)}</span>
          <button
            type="button"
            data-acao="voltar-para-casa"
            onClick={aoVoltar}
            className="min-h-11 rounded-xl px-3 text-sm font-semibold underline underline-offset-4"
          >
            Voltar
          </button>
        </span>
      </FaixaDeContexto>
    </div>
  )
}
