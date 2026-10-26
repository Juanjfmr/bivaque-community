"use client"

import { useEffect, useMemo, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeFoto, CartaoDeNegocio } from "@/components/bivaque/cartao-de-anuncio"
import { ChipsDeFiltro, type ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { LinhaDePergunta } from "@/components/bivaque/linha-de-pergunta"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { iconeDeDado } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { normalizar } from "@/lib/texto"
import { useCasca } from "@/src/contexto/casca"

/**
 * A busca da onda 2 (protótipo: features/search/views.js), com dados de
 * demonstração.
 *
 * V1: campo, chips de escopo, contagem, resultados por tipo com teto no "Tudo"
 * e "Ver todos", sugestões, vazio honesto e erro com tentar de novo. Ficam para o refino:
 * sinônimos, trecho da resposta que bateu, palavras que completam o texto,
 * buscas recentes e o bloco "Explorar".
 */

const FILTROS: readonly ItemDeFiltro[] = [
  { id: "all", rotulo: "Tudo" },
  { id: "items", rotulo: "Anúncios" },
  { id: "biz", rotulo: "Negócios" },
  { id: "asks", rotulo: "Indicações" },
  { id: "groups", rotulo: "Grupos" },
  { id: "events", rotulo: "Encontros" },
]

const SUGESTOES = ["escola", "berço", "mudança", "mecânico"] as const

const PARADAS = new Set([
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
  "no",
  "na",
  "para",
  "com",
  "um",
  "uma",
  "por",
  "perto",
])

function termos(consulta: string): string[] {
  return normalizar(consulta)
    .split(/[^a-z0-9]+/)
    .filter((parte) => parte.length > 1 && !PARADAS.has(parte))
}

/** Todos os termos precisam aparecer no texto; consulta vazia não casa. */
function combina(consulta: string, texto: string): boolean {
  const partes = termos(consulta)
  if (partes.length === 0) return false
  const palheiro = normalizar(texto)
  return partes.every((parte) => palheiro.includes(parte))
}

function registro(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {}
}

function texto(valor: unknown, reserva = ""): string {
  return typeof valor === "string" ? valor : reserva
}

function tamanho(valor: unknown): number {
  return Array.isArray(valor) ? valor.length : 0
}

export function Busca() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const { consulta, definirConsulta: setConsulta } = casca
  const [escopo, setEscopo] = useState("all")

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

  const achados = useMemo(() => {
    const vazio = { items: [], biz: [], asks: [], groups: [], events: [] }
    if (dados === null || termos(consulta).length === 0) return vazio
    const items = dados.anuncios.filter((anuncio) => {
      const apresentacao = registro(anuncio.apresentacao)
      return (
        anuncio.status === "active" &&
        combina(
          consulta,
          [
            anuncio.title,
            anuncio.description ?? "",
            texto(apresentacao["hood"], anuncio.neighborhood ?? ""),
          ].join(" "),
        )
      )
    })
    const biz = dados.negocios.filter((negocio) => {
      const apresentacao = registro(negocio.apresentacao)
      return combina(
        consulta,
        [negocio.display_name, negocio.category ?? "", texto(apresentacao["cat"])].join(" "),
      )
    })
    const asks = dados.perguntas.filter((pergunta) => {
      const apresentacao = registro(pergunta.apresentacao)
      return combina(
        consulta,
        [texto(apresentacao["q"], pergunta.title), texto(apresentacao["topic"])].join(" "),
      )
    })
    const groups = dados.grupos.filter((grupo) => {
      const apresentacao = registro(grupo.apresentacao)
      return combina(consulta, [grupo.name, texto(apresentacao["t"])].join(" "))
    })
    const events = dados.eventos.filter((evento) =>
      combina(consulta, [evento.title, evento.description ?? "", evento.venue ?? ""].join(" ")),
    )
    return { items, biz, asks, groups, events }
  }, [dados, consulta])

  const total =
    (escopo === "all" || escopo === "items" ? achados.items.length : 0) +
    (escopo === "all" || escopo === "biz" ? achados.biz.length : 0) +
    (escopo === "all" || escopo === "asks" ? achados.asks.length : 0) +
    (escopo === "all" || escopo === "groups" ? achados.groups.length : 0) +
    (escopo === "all" || escopo === "events" ? achados.events.length : 0)

  const mostrando = (tipo: string): boolean => escopo === "all" || escopo === tipo
  const teto = escopo === "all" ? 4 : Number.POSITIVE_INFINITY
  const carregando = dados === null && !erro

  return (
    <section data-tela="busca" className="grid gap-2">
      <CabecaDePagina
        titulo={`Buscar em ${casca.cidade}`}
        subtitulo="Encontre oportunidades, negócios e respostas da comunidade."
      />

      <ChipsDeFiltro
        itens={FILTROS}
        valor={escopo}
        aoEscolher={setEscopo}
        rotulo="Filtrar por tipo"
        className="mt-1"
      />

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={4} />
      ) : termos(consulta).length === 0 ? (
        <Secao titulo="Sugestões">
          <div className="grid gap-2">
            {SUGESTOES.map((sugestao) => (
              <LinhaDeLista
                key={sugestao}
                icone="trending_up"
                titulo={sugestao}
                onClick={() => setConsulta(sugestao)}
              />
            ))}
          </div>
        </Secao>
      ) : total === 0 ? (
        <EstadoVazio
          titulo={`Nada sobre “${consulta}”`}
          texto="Tente termos mais simples. Se a dúvida ainda não tiver resposta, pergunte à comunidade."
          icone="search_off"
          acao={{
            rotulo: "Pedir indicação",
            aoAcionar: () => void navegacao.irPara("comunidade"),
          }}
        />
      ) : (
        <>
          <p className="text-sm text-(--on-surface-variant)">
            {total === 1 ? `${total} resultado` : `${total} resultados`} em {casca.cidade}
          </p>

          {mostrando("items") && achados.items.length > 0 ? (
            <Secao
              titulo="Anúncios"
              acoes={
                escopo === "all" ? (
                  <BotaoVerTodos
                    quando={achados.items.length > 4}
                    rotulo={`Ver todos os ${achados.items.length} anúncios`}
                    aoAcionar={() => setEscopo("items")}
                  />
                ) : undefined
              }
            >
              <Grade formato="cartoes">
                {achados.items.slice(0, teto).map((anuncio) => {
                  const apresentacao = registro(anuncio.apresentacao)
                  return (
                    <CartaoDeFoto
                      key={anuncio.id}
                      anuncio={{
                        id: anuncio.id,
                        fonte: texto(apresentacao["imagem"]),
                        titulo: texto(apresentacao["title"], anuncio.title),
                        preco:
                          typeof anuncio.price_cents === "number"
                            ? anuncio.price_cents / 100
                            : null,
                        icone: iconeDeDado(apresentacao["icon"]),
                        meta: texto(apresentacao["hood"], anuncio.neighborhood ?? casca.cidade),
                      }}
                      aoAbrir={() =>
                        void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })
                      }
                    />
                  )
                })}
              </Grade>
            </Secao>
          ) : null}

          {mostrando("biz") && achados.biz.length > 0 ? (
            <Secao
              titulo="Negócios"
              acoes={
                escopo === "all" ? (
                  <BotaoVerTodos
                    quando={achados.biz.length > 4}
                    rotulo={`Ver todos os ${achados.biz.length} negócios`}
                    aoAcionar={() => setEscopo("biz")}
                  />
                ) : undefined
              }
            >
              <Grade formato="cartoes">
                {achados.biz.slice(0, teto).map((negocio) => {
                  const apresentacao = registro(negocio.apresentacao)
                  return (
                    <CartaoDeNegocio
                      key={negocio.id}
                      negocio={{
                        id: negocio.id,
                        fonte: texto(apresentacao["imagem"]),
                        nome: texto(apresentacao["name"], negocio.display_name),
                        categoria: texto(apresentacao["cat"], negocio.category ?? ""),
                        cidade: casca.cidade,
                        indicacoes:
                          typeof apresentacao["recN"] === "number" ? apresentacao["recN"] : 0,
                        aguardando: apresentacao["claimed"] === false,
                      }}
                      aoAbrir={() =>
                        void navegacao.irPara("negocio", { parametros: { id: negocio.id } })
                      }
                    />
                  )
                })}
              </Grade>
            </Secao>
          ) : null}

          {mostrando("asks") && achados.asks.length > 0 ? (
            <Secao titulo="Indicações e respostas">
              <div className="grid gap-2">
                {achados.asks.slice(0, escopo === "all" ? 5 : teto).map((pergunta) => {
                  const apresentacao = registro(pergunta.apresentacao)
                  return (
                    <LinhaDePergunta
                      key={pergunta.id}
                      pergunta={{
                        id: pergunta.id,
                        pergunta: texto(apresentacao["q"], pergunta.title),
                        autor: texto(apresentacao["who"], "Alguém da cidade"),
                        tópico: texto(apresentacao["topic"], ""),
                        cidade: casca.cidade,
                        respostas: tamanho(apresentacao["answers"]),
                        resolvida: pergunta.is_resolved === true,
                      }}
                      onClick={() =>
                        void navegacao.irPara("pergunta", { parametros: { id: pergunta.id } })
                      }
                    />
                  )
                })}
              </div>
            </Secao>
          ) : null}

          {mostrando("groups") && achados.groups.length > 0 ? (
            <Secao titulo="Grupos">
              <div className="grid gap-2">
                {achados.groups.slice(0, escopo === "all" ? 5 : teto).map((grupo) => {
                  const apresentacao = registro(grupo.apresentacao)
                  return (
                    <LinhaDeLista
                      key={grupo.id}
                      icone="group"
                      titulo={texto(apresentacao["t"], grupo.name)}
                      subtitulo={`${typeof apresentacao["members"] === "number" ? apresentacao["members"] : 0} membros`}
                      onClick={() =>
                        void navegacao.irPara("grupo", { parametros: { id: grupo.id } })
                      }
                    />
                  )
                })}
              </div>
            </Secao>
          ) : null}

          {mostrando("events") && achados.events.length > 0 ? (
            <Secao titulo="Encontros">
              <div className="grid gap-2">
                {achados.events.slice(0, escopo === "all" ? 5 : teto).map((evento) => (
                  <LinhaDeLista
                    key={evento.id}
                    icone="event"
                    titulo={evento.title}
                    subtitulo={evento.venue ?? ""}
                    onClick={() =>
                      void navegacao.irPara("evento", { parametros: { id: evento.id } })
                    }
                  />
                ))}
              </div>
            </Secao>
          ) : null}
        </>
      )}
    </section>
  )
}

function BotaoVerTodos({
  quando,
  rotulo,
  aoAcionar,
}: {
  quando: boolean
  rotulo: string
  aoAcionar: () => void
}) {
  if (!quando) return null
  return (
    <button
      type="button"
      onClick={aoAcionar}
      className="rounded-xl px-3 text-sm font-medium text-(--primary) hover:bg-(--muted)"
    >
      {rotulo}
    </button>
  )
}
