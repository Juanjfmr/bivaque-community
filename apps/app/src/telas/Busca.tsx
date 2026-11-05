"use client"

import { useEffect, useState } from "react"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { ChipsDeFiltro, type ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { type BuscaDaCidade, buscarNaCidade } from "@/lib/dados/inicio"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"

const FILTROS: readonly ItemDeFiltro[] = [
  { id: "all", rotulo: "Tudo" },
  { id: "anuncios", rotulo: "Anúncios" },
  { id: "negocios", rotulo: "Negócios" },
  { id: "perguntas", rotulo: "Indicações" },
  { id: "grupos", rotulo: "Grupos" },
  { id: "guia", rotulo: "Guia" },
]

export function Busca() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<BuscaDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [escopo, setEscopo] = useState("all")
  const termo = casca.consulta.trim()
  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada solicita nova leitura
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(false)
    if (termo.length < 2) return () => controle.abort()
    void buscarNaCidade(termo, { signal: controle.signal })
      .then((valor) => {
        if (!controle.signal.aborted) setDados(valor)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [termo, rodada])

  const secoes =
    dados === null
      ? []
      : [
          { chave: "anuncios", titulo: "Anúncios", rota: "anuncio", itens: dados.anuncios },
          { chave: "negocios", titulo: "Negócios", rota: "negocio", itens: dados.negocios },
          {
            chave: "perguntas",
            titulo: "Indicações e respostas",
            rota: "pergunta",
            itens: dados.perguntas,
          },
          { chave: "grupos", titulo: "Grupos", rota: "grupo", itens: dados.grupos },
          { chave: "guia", titulo: "Guia", rota: "guia", itens: dados.guia },
        ].filter((secao) => escopo === "all" || secao.chave === escopo)
  const total = secoes.reduce((soma, secao) => soma + secao.itens.length, 0)

  return (
    <section data-tela="busca" className="grid gap-2">
      <CabecaDePagina
        titulo={`Buscar em ${dados?.cidade ?? casca.cidade}`}
        subtitulo="Encontre oportunidades, negócios e respostas da comunidade."
      />
      <ChipsDeFiltro
        itens={FILTROS}
        valor={escopo}
        aoEscolher={setEscopo}
        rotulo="Filtrar por tipo"
        className="mt-1"
      />
      {termo.length < 2 ? (
        <EstadoVazio
          titulo="O que você procura?"
          texto="Digite pelo menos duas letras para buscar na sua cidade."
          icone="search"
        />
      ) : erro ? (
        <EstadoDeErro aoTentar={() => setRodada((valor) => valor + 1)} />
      ) : dados === null ? (
        <EsqueletoDeLista linhas={4} />
      ) : total === 0 ? (
        <EstadoVazio
          titulo={`Nada sobre “${termo}”`}
          texto="Tente termos mais simples ou peça uma indicação à comunidade."
          icone="search_off"
        />
      ) : (
        <>
          <p className="text-sm text-(--on-surface-variant)">
            {total} {total === 1 ? "resultado" : "resultados"} em {dados.cidade}
          </p>
          {secoes
            .filter((secao) => secao.itens.length > 0)
            .map((secao) => (
              <Secao key={secao.chave} titulo={secao.titulo}>
                <div className="grid gap-2">
                  {secao.itens.map((item) => (
                    <LinhaDeLista
                      key={item.id}
                      icone={
                        secao.chave === "grupos"
                          ? "group"
                          : secao.chave === "guia"
                            ? "map"
                            : secao.chave === "perguntas"
                              ? "forum"
                              : secao.chave === "negocios"
                                ? "storefront"
                                : "sell"
                      }
                      titulo={item.title}
                      subtitulo={item.detalhe ?? ""}
                      onClick={() =>
                        void navegacao.irPara(secao.rota, { parametros: { id: item.id } })
                      }
                    />
                  ))}
                </div>
              </Secao>
            ))}
        </>
      )}
    </section>
  )
}
