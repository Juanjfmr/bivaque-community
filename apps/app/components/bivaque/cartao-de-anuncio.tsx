"use client"

import { moeda } from "@/lib/formato"
import { cn } from "@/lib/utils"
import { BotaoDeIcone } from "./botao"
import { Capa } from "./capa"
import { Etiqueta } from "./etiqueta"
import { Icone } from "./icone"

/**
 * Cartão de anúncio e cartão de negócio (inventário §7, `shell/primitives.js`:
 * `photoCard` e `businessCard`).
 *
 * Mesma anatomia: salvar, capa, título e a linha de meta. O cartão de anúncio
 * tem preço e atributos de mercado; o de negócio tem a categoria e a linha de
 * recomendação, que depende do plano (patrocinado ou indicação da comunidade) —
 * regra de `isSpon`, que é dado do negócio.
 */

export type AnuncioDoCartao = {
  readonly id: string
  readonly titulo: string
  readonly fonte?: string | null
  readonly rotulo?: string
  readonly icone?: React.ComponentProps<typeof Icone>["nome"]
  readonly preco?: number | null
  readonly porMes?: boolean
  readonly meta: string
  readonly salvo?: boolean
  readonly bairro?: string | null
}

export function CartaoDeFoto({
  anuncio,
  aoSalvar,
  aoAbrir,
}: {
  anuncio: AnuncioDoCartao
  aoSalvar?: () => void
  aoAbrir?: () => void
}) {
  return (
    <article
      data-cartao="anuncio"
      className="bv-press group/card overflow-hidden rounded-2xl bg-(--surface-lowest) ring-1 ring-(--outline-variant)"
    >
      <div className="relative">
        <button
          type="button"
          data-acao="abrir-foto"
          aria-label={`Ver anúncio: ${anuncio.titulo}`}
          onClick={aoAbrir}
          className="block w-full overflow-hidden rounded-t-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-(--ring)"
        >
          <Capa
            fonte={anuncio.fonte}
            alt={anuncio.titulo}
            rotulo={anuncio.rotulo}
            icone={anuncio.icone}
            className="rounded-none"
          />
        </button>
        <span className="absolute top-2 right-2">
          <BotaoDeIcone
            rotulo={anuncio.salvo === true ? "Remover dos salvos" : "Salvar anúncio"}
            nome={anuncio.salvo === true ? "bookmark" : "bookmark_border"}
            aria-pressed={anuncio.salvo === true}
            onClick={aoSalvar}
            className="bg-(--surface-lowest)/85 backdrop-blur"
          />
        </span>
      </div>
      <button
        type="button"
        data-acao="abrir-anuncio"
        onClick={aoAbrir}
        className="grid min-h-11 w-full gap-1 p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-(--ring)"
      >
        <span className="flex items-baseline gap-2">
          {anuncio.preco === undefined || anuncio.preco === null ? null : (
            <b className="text-base font-bold">{moeda(anuncio.preco)}</b>
          )}
          {anuncio.porMes === true ? (
            <small className="text-[12px] text-(--on-surface-variant)">/ mês</small>
          ) : null}
        </span>
        <h3 className="text-[17px] leading-6">{anuncio.titulo}</h3>
        <span className="text-[13px] text-(--on-surface-variant)">{anuncio.meta}</span>
      </button>
    </article>
  )
}

export type NegocioDoCartao = {
  readonly id: string
  readonly nome: string
  readonly fonte?: string | null
  readonly categoria: string
  readonly bairro?: string | null
  readonly cidade: string
  readonly salvo?: boolean
  /** Patrocinado muda o rótulo da capa; sem plano, é a categoria. */
  readonly patrocinado?: boolean
  readonly indicacoes?: number
  readonly aguardando?: boolean
}

export function CartaoDeNegocio({
  negocio,
  aoSalvar,
  aoAbrir,
}: {
  negocio: NegocioDoCartao
  aoSalvar?: () => void
  aoAbrir?: () => void
}) {
  const rotulo =
    negocio.patrocinado === true
      ? "Patrocinado"
      : (negocio.indicacoes ?? 0) > 0
        ? "Indicado pela comunidade"
        : negocio.categoria
  const linha =
    negocio.aguardando === true
      ? "Aguardando o responsável"
      : (negocio.indicacoes ?? 0) > 0
        ? `${negocio.indicacoes} indicações da comunidade`
        : "Novo na cidade"

  return (
    <article
      data-cartao="negocio"
      className="bv-press overflow-hidden rounded-2xl bg-(--surface-lowest) ring-1 ring-(--outline-variant)"
    >
      <div className="relative">
        <button
          type="button"
          data-acao="abrir-foto"
          aria-label={`Ver negócio: ${negocio.nome}`}
          onClick={aoAbrir}
          className="block w-full overflow-hidden rounded-t-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-(--ring)"
        >
          <Capa
            fonte={negocio.fonte}
            alt={negocio.nome}
            rotulo={rotulo}
            icone="storefront"
            className="rounded-none"
          />
        </button>
        <span className="absolute top-2 right-2">
          <BotaoDeIcone
            rotulo={negocio.salvo === true ? "Remover dos salvos" : "Salvar negócio"}
            nome={negocio.salvo === true ? "bookmark" : "bookmark_border"}
            aria-pressed={negocio.salvo === true}
            onClick={aoSalvar}
            className="bg-(--surface-lowest)/85 backdrop-blur"
          />
        </span>
      </div>
      <button
        type="button"
        data-acao="abrir-negocio"
        onClick={aoAbrir}
        className="grid w-full gap-1 p-3 text-left"
      >
        <h3 className="text-[17px] leading-6">{negocio.nome}</h3>
        <span className="text-[13px] text-(--on-surface-variant)">
          {`${negocio.categoria} · ${negocio.bairro ?? negocio.cidade}`}
        </span>
        <span className="flex items-center gap-2 text-[13px] text-(--on-surface-variant)">
          {negocio.aguardando === true ? (
            <Icone nome="hourglass_top" className="size-4" />
          ) : (
            <Icone nome={negocio.indicacoes ? "thumb_up" : "sell"} className="size-4" />
          )}
          {linha}
        </span>
      </button>
    </article>
  )
}

/** O selo de estado que o cartão de anúncio mostra na capa. */
export function RotuloDeEstado({ children }: { children: string }) {
  return (
    <span className={cn("inline-flex")}>
      <Etiqueta tom="aviso">{children}</Etiqueta>
    </span>
  )
}
