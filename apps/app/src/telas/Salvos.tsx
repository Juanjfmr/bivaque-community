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
 * Salvos (onda 5): os anúncios marcados como salvos na demonstração. O salvar
 * de verdade (por conta) chega com o backend; aqui a lista é de leitura.
 */
export function Salvos() {
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

  const itens = useMemo(() => {
    if (dados === null) return []
    return dados.anuncios
      .map((anuncio) => ({ anuncio, apresentacao: registro(anuncio.apresentacao) }))
      .filter(({ apresentacao }) => apresentacao["saved"] === true)
  }, [dados])

  const carregando = dados === null && !erro

  return (
    <section data-tela="salvos" className="grid gap-2">
      <CabecaDePagina titulo="Salvos" subtitulo="Anúncios guardados para ver com calma." />

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={3} />
      ) : itens.length === 0 ? (
        <EstadoVazio
          titulo="Nada salvo por aqui"
          texto="Toque no marcador de um anúncio para guardá-lo nesta lista."
          icone="bookmark_border"
          acao={{
            rotulo: "Ver anúncios",
            aoAcionar: () => void navegacao.irPara("desapegos"),
          }}
        />
      ) : (
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
                salvo: true,
              }}
              aoAbrir={() => void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })}
            />
          ))}
        </Grade>
      )}
    </section>
  )
}
