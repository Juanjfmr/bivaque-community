import type { ReactNode } from "react"

import { MembroAvatar } from "./avatar"
import { Botao } from "./botao"
import { Etiqueta } from "./etiqueta"
import { Icone } from "./icone"

/**
 * Cartão de publicação (inventário §7: `gPostCard`).
 *
 * O componente mais complexo do protótipo: quatro tipos de publicação
 * (pergunta, evento, enquete e oferta), o menu do autor, a origem da oferta, a
 * linha "também perguntada à cidade" e o rodapé de ações. `completo={false}`
 * esconde o rodapé, como o `full` do protótipo.
 */

export type TipoDePublicacao = "pergunta" | "evento" | "enquete" | "oferta" | "publicacao"

export type Publicacao = {
  readonly id: string
  readonly tipo: TipoDePublicacao
  readonly autor: string
  readonly quando: string
  readonly texto: string
  readonly resolvida?: boolean
  readonly editada?: boolean
  readonly moderada?: boolean
  readonly tambemNaCidade?: boolean
  readonly comentarios: number
  readonly uteis: number
  readonly util?: boolean
  readonly encontro?: {
    readonly data: string
    readonly local: string
    readonly confirmado?: boolean
  }
  readonly enquete?: {
    readonly opcoes: readonly { readonly rotulo: string; readonly votos: number }[]
    readonly votada?: string | null
    readonly encerrada?: boolean
  }
  readonly menu?: ReactNode
}

export function CartaoDePublicacao({
  publicacao,
  completo = true,
  aoMarcarUtil,
  aoComentar,
}: {
  publicacao: Publicacao
  completo?: boolean
  aoMarcarUtil?: () => void
  aoComentar?: () => void
}) {
  const { enquete, encontro } = publicacao
  const votos = enquete?.opcoes.reduce((soma, opcao) => soma + opcao.votos, 0) ?? 0

  return (
    <article
      data-cartao="publicacao"
      data-tipo={publicacao.tipo}
      className="grid gap-3 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
    >
      <header className="flex items-center gap-3">
        <MembroAvatar nome={publicacao.autor} tamanho="pequeno" />
        <div className="grid min-w-0 grow">
          <b className="truncate text-[15px]">{publicacao.autor}</b>
          <small className="text-[12px] text-(--on-surface-variant)">{publicacao.quando}</small>
        </div>
        <span className="flex shrink-0 items-center gap-1.5">
          <Etiqueta tom="neutro">{rotuloDoTipo(publicacao.tipo)}</Etiqueta>
          {publicacao.resolvida === true ? (
            <Etiqueta tom="ok" icone="check_circle">
              Resolvida
            </Etiqueta>
          ) : null}
          {publicacao.menu}
        </span>
      </header>

      {publicacao.moderada === true ? (
        <p className="rounded-xl bg-(--surface-low) px-3 py-2 text-[13px] text-(--on-surface-variant)">
          Publicação removida pela moderação.
        </p>
      ) : null}

      <p className="text-[15px] leading-6">
        {publicacao.texto}
        {publicacao.editada === true ? (
          <small className="ml-2 text-[12px] text-(--on-surface-variant)">editada</small>
        ) : null}
      </p>

      {encontro === undefined ? null : (
        <p className="flex items-center gap-2 rounded-xl bg-(--surface-low) px-3 py-2 text-[13px]">
          <Icone nome="event" className="size-4" />
          {`${encontro.data} · ${encontro.local}`}
          {encontro.confirmado === true ? (
            <Etiqueta tom="ok" icone="check">
              Confirmado
            </Etiqueta>
          ) : null}
        </p>
      )}

      {enquete === undefined ? null : (
        <ul className="grid gap-2" data-enquete="sim">
          {enquete.opcoes.map((opcao) => {
            const parte = votos === 0 ? 0 : Math.round((opcao.votos / votos) * 100)
            return (
              <li key={opcao.rotulo}>
                <button
                  type="button"
                  aria-pressed={enquete.votada === opcao.rotulo}
                  className="relative flex min-h-11 w-full items-center justify-between overflow-hidden rounded-xl border border-(--outline-variant) px-3 text-sm"
                >
                  <span className="relative z-1">{opcao.rotulo}</span>
                  <span className="relative z-1 text-[12px] text-(--on-surface-variant)">
                    {`${parte}%`}
                  </span>
                  <span
                    aria-hidden="true"
                    data-enquete="barra"
                    className="absolute inset-y-0 left-0 bg-(--secondary-container)"
                    style={{ width: `${parte}%` }}
                  />
                </button>
              </li>
            )
          })}
          <li className="text-[12px] text-(--on-surface-variant)">
            {enquete.encerrada === true ? `Votação encerrada · ${votos} votos` : "Toque para votar"}
          </li>
        </ul>
      )}

      {publicacao.tambemNaCidade === true ? (
        <p className="rounded-xl bg-(--secondary-container) px-3 py-2 text-[13px]">
          Também perguntada à cidade · ver em Indicações
        </p>
      ) : null}

      {completo ? (
        <footer className="flex items-center gap-2 border-t border-(--outline-variant) pt-3">
          <Botao
            tom="texto"
            data-acao="comentar"
            icone="forum"
            onClick={aoComentar}
            className="grow justify-start"
          >
            {publicacao.comentarios === 0 ? "Comentar" : `${publicacao.comentarios} comentários`}
          </Botao>
          <Botao
            tom="texto"
            data-acao="util"
            icone="thumb_up"
            aria-pressed={publicacao.util === true}
            onClick={aoMarcarUtil}
            className="grow justify-start"
          >
            {`Útil (${publicacao.uteis})`}
          </Botao>
        </footer>
      ) : null}
    </article>
  )
}

function rotuloDoTipo(tipo: TipoDePublicacao): string {
  switch (tipo) {
    case "pergunta":
      return "Pergunta"
    case "evento":
      return "Evento"
    case "enquete":
      return "Enquete"
    case "oferta":
      return "Oferta"
    case "publicacao":
      return "Publicação"
  }
}
