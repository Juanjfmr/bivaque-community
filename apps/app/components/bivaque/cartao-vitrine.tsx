"use client"

import { Capa } from "@/components/bivaque/capa"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import type { AnuncioDoCartao, NegocioDoCartao } from "@/components/bivaque/cartao-de-anuncio"
import {
  ProductCard,
  ProductCardBadge,
  ProductCardContent,
  ProductCardHeader,
  ProductCardImage,
  ProductCardMetric,
  ProductCardSubtitle,
  ProductCardTitle,
} from "@/components/ui/product-card"
import { assetUrl } from "@/lib/assets"
import { moeda } from "@/lib/formato"

/**
 * Vitrine da Home: composição sobre o Product Card real da Delta Components
 * (21st.dev / demo 28199), alimentada pelos contratos e assets do Bivaque.
 * Sem dados fictícios, sem Next.js e sem mudar os cartões do catálogo.
 */
function Fotografia({
  fonte,
  titulo,
  rotulo,
  icone,
  aoAbrir,
}: {
  fonte?: string | null | undefined
  titulo: string
  rotulo?: string | undefined
  icone: React.ComponentProps<typeof Icone>["nome"]
  aoAbrir?: () => void
}) {
  const url = assetUrl(fonte)
  return (
    <div className="relative">
      <button
        type="button"
        data-acao="abrir-foto"
        aria-label={`Ver: ${titulo}`}
        onClick={aoAbrir}
        className="block w-full overflow-hidden rounded-t-2xl text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-(--ring)"
      >
        {url === "" ? (
          <Capa fonte={fonte} alt={titulo} rotulo={rotulo} icone={icone} className="rounded-none" />
        ) : (
          <ProductCardImage
            data-capa="foto"
            src={url}
            alt={titulo}
            className="!aspect-video !rounded-none"
            imageClassName="!p-0 !object-cover"
          />
        )}
      </button>
      {url !== "" && rotulo ? (
        <span className="absolute top-2 left-2 pointer-events-none max-w-[70%]">
          <Etiqueta tom="neutro">{rotulo}</Etiqueta>
        </span>
      ) : null}
    </div>
  )
}

function Salvar({
  salvo,
  nome,
  aoSalvar,
}: {
  salvo: boolean
  nome: string
  aoSalvar?: () => void
}) {
  return (
    <ProductCardBadge
      aria-label={salvo ? `Remover ${nome} dos salvos` : `Salvar ${nome}`}
      aria-pressed={salvo}
      isActive={salvo}
      onClick={aoSalvar}
      className="!top-2 !right-2 !min-h-11 !min-w-11 !justify-center !rounded-full !bg-(--surface-lowest)/90 !text-(--on-surface) shadow-sm backdrop-blur-sm"
      icon={<Icone nome={salvo ? "bookmark" : "bookmark_border"} className="size-5" />}
    />
  )
}

export function CartaoVitrineAnuncio({
  anuncio,
  aoSalvar,
  aoAbrir,
}: {
  anuncio: AnuncioDoCartao
  aoSalvar?: () => void
  aoAbrir?: () => void
}) {
  return (
    <article data-cartao="anuncio" data-vitrine="21st" className="bv-vitrine relative overflow-hidden rounded-2xl bg-(--surface-lowest) ring-1 ring-(--outline-variant)">
      <ProductCard animated={false} className="!max-w-none !rounded-2xl">
        <Fotografia
          fonte={anuncio.fonte}
          titulo={anuncio.titulo}
          rotulo={anuncio.rotulo}
          icone={anuncio.icone ?? "sell"}
          aoAbrir={aoAbrir}
        />
        <Salvar salvo={anuncio.salvo === true} nome="anúncio" aoSalvar={aoSalvar} />
        <button
          type="button"
          data-acao="abrir-anuncio"
          onClick={aoAbrir}
          className="block min-h-20 w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-(--ring)"
        >
          <ProductCardContent className="!items-stretch !p-3.5">
            <ProductCardHeader className="grid gap-1.5">
              <span className="flex flex-wrap items-baseline gap-x-1.5">
                {anuncio.preco == null ? null : (
                  <ProductCardMetric className="text-xl font-extrabold tracking-tight text-(--on-surface)">
                    {moeda(anuncio.preco)}
                  </ProductCardMetric>
                )}
                {anuncio.porMes ? (
                  <span className="text-xs text-(--on-surface-variant)">/ mês</span>
                ) : null}
              </span>
              <ProductCardTitle className="!whitespace-normal line-clamp-2 text-base leading-5 font-semibold text-(--on-surface)">
                {anuncio.titulo}
              </ProductCardTitle>
              <ProductCardSubtitle className="line-clamp-2 text-[13px] text-(--on-surface-variant)">
                {anuncio.meta}
              </ProductCardSubtitle>
              {anuncio.detalhes?.length ? (
                <span data-atributos-imovel="sim" className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--on-surface-variant)">
                  {anuncio.detalhes.map((detalhe) => <small key={detalhe}>{detalhe}</small>)}
                </span>
              ) : null}
            </ProductCardHeader>
          </ProductCardContent>
        </button>
      </ProductCard>
    </article>
  )
}

export function CartaoVitrineNegocio({
  negocio,
  aoSalvar,
  aoAbrir,
}: {
  negocio: NegocioDoCartao
  aoSalvar?: () => void
  aoAbrir?: () => void
}) {
  const rotulo = negocio.patrocinado
    ? "Patrocinado"
    : (negocio.indicacoes ?? 0) > 0
      ? "Indicado pela comunidade"
      : negocio.categoria
  const linha = negocio.aguardando
    ? "Aguardando o responsável"
    : (negocio.indicacoes ?? 0) > 0
      ? `${negocio.indicacoes} indicações da comunidade`
      : "Novo na cidade"

  return (
    <article data-cartao="negocio" data-vitrine="21st" className="bv-vitrine relative overflow-hidden rounded-2xl bg-(--surface-lowest) ring-1 ring-(--outline-variant)">
      <ProductCard animated={false} className="!max-w-none !rounded-2xl">
        <Fotografia
          fonte={negocio.fonte}
          titulo={negocio.nome}
          rotulo={rotulo}
          icone="storefront"
          aoAbrir={aoAbrir}
        />
        <Salvar salvo={negocio.salvo === true} nome="negócio" aoSalvar={aoSalvar} />
        <button
          type="button"
          data-acao="abrir-negocio"
          onClick={aoAbrir}
          className="block min-h-20 w-full text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-(--ring)"
        >
          <ProductCardContent className="!items-stretch !p-3.5">
            <ProductCardHeader className="grid gap-1.5">
              <ProductCardTitle className="!whitespace-normal line-clamp-2 text-base leading-5 font-semibold text-(--on-surface)">
                {negocio.nome}
              </ProductCardTitle>
              <ProductCardSubtitle className="line-clamp-2 text-[13px] text-(--on-surface-variant)">
                {negocio.categoria} · {negocio.bairro ?? negocio.cidade}
              </ProductCardSubtitle>
              <span className="flex items-center gap-1.5 text-xs font-medium text-(--primary)">
                <Icone nome={negocio.aguardando ? "hourglass_top" : (negocio.indicacoes ? "thumb_up" : "sell")} className="size-4" />
                {linha}
              </span>
            </ProductCardHeader>
          </ProductCardContent>
        </button>
      </ProductCard>
    </article>
  )
}
