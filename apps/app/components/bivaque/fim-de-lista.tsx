import type { ReactNode } from "react"

import { Botao } from "./botao"
import { Icone } from "./icone"

/**
 * Fim de lista e fim de bloco (inventário §7: `askEndHtml` e `paged-end`).
 *
 * Três montagens diferentes no protótipo (a pergunta, o catálogo e os negócios)
 * para a mesma anatomia: ícone, dois textos e um botão tonal.
 */
export function FimDeLista({
  titulo,
  texto,
  rotulo,
  aoAcionar,
  icone = "forum",
}: {
  titulo: string
  texto: string
  rotulo?: string
  aoAcionar?: () => void
  icone?: React.ComponentProps<typeof Icone>["nome"]
}) {
  return (
    <div
      data-fim="lista"
      className="flex flex-wrap items-center gap-3 rounded-2xl bg-(--surface-low) px-4 py-4"
    >
      <Icone nome={icone} className="size-6 shrink-0 text-(--primary)" />
      <span className="grid min-w-0 grow">
        <b className="text-[15px]">{titulo}</b>
        <small className="text-[13px] text-(--on-surface-variant)">{texto}</small>
      </span>
      {rotulo === undefined || aoAcionar === undefined ? null : (
        <Botao tom="tonal" onClick={aoAcionar}>
          {rotulo}
        </Botao>
      )}
    </div>
  )
}

/** O fim do bloco paginado: quanto já apareceu, a barra e o "Mostrar mais". */
export function FimDeBloco({
  mostrados,
  total,
  porBloco,
  carregando,
  aoMostrarMais,
  fim,
}: {
  mostrados: number
  total: number
  porBloco: number
  carregando: boolean
  aoMostrarMais: () => void
  fim?: ReactNode
}) {
  const restantes = Math.max(0, total - mostrados)

  if (carregando) {
    return (
      <p data-fim="carregando" className="text-center text-[13px] text-(--on-surface-variant)">
        {`Carregando mais ${Math.min(porBloco, restantes)}…`}
      </p>
    )
  }

  if (mostrados < total) {
    return (
      <div data-fim="bloco" className="grid justify-items-center gap-3 py-4 text-center">
        <p className="text-[13px] text-(--on-surface-variant)">{`Mostrando ${mostrados} de ${total}`}</p>
        <span
          aria-hidden="true"
          className="block h-1 w-40 overflow-hidden rounded-sm bg-(--surface-highest)"
        >
          <i
            className="block h-full bg-(--primary)"
            style={{ width: `${Math.max(2, Math.round((mostrados / Math.max(total, 1)) * 100))}%` }}
          />
        </span>
        <Botao tom="contornado" data-acao="mostrar-mais" onClick={aoMostrarMais}>
          {`Mostrar mais ${Math.min(porBloco, restantes)}`}
        </Botao>
      </div>
    )
  }

  return (
    <div data-fim="lista" className="grid gap-4 py-4">
      <p data-fim="contagem" className="text-center text-[13px] text-(--on-surface-variant)">
        {`Você viu todos os ${total}`}
      </p>
      {fim}
    </div>
  )
}
