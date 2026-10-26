import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { iniciais } from "@/lib/texto"
import { cn } from "@/lib/utils"
import { Etiqueta } from "./etiqueta"
import { Icone } from "./icone"

/**
 * Perguntas têm anatomia própria: avatar e autoria, enunciado inteiro,
 * contexto e estado ao pé. A base de outros tipos de linha não é alterada.
 * Usa o Avatar e Badge da base shadcn, conforme auditoria V14.
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
  className,
  ...props
}: { pergunta: PerguntaDaLinha } & React.ComponentProps<"button">) {
  const autor = pergunta.propria === true ? "Você" : pergunta.autor
  return (
    <button
      type="button"
      data-linha="pergunta"
      className={cn(
        "bv-press flex min-h-20 w-full items-start gap-3 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) px-3 py-3.5 text-left hover:bg-(--muted) focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-(--ring) sm:px-4",
        className,
      )}
      {...props}
    >
      <Avatar size="lg" className="mt-0.5 size-10 shrink-0">
        <AvatarFallback className="bg-(--secondary-container) font-semibold text-(--on-secondary-container)">
          {iniciais(autor)}
        </AvatarFallback>
      </Avatar>
      <span className="grid min-w-0 grow gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <b className="text-[13px] font-semibold">{autor}</b>
          <small className="text-[12px] text-(--on-surface-variant)">{pergunta.cidade}</small>
        </span>
        <b
          data-titulo-linha
          className="whitespace-normal break-words text-[15px] leading-[1.45] font-semibold text-(--on-surface)"
        >
          {pergunta.pergunta}
        </b>
        {pergunta.trecho === undefined ? null : (
          <small className="line-clamp-2 text-[13px] text-(--on-surface-variant)">
            {pergunta.trecho}
          </small>
        )}
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Etiqueta tom={pergunta.resolvida === true ? "ok" : "neutro"} {...(pergunta.resolvida === true ? { icone: "check_circle" as const } : {})}>
            {pergunta.resolvida === true
              ? "Resolvida"
              : pergunta.respostas === 0
                ? "Sem resposta"
                : pergunta.respostas === 1
                  ? "1 resposta"
                  : `${pergunta.respostas} respostas`}
          </Etiqueta>
          {pergunta.tópico.trim() === "" ? null : (
            <small className="min-w-0 truncate text-[12px] text-(--on-surface-variant)">
              {pergunta.tópico}
            </small>
          )}
        </span>
      </span>
      <Icone nome="chevron_right" className="mt-6 size-5 shrink-0 text-(--on-surface-variant)" />
    </button>
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
