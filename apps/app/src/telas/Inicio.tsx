"use client"

import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeFoto } from "@/components/bivaque/cartao-de-anuncio"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { Icone } from "@/components/bivaque/icone"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { type InicioDaCidade, lerInicio } from "@/lib/dados/inicio"
import type { NomeDeIcone } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"

const ATALHOS: readonly { rota: string; icone: NomeDeIcone; rotulo: string }[] = [
  { rota: "negocios", icone: "storefront", rotulo: "Neg?cios" },
  { rota: "desapegos", icone: "sell", rotulo: "Desapegos" },
  { rota: "imoveis", icone: "apartment", rotulo: "Im?veis" },
  { rota: "comunidade", icone: "volunteer_activism", rotulo: "Indica??es" },
]

export function Inicio() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<InicioDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const sugestao = "escola perto de casa"
  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada solicita nova leitura
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(false)
    void lerInicio({ signal: controle.signal })
      .then((valor) => {
        if (!controle.signal.aborted) setDados(valor)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [rodada])

  return (
    <section data-tela="inicio" className="grid gap-2">
      <header data-home="abertura" className="bv-home-intro">
        <div data-home="apresentacao">
          <CabecaDePagina
            className="bv-home-heading"
            titulo={`Sua rede em ${dados?.cidade ?? casca.cidade}`}
            subtitulo="Moradia, serviços e boas indicações da comunidade militar."
          />
        </div>
        <div data-home="ferramentas" className="bv-home-ferramentas">
          <button
            type="button"
            data-acao="busca"
            onClick={() => void navegacao.irPara("busca")}
            aria-label="Buscar no Bivaque"
            className="bv-home-busca"
          >
            <Icone nome="search" className="size-5 shrink-0 text-(--on-surface-variant)" />
            <span className="min-w-0 grow truncate text-sm text-(--on-surface-variant)">
              Busque <b className="font-semibold text-(--on-surface)">“{sugestao}”</b>
            </span>
            <Icone nome="chevron_right" className="size-5 shrink-0 text-(--on-surface-variant)" />
          </button>
          <nav aria-label="Áreas" className="bv-home-atalhos">
            {ATALHOS.map((atalho) => (
              <button
                key={atalho.rota}
                type="button"
                data-acao="atalho"
                data-valor={atalho.rota}
                onClick={() => void navegacao.irPara(atalho.rota)}
                className="bv-home-atalho bv-press"
              >
                <span className="bv-home-atalho-icone">
                  <Icone nome={atalho.icone} className="size-5" />
                </span>
                <span>{atalho.rotulo}</span>
              </button>
            ))}
          </nav>
        </div>
      </header>

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((valor) => valor + 1)} />
      ) : dados === null ? (
        <EsqueletoDeLista linhas={4} />
      ) : (
        <div
          data-home="conteudo"
          className="grid min-w-0 gap-x-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start"
        >
          <div className="bv-home-principal min-w-0">
            <Secao titulo="Oportunidades perto de voc?">
              {dados.anuncios.length === 0 ? (
                <EstadoVazio
                  titulo="As primeiras oportunidades aparecem aqui"
                  texto="Quando algu?m publicar nesta cidade, voc? poder? consultar e entrar em contato."
                  icone="sell"
                />
              ) : (
                <Grade formato="carrossel-mobile">
                  {dados.anuncios.slice(0, 4).map((item) => (
                    <CartaoDeFoto
                      key={item.id}
                      anuncio={{
                        id: item.id,
                        titulo: item.title,
                        preco: null,
                        meta: item.detalhe ?? dados.cidade,
                      }}
                      aoAbrir={() =>
                        void navegacao.irPara("anuncio", { parametros: { id: item.id } })
                      }
                    />
                  ))}
                </Grade>
              )}
            </Secao>
          </div>
          <aside aria-label="Comunidade na cidade" className="min-w-0 lg:sticky lg:top-16">
            <Secao
              titulo="Pr?ximo encontro"
              acoes={
                <Botao tom="texto" onClick={() => void navegacao.irPara("agenda")}>
                  Agenda
                </Botao>
              }
            >
              {dados.eventos.length === 0 ? (
                <EstadoVazio
                  titulo="Nenhum encontro agendado"
                  texto="Os pr?ximos encontros aparecem aqui."
                  icone="event"
                />
              ) : (
                dados.eventos
                  .slice(0, 1)
                  .map((item) => (
                    <LinhaDeLista
                      key={item.id}
                      icone="event"
                      titulo={item.title}
                      subtitulo={item.detalhe ? new Date(item.detalhe).toLocaleString("pt-BR") : ""}
                      onClick={() =>
                        void navegacao.irPara("evento", { parametros: { id: item.id } })
                      }
                    />
                  ))
              )}
            </Secao>
            <Secao
              titulo="A comunidade procura"
              acoes={
                <Botao tom="texto" onClick={() => void navegacao.irPara("comunidade")}>
                  Ver perguntas
                </Botao>
              }
            >
              {dados.perguntas.length === 0 ? (
                <EstadoVazio
                  titulo="Uma pergunta pode ajudar muita gente"
                  texto="Compartilhe uma d?vida com sua cidade."
                  icone="forum"
                />
              ) : (
                dados.perguntas
                  .slice(0, 2)
                  .map((item) => (
                    <LinhaDeLista
                      key={item.id}
                      icone="forum"
                      titulo={item.title}
                      subtitulo={item.detalhe ?? ""}
                      onClick={() =>
                        void navegacao.irPara("pergunta", { parametros: { id: item.id } })
                      }
                    />
                  ))
              )}
            </Secao>
          </aside>
        </div>
      )}
    </section>
  )
}
