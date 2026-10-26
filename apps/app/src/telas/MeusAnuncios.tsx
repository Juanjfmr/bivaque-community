"use client"

import { useEffect, useMemo, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeFoto } from "@/components/bivaque/cartao-de-anuncio"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { iconeDeDado } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { registro, texto } from "@/src/telas/comum"

/**
 * Meus anúncios (onda 5): os anúncios da própria pessoa na demonstração.
 * Editar e pausar chegam com o editor (onda 6).
 */
export function MeusAnuncios() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)

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

  const meus = useMemo(() => {
    if (dados === null) return []
    return dados.anuncios
      .map((anuncio) => ({ anuncio, apresentacao: registro(anuncio.apresentacao) }))
      .filter(({ apresentacao }) => apresentacao["mine"] === true)
  }, [dados])

  const carregando = dados === null && !erro

  return (
    <section data-tela="meus-anuncios" className="grid gap-2">
      <CabecaDePagina
        titulo="Meus anúncios"
        subtitulo="Seus anúncios ativos e o estado de cada um."
      />

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={3} />
      ) : meus.length === 0 ? (
        <EstadoVazio
          titulo="Você ainda não anunciou nada"
          texto="Um anúncio bem explicado costuma vender rápido na cidade."
          icone="sell"
          acao={{
            rotulo: "Anunciar desapego",
            aoAcionar: () => void navegacao.irPara("desapegos"),
          }}
        />
      ) : (
        <Grade formato="cartoes">
          {meus.map(({ anuncio, apresentacao }) => (
            <CartaoDeFoto
              key={anuncio.id}
              anuncio={{
                id: anuncio.id,
                titulo: texto(apresentacao["title"], anuncio.title),
                preco: typeof anuncio.price_cents === "number" ? anuncio.price_cents / 100 : null,
                icone: iconeDeDado(apresentacao["icon"]),
                meta: texto(apresentacao["hood"], anuncio.neighborhood ?? casca.cidade),
              }}
              aoAbrir={() => void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })}
            />
          ))}
        </Grade>
      )}
    </section>
  )
}
