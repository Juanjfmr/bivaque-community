"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoVitrineAnuncio } from "@/components/bivaque/cartao-vitrine"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { Icone } from "@/components/bivaque/icone"
import { LinhaDePergunta } from "@/components/bivaque/linha-de-pergunta"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { iconeDeDado, type NomeDeIcone } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { FavoritosDaVizinhanca, GuiaDaCidadeNaHome, MoradiaNaCidade } from "@/src/telas/GuiaNaHome"

/**
 * O Início da onda 2 (protótipo: features/home/views.js renderHome e
 * features/home/desktop.js), com dados de demonstração.
 *
 * V1: cabeça com a cidade, busca com exemplo que gira, atalhos, faixa de
 * contratação, serviços recomendados, oportunidades, grupos, próximo
 * encontro, perguntas da cidade, guia e o convite de negócio. Salvar e
 * confirmar são estado local (sem backend). Ficam para o refino: patrocinado
 * na posição fixa, "Continue de onde parou", plano
 * de chegada/saída e as duas colunas do desktop — a ordem segue a do celular.
 */

const EXEMPLOS_DE_BUSCA = [
  "diarista de confiança",
  "escola perto de casa",
  "berço",
  "apartamento de 2 quartos",
  "pediatra pelo plano",
] as const

type Atalho = { readonly rota: string; readonly icone: NomeDeIcone; readonly rotulo: string }

const ATALHOS: readonly Atalho[] = [
  { rota: "negocios", icone: "storefront", rotulo: "Negócios" },
  { rota: "desapegos", icone: "sell", rotulo: "Desapegos" },
  { rota: "imoveis", icone: "apartment", rotulo: "Imóveis" },
  { rota: "comunidade", icone: "volunteer_activism", rotulo: "Indicações" },
]

/** Leitura defensiva do campo Json "apresentacao" do contrato, sem any. */
function registro(valor: unknown): Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor)
    ? (valor as Record<string, unknown>)
    : {}
}

function texto(valor: unknown, reserva = ""): string {
  return typeof valor === "string" ? valor : reserva
}

function numero(valor: unknown): number {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : 0
}

function tamanho(valor: unknown): number {
  return Array.isArray(valor) ? valor.length : 0
}

export function Inicio() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [exemplo, setExemplo] = useState(0)
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

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const relogio = window.setInterval(() => {
      setExemplo((atual) => (atual + 1) % EXEMPLOS_DE_BUSCA.length)
    }, 3200)
    return () => window.clearInterval(relogio)
  }, [])

  const alternarSalvo = useCallback((id: string) => {
    setSalvos((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }, [])

  const anuncios = useMemo(() => {
    if (dados === null) return []
    return dados.anuncios
      .filter((anuncio) => anuncio.status === "active" && anuncio.kind !== "property")
      .slice(0, 4)
      .map((anuncio) => ({ anuncio, apresentacao: registro(anuncio.apresentacao) }))
  }, [dados])

  const grupos = useMemo(() => {
    if (dados === null) return []
    return dados.grupos
      .map((grupo) => ({ grupo, apresentacao: registro(grupo.apresentacao) }))
      .filter(({ apresentacao }) => apresentacao["on"] === true)
      .slice(0, 2)
  }, [dados])

  const eventos = useMemo(() => {
    if (dados === null) return []
    const agora = Date.now()
    return dados.eventos
      .filter((evento) => evento.status !== "cancelled" && typeof evento.starts_at === "string")
      .filter((evento) => {
        const quando = Date.parse(typeof evento.starts_at === "string" ? evento.starts_at : "")
        return Number.isFinite(quando) && quando >= agora
      })
      .sort(
        (a, b) =>
          Date.parse(typeof a.starts_at === "string" ? a.starts_at : "") -
          Date.parse(typeof b.starts_at === "string" ? b.starts_at : ""),
      )
      .slice(0, 3)
  }, [dados])

  const perguntas = useMemo(() => {
    if (dados === null) return []
    return dados.perguntas
      .map((pergunta) => ({ pergunta, apresentacao: registro(pergunta.apresentacao) }))
      .filter(({ apresentacao }) => texto(apresentacao["status"], "open") === "open")
      .sort((a, b) => tamanho(a.apresentacao["answers"]) - tamanho(b.apresentacao["answers"]))
      .slice(0, 2)
  }, [dados])

  const sugestao = EXEMPLOS_DE_BUSCA[exemplo] ?? ""
  const carregando = dados === null && !erro

  return (
    <section data-tela="inicio" className="grid gap-2">
      <header data-home="abertura" className="bv-home-intro">
        <div data-home="apresentacao">
          <CabecaDePagina
            className="bv-home-heading"
            titulo={`Sua rede em ${casca.cidade}`}
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
        <div className="mt-4">
          <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
        </div>
      ) : carregando ? (
        <div className="mt-4">
          <EsqueletoDeLista linhas={4} />
        </div>
      ) : dados !== null ? (
        <>
          <div
            data-home="conteudo"
            className="grid min-w-0 gap-x-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start"
          >
            <div className="bv-home-principal min-w-0">
              <FavoritosDaVizinhanca
                dados={dados}
                cidade={casca.cidade}
                salvos={salvos}
                aoSalvar={alternarSalvo}
                aoAbrirNegocio={(id) => void navegacao.irPara("negocio", { parametros: { id } })}
                aoAbrirNegocios={() => void navegacao.irPara("negocios")}
              />
              <MoradiaNaCidade
                dados={dados}
                cidade={casca.cidade}
                salvos={salvos}
                aoSalvar={alternarSalvo}
                aoAbrirAnuncio={(id) => void navegacao.irPara("anuncio", { parametros: { id } })}
                aoAbrirImoveis={() => void navegacao.irPara("imoveis")}
              />

              <button
                type="button"
                data-acao="contratar"
                onClick={() => void navegacao.irPara("pedidos")}
                className="bv-home-contratar bv-press"
              >
                <span className="bv-home-contratar-icone">
                  <Icone nome="build" className="size-5" />
                </span>
                <span className="min-w-0 grow text-left">
                  <b className="block text-sm">Precisa contratar um serviço?</b>
                  <small className="block text-xs text-(--on-surface-variant)">
                    Peça propostas à comunidade
                  </small>
                </span>
                <Icone nome="chevron_right" className="size-5 shrink-0 text-(--brasa)" />
              </button>

              <Secao titulo="Desapegos na cidade">
                {anuncios.length === 0 ? (
                  <EstadoVazio
                    titulo="As primeiras oportunidades aparecem aqui"
                    texto="Quando alguém publicar nesta cidade, você poderá consultar e entrar em contato."
                    icone="sell"
                    acao={{
                      rotulo: "Anunciar desapego",
                      aoAcionar: () => void navegacao.irPara("desapegos"),
                    }}
                  />
                ) : (
                  <Grade formato="carrossel-mobile">
                    {anuncios.map(({ anuncio, apresentacao }) => (
                      <CartaoVitrineAnuncio
                        key={anuncio.id}
                        anuncio={{
                          id: anuncio.id,
                          fonte: texto(apresentacao["imagem"]),
                          rotulo: texto(apresentacao["flag"]) || undefined,
                          porMes: texto(apresentacao["per"]) === "/mês",
                          titulo: texto(apresentacao["title"], anuncio.title),
                          preco: precoDoAnuncio(anuncio.price_cents),
                          icone: iconeDeDado(apresentacao["icon"]),
                          meta: texto(apresentacao["hood"], anuncio.neighborhood ?? casca.cidade),
                          salvo: salvos.has(anuncio.id),
                        }}
                        aoSalvar={() => alternarSalvo(anuncio.id)}
                        aoAbrir={() =>
                          void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })
                        }
                      />
                    ))}
                  </Grade>
                )}
              </Secao>
            </div>
            <aside aria-label="Comunidade na cidade" className="min-w-0 lg:sticky lg:top-16">
              {grupos.length === 0 ? null : (
                <Secao titulo="Nos seus grupos">
                  <div className="grid gap-2">
                    {grupos.map(({ grupo, apresentacao }) => (
                      <LinhaDeLista
                        key={grupo.id}
                        icone="group"
                        titulo={texto(apresentacao["t"], grupo.name)}
                        subtitulo={`${numero(apresentacao["members"])} membros`}
                        onClick={() =>
                          void navegacao.irPara("grupo", { parametros: { id: grupo.id } })
                        }
                      />
                    ))}
                  </div>
                </Secao>
              )}

              <Secao
                titulo="Próximos encontros"
                acoes={
                  <Botao tom="texto" onClick={() => void navegacao.irPara("agenda")}>
                    Agenda
                  </Botao>
                }
              >
                {eventos.length === 0 ? (
                  <p className="text-sm text-(--on-surface-variant)">
                    Nenhum encontro futuro registrado nesta cidade.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {eventos.map((evento) => (
                      <LinhaDeLista
                        key={evento.id}
                        icone="event"
                        titulo={evento.title}
                        subtitulo={resumoDoEncontro(evento.starts_at, texto(evento.venue))}
                        fim={
                          <span className="text-[13px] font-medium text-(--primary)">
                            Ver evento
                          </span>
                        }
                        onClick={() =>
                          void navegacao.irPara("evento", { parametros: { id: evento.id } })
                        }
                      />
                    ))}
                  </div>
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
                {perguntas.length === 0 ? (
                  <EstadoVazio
                    titulo="Uma pergunta pode ajudar muita gente"
                    texto="Busque uma indicação ou compartilhe uma dúvida com sua cidade."
                    icone="forum"
                    acao={{
                      rotulo: "Pedir indicação",
                      aoAcionar: () => void navegacao.irPara("comunidade"),
                    }}
                  />
                ) : (
                  <div className="grid gap-2">
                    {perguntas.map(({ pergunta, apresentacao }) => (
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
                    ))}
                  </div>
                )}
              </Secao>
            </aside>
          </div>
          <GuiaDaCidadeNaHome
            cidade={casca.cidade}
            aoAbrirGuia={() => void navegacao.irPara("guia")}
            aoAbrirImoveis={() => void navegacao.irPara("imoveis")}
          />

          <div className="mt-7 flex items-center gap-3 rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)">
            <Icone nome="add_business" className="size-6 shrink-0 text-(--primary)" />
            <span className="grid grow gap-0.5">
              <b className="text-[15px]">Tem um negócio?</b>
              <small className="text-(--on-surface-variant)">
                Crie sua página e receba pedidos da comunidade.
              </small>
            </span>
            <Botao tom="texto" onClick={() => void navegacao.irPara("negocios")}>
              Criar página
            </Botao>
          </div>
        </>
      ) : null}
    </section>
  )
}

/** Preço em reais do anúncio, ou nulo quando o dado não vier. */
function precoDoAnuncio(centavos: unknown): number | null {
  return typeof centavos === "number" && Number.isFinite(centavos) ? centavos / 100 : null
}

/** "08 de nov. · 14:00 · Local" a partir do carimbo de data do encontro. */
function resumoDoEncontro(startsAt: unknown, local: string): string {
  const data = new Date(typeof startsAt === "string" ? startsAt : "")
  if (Number.isNaN(data.getTime())) return local
  const dia = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return `${dia} · ${hora} · ${local}`
}
