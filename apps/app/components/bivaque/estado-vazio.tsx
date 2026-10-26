import type { ReactNode } from "react"
import type { NomeDeIcone } from "@/lib/icones"
import { cn } from "@/lib/utils"
import { ArteVazia } from "./arte-vazia"
import { Botao } from "./botao"
import { Icone } from "./icone"

/**
 * Estado vazio (inventário §7, `shell/primitives.js`: `empty`) e o erro de
 * leitura/gravação.
 *
 * O vazio repetido em 25 arquivos do protótipo; o ícone de reserva é o
 * `search_off` de lá. A ilustração respira e cintila — movimento que o
 * interruptor de movimento reduzido desliga (§6, item 34).
 */
export function EstadoVazio({
  titulo,
  texto,
  icone = "search_off",
  acao,
  children,
}: {
  titulo: string
  texto: string
  icone?: NomeDeIcone
  acao?: { readonly rotulo: string; readonly aoAcionar: () => void }
  children?: ReactNode
}) {
  return (
    <div
      data-estado="vazio"
      className="grid justify-items-center gap-3 rounded-2xl bg-(--surface-lowest) px-5 py-8 text-center"
    >
      <div className="relative grid size-33 place-items-center">
        <ArteVazia className="absolute inset-0 size-full" />
        <span className="bv-empty-float relative grid size-15 place-items-center rounded-full bg-(--surface-lowest) shadow-[0_6px_18px_var(--shadow-soft)]">
          <Icone nome={icone} className="size-7 text-(--primary)" />
        </span>
        <i className="bv-empty-twinkle absolute top-5 left-3 size-2.5 rounded-full bg-(--tertiary-container)" />
        <i className="bv-empty-twinkle absolute top-3 right-4 size-2 rounded-full bg-(--primary) [animation-delay:0.8s]" />
        <i className="bv-empty-twinkle absolute right-2 bottom-5 size-3 rounded-full bg-(--on-primary-container) [animation-delay:1.6s]" />
      </div>
      <h3>{titulo}</h3>
      <p className={cn("max-w-md text-sm text-(--muted-foreground)")}>{texto}</p>
      {acao === undefined ? null : (
        <Botao tom="tonal" data-acao="acao-do-vazio" onClick={acao.aoAcionar}>
          {acao.rotulo}
        </Botao>
      )}
      {children}
    </div>
  )
}

export function EstadoDeErro({
  titulo = "Não foi possível carregar",
  texto = "Confira a conexão e tente de novo.",
  aoTentar,
}: {
  titulo?: string
  texto?: string
  aoTentar?: () => void
}) {
  return (
    <div
      role="alert"
      data-estado="erro"
      className="grid justify-items-center gap-3 rounded-2xl bg-(--surface-lowest) px-5 py-8 text-center"
    >
      <span className="grid size-12 place-items-center rounded-full bg-(--muted)">
        <Icone nome="error" className="size-6 text-(--destructive)" />
      </span>
      <h3>{titulo}</h3>
      <p className="max-w-md text-sm text-(--muted-foreground)">{texto}</p>
      {aoTentar === undefined ? null : (
        <Botao icone="refresh" onClick={aoTentar}>
          Tentar de novo
        </Botao>
      )}
    </div>
  )
}
