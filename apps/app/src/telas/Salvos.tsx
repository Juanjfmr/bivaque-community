"use client"

import { useEffect, useMemo, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeFoto } from "@/components/bivaque/cartao-de-anuncio"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { lerPublicacoesSalvas, type PublicacaoReal } from "@/lib/dados/grupos"
import { type EntradaDoGuia, lerSalvosDoGuia } from "@/lib/dados/guia"
import { iconeDeDado } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { ICONE_DA_CATEGORIA } from "@/src/guia/comum"
import { registro, texto } from "@/src/telas/comum"

/**
 * Salvos: os anúncios da demonstração, as publicações de grupo e as referências
 * do guia salvas pelo membro. A seção de anúncios continua de leitura; as outras
 * duas vêm das rotas da sessão (`/api/app/grupos/salvas` e `/api/app/guia/salvos`),
 * então sobrevivem ao recarregar e valem para a conta, não para o aparelho.
 */
export function Salvos() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [publicacoes, setPublicacoes] = useState<readonly PublicacaoReal[] | null>(null)
  const [erroDasPublicacoes, setErroDasPublicacoes] = useState(false)
  const [rodadaDasPublicacoes, setRodadaDasPublicacoes] = useState(0)
  const [guia, setGuia] = useState<readonly EntradaDoGuia[] | null>(null)
  const [erroDoGuia, setErroDoGuia] = useState(false)
  const [rodadaDoGuia, setRodadaDoGuia] = useState(0)

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

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setGuia(null)
    setErroDoGuia(false)
    void lerSalvosDoGuia({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setGuia(lidas)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErroDoGuia(true)
      })
    return () => controle.abort()
  }, [rodadaDoGuia])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setPublicacoes(null)
    setErroDasPublicacoes(false)
    void lerPublicacoesSalvas({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setPublicacoes(lidas)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErroDasPublicacoes(true)
      })
    return () => controle.abort()
  }, [rodadaDasPublicacoes])

  const itens = useMemo(() => {
    if (dados === null) return []
    return dados.anuncios
      .map((anuncio) => ({ anuncio, apresentacao: registro(anuncio.apresentacao) }))
      .filter(({ apresentacao }) => apresentacao["saved"] === true)
  }, [dados])

  const carregando = dados === null && !erro

  return (
    <section data-tela="salvos" className="grid gap-2">
      <CabecaDePagina
        titulo="Salvos"
        subtitulo="Anúncios e referências do guia guardados para ver com calma."
      />

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={3} />
      ) : itens.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum anúncio salvo"
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

      <section data-salvos="publicacoes" className="grid gap-2">
        <h2 className="text-[17px]">Publicações salvas</h2>
        {erroDasPublicacoes ? (
          <EstadoDeErro
            titulo="Não foi possível carregar suas publicações"
            aoTentar={() => setRodadaDasPublicacoes((atual) => atual + 1)}
          />
        ) : publicacoes === null ? (
          <EsqueletoDeLista linhas={2} />
        ) : publicacoes.length === 0 ? (
          <p className="text-sm text-(--on-surface-variant)">
            Nenhuma publicação salva ainda. Toque em Salvar publicação no menu de uma publicação de
            grupo.
          </p>
        ) : (
          <Lista>
            {publicacoes.map((publicacao) => (
              <LinhaDeLista
                key={publicacao.id}
                icone="forum"
                titulo={publicacao.texto}
                subtitulo={publicacao.autor || "Membro do grupo"}
                tituloMultilinha
                onClick={() =>
                  void navegacao.irPara("publicacao", { parametros: { id: publicacao.id } })
                }
              />
            ))}
          </Lista>
        )}
      </section>

      <section data-salvos="guia" className="grid gap-2">
        <h2 className="text-[17px]">Referências do guia</h2>
        {erroDoGuia ? (
          <EstadoDeErro
            titulo="Não foi possível carregar suas referências"
            aoTentar={() => setRodadaDoGuia((atual) => atual + 1)}
          />
        ) : guia === null ? (
          <EsqueletoDeLista linhas={2} />
        ) : guia.length === 0 ? (
          <p className="text-sm text-(--on-surface-variant)">
            Nenhuma referência do guia salva ainda.
          </p>
        ) : (
          <Lista>
            {guia.map((entrada) => (
              <LinhaDeLista
                key={entrada.id}
                icone={ICONE_DA_CATEGORIA[entrada.categoria]}
                titulo={entrada.nome}
                subtitulo={entrada.descricao}
                onClick={() => void navegacao.irPara("guia")}
              />
            ))}
          </Lista>
        )}
      </section>
    </section>
  )
}
