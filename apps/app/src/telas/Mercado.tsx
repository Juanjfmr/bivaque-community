"use client"

import { useEffect, useMemo, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeFoto, CartaoDeNegocio } from "@/components/bivaque/cartao-de-anuncio"
import { ChipsDeFiltro, type ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { iconeDeDado } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { numero, registro, texto } from "@/src/telas/comum"

/**
 * O Mercado da onda 5 (protótipo: features/listings/catalog.js), com dados de
 * demonstração.
 *
 * V1: uma lista por aba (Desapegos, Imóveis, Negócios), com as sub-abas
 * navegando de verdade, contagem, salvar local e vazios. Ficam para o refino:
 * filtros de ordenação, faixa de preço, mapa, painel de bairro e paginação.
 */

export type AbaDoMercado = "desapegos" | "imoveis" | "negocios"

const SUBABAS: readonly ItemDeFiltro[] = [
  { id: "desapegos", rotulo: "Desapegos" },
  { id: "imoveis", rotulo: "Imóveis" },
  { id: "negocios", rotulo: "Negócios" },
]

function ehImovel(kind: unknown): boolean {
  return kind === "imovel" || kind === "property"
}

export function ListaDeMercado({
  inicial,
  comAbas = true,
}: {
  inicial: AbaDoMercado
  comAbas?: boolean
}) {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [salvos, setSalvos] = useState<ReadonlySet<string>>(() => new Set())

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(false)
    void dadosDoApp
      .lerCidade(casca.cidade, { signal: controle.signal })
      .then((lidos) => {
        if (!controle.signal.aborted) setDados(lidos)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [casca.cidade, rodada])

  const itens = useMemo(() => {
    if (dados === null) return []
    return dados.anuncios
      .map((anuncio) => ({ anuncio, apresentacao: registro(anuncio.apresentacao) }))
      .filter(({ anuncio }) =>
        inicial === "imoveis"
          ? anuncio.kind !== null && ehImovel(anuncio.kind)
          : !ehImovel(anuncio.kind),
      )
  }, [dados, inicial])

  const negocios = useMemo(() => {
    if (dados === null) return []
    return dados.negocios
      .map((negocio) => ({ negocio, apresentacao: registro(negocio.apresentacao) }))
      .sort((a, b) => numero(b.apresentacao["recN"]) - numero(a.apresentacao["recN"]))
  }, [dados])

  const alternarSalvo = (id: string) => {
    setSalvos((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  const carregando = dados === null && !erro
  const titulo =
    inicial === "desapegos" ? "Desapegos" : inicial === "imoveis" ? "Imóveis" : "Negócios locais"

  return (
    <section data-tela={inicial} className="grid gap-2">
      <CabecaDePagina
        titulo={titulo}
        subtitulo={`O que a comunidade de ${casca.cidade} está anunciando.`}
      />

      {comAbas ? (
        <ChipsDeFiltro
          itens={SUBABAS}
          valor={inicial}
          aoEscolher={(aba) => void navegacao.irPara(aba)}
          rotulo="Seções do Mercado"
        />
      ) : null}

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={4} />
      ) : inicial === "negocios" ? (
        negocios.length === 0 ? (
          <EstadoVazio
            titulo="Ainda sem negócios cadastrados"
            texto="As indicações da comunidade ajudarão a formar o guia de serviços."
            icone="storefront"
          />
        ) : (
          <>
            <p className="text-sm text-(--on-surface-variant)">
              {negocios.length === 1 ? "1 negócio" : `${negocios.length} negócios`} em{" "}
              {casca.cidade}
            </p>
            <Grade formato="cartoes">
              {negocios.map(({ negocio, apresentacao }) => (
                <CartaoDeNegocio
                  key={negocio.id}
                  negocio={{
                    id: negocio.id,
                    nome: texto(apresentacao["name"], negocio.display_name),
                    categoria: texto(apresentacao["cat"], negocio.category ?? ""),
                    cidade: casca.cidade,
                    indicacoes: numero(apresentacao["recN"]),
                    patrocinado: apresentacao["spon"] === true,
                    aguardando: apresentacao["claimed"] === false,
                  }}
                  aoAbrir={() =>
                    void navegacao.irPara("negocio", { parametros: { id: negocio.id } })
                  }
                />
              ))}
            </Grade>
          </>
        )
      ) : itens.length === 0 ? (
        <EstadoVazio
          titulo="Nada anunciado nesta seção"
          texto="Quando alguém publicar, o anúncio aparece aqui para toda a cidade."
          icone="sell"
        />
      ) : (
        <>
          <p className="text-sm text-(--on-surface-variant)">
            {itens.length === 1 ? "1 anúncio" : `${itens.length} anúncios`} em {casca.cidade}
          </p>
          <Grade formato="cartoes">
            {itens.map(({ anuncio, apresentacao }) => (
              <CartaoDeFoto
                key={anuncio.id}
                anuncio={{
                  id: anuncio.id,
                  titulo: texto(apresentacao["title"], anuncio.title),
                  preco: typeof anuncio.price_cents === "number" ? anuncio.price_cents / 100 : null,
                  icone: iconeDeDado(apresentacao["icon"]),
                  meta: texto(apresentacao["hood"], anuncio.neighborhood ?? casca.cidade),
                  salvo: salvos.has(anuncio.id) || apresentacao["saved"] === true,
                }}
                aoSalvar={() => alternarSalvo(anuncio.id)}
                aoAbrir={() => void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })}
              />
            ))}
          </Grade>
        </>
      )}
    </section>
  )
}

export function Mercado() {
  return <ListaDeMercado inicial="desapegos" />
}

export function Desapegos() {
  return <ListaDeMercado inicial="desapegos" />
}

export function Catalogo() {
  return <ListaDeMercado inicial="desapegos" />
}

export function Imoveis() {
  return <ListaDeMercado inicial="imoveis" comAbas={false} />
}

export function Negocios() {
  return <ListaDeMercado inicial="negocios" comAbas={false} />
}
