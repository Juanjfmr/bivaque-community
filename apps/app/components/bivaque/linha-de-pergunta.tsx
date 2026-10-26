import { Etiqueta } from "./etiqueta"
import { Icone } from "./icone"
import { LinhaDeLista } from "./lista"

/**
 * Linha de pergunta e linha de encontro (inventário §7, `shell/primitives.js`:
 * `questionRow` e `eventRow`).
 *
 * As duas nascem de `.list-row`; o que muda é o que entra na coluna do meio e a
 * pílula do fim.
 */

export type PerguntaDaLinha = {
  readonly id: string
  readonly pergunta: string
  readonly autor: string
  readonly propria?: boolean
  readonly tópico: string
  readonly cidade: string
  readonly respostas: number
  readonly resolvida?: boolean
  readonly trecho?: string
}

export function LinhaDePergunta({
  pergunta,
  ...props
}: { pergunta: PerguntaDaLinha } & React.ComponentProps<"button">) {
  const estado =
    pergunta.resolvida === true ? (
      <Etiqueta tom="ok" icone="check_circle">
        Resolvida
      </Etiqueta>
    ) : (
      <Etiqueta tom="neutro">
        {pergunta.respostas === 0 ? "Sem resposta" : `${pergunta.respostas} resposta(s)`}
      </Etiqueta>
    )

  return (
    <LinhaDeLista
      titulo={pergunta.pergunta}
      tituloMultilinha
      subtitulo={`${pergunta.propria === true ? "Você" : pergunta.autor} · ${pergunta.tópico} · ${pergunta.cidade}`}
      fim={estado}
      {...props}
    >
      {pergunta.trecho === undefined ? null : (
        <span className="mt-1 line-clamp-2 text-[13px] text-(--on-surface-variant)">
          {pergunta.trecho}
        </span>
      )}
    </LinhaDeLista>
  )
}

export type EncontroDaLinha = {
  readonly id: string
  readonly titulo: string
  readonly data: string
  readonly mes: string
  readonly dia: string
  readonly local: string
  readonly horario: string
  readonly confirmados: number
  readonly confirmado?: boolean
  readonly organiza?: boolean
}

export function LinhaDeEncontro({
  encontro,
  aoAlternar,
}: {
  encontro: EncontroDaLinha
  aoAlternar?: () => void
}) {
  return (
    <div data-linha="encontro" className="flex items-center gap-3 px-4 py-3">
      <button
        type="button"
        aria-label={`Ver ${encontro.titulo}`}
        className="grid min-h-14 w-12 shrink-0 place-items-center rounded-xl bg-(--secondary-container) leading-tight"
      >
        <small className="text-[11px] font-semibold tracking-wide uppercase">{encontro.mes}</small>
        <b className="text-lg">{encontro.dia}</b>
      </button>
      <div className="grid min-w-0 grow">
        <b className="truncate text-[15px] font-semibold">{encontro.titulo}</b>
        <small className="truncate text-[13px] text-(--on-surface-variant)">
          {`${encontro.local} · ${encontro.horario}`}
        </small>
        <small className="truncate text-[13px] text-(--on-surface-variant)">
          {`${encontro.confirmados} confirmados`}
        </small>
      </div>
      <button
        type="button"
        data-acao="presenca"
        aria-pressed={encontro.confirmado === true}
        onClick={aoAlternar}
        className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-(--outline-variant) px-3 text-sm font-medium"
      >
        {encontro.confirmado === true ? <Icone nome="check" className="size-4" /> : null}
        {encontro.organiza === true
          ? "Você organiza"
          : encontro.confirmado === true
            ? "Confirmado"
            : "Vou"}
      </button>
    </div>
  )
}
