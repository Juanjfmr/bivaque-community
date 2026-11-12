"use client"

import { useNavigate } from "@tanstack/react-router"
import { useCallback, useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoVitrineAnuncio, CartaoVitrineNegocio } from "@/components/bivaque/cartao-vitrine"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { Icone } from "@/components/bivaque/icone"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import {
  buscarEncontro,
  cancelarPresenca,
  marcarPresenca,
  type Presenca,
} from "@/lib/dados/eventos"
import { type InicioDaCidade, lerInicio } from "@/lib/dados/inicio"
import type { NomeDeIcone } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { registrarRecente } from "@/src/busca/recentes"
import { termoAceito } from "@/src/busca/termo-url"
import { useCasca } from "@/src/contexto/casca"
import { CartaoDaPublicacao } from "@/src/inicio/CartaoDaPublicacao"
import { rotuloDaCategoria } from "@/src/inicio/categorias"

/**
 * O Início, com o conteúdo real da cidade da sessão (LAN-F02).
 *
 * O desenho do parecer cego de 12/11: o campo "Buscar em [cidade]" é um campo
 * de verdade (o termo enviado chega a `/app/busca?q=`), o feed é uma coluna de
 * leitura — cada publicação da comunidade vira cartão — e, no computador, há
 * um trilho de contexto ao lado. Sem conteúdo, a tela mostra o que a cidade
 * ainda não tem e o caminho que resolve, nunca uma lista vazia sem saída.
 *
 * "Vou/Confirmado" do próximo encontro grava pela rota de presença do F05 e
 * mostra o que o banco devolveu. O que o banco ainda não tem — foto de anúncio
 * e de negócio, autor da pergunta, contagens de "útil" — fica de fora do
 * cartão, sem valor inventado.
 */

type Atalho = { readonly rota: string; readonly icone: NomeDeIcone; readonly rotulo: string }

const ATALHOS: readonly Atalho[] = [
  { rota: "negocios", icone: "storefront", rotulo: "Negócios" },
  { rota: "desapegos", icone: "sell", rotulo: "Desapegos" },
  { rota: "imoveis", icone: "apartment", rotulo: "Imóveis" },
  { rota: "comunidade", icone: "volunteer_activism", rotulo: "Indicações" },
]

function resumoDoEncontro(comecaEm: string | null, local: string | null): string {
  const data = new Date(comecaEm ?? "")
  if (Number.isNaN(data.getTime())) return local ?? ""
  const dia = data.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return local === null ? `${dia} · ${hora}` : `${dia} · ${hora} · ${local}`
}

export function Inicio() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const navegar = useNavigate()
  const [dados, setDados] = useState<InicioDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [termo, setTermo] = useState("")
  const [termoCurto, setTermoCurto] = useState(false)
  const campoDaBusca = useRef<HTMLInputElement | null>(null)
  const [salvos, setSalvos] = useState<ReadonlySet<string>>(() => new Set())
  const [presenca, setPresenca] = useState<Presenca | null>(null)
  const [erroPresenca, setErroPresenca] = useState(false)
  const [gravando, setGravando] = useState(false)
  const [tentativaPresenca, setTentativaPresenca] = useState(0)
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

  const eventoId = dados?.eventos[0]?.id
  // biome-ignore lint/correctness/useExhaustiveDependencies: tentativa solicita nova leitura
  useEffect(() => {
    const controle = new AbortController()
    setPresenca(null)
    setErroPresenca(false)
    if (eventoId !== undefined) {
      void buscarEncontro(eventoId, { signal: controle.signal })
        .then((encontro) => {
          if (!controle.signal.aborted) setPresenca(encontro.presenca)
        })
        .catch(() => {
          if (!controle.signal.aborted) setErroPresenca(true)
        })
    }
    return () => controle.abort()
  }, [eventoId, tentativaPresenca])

  async function alternarPresenca(id: string) {
    if (presenca === null || gravando) return
    setGravando(true)
    setErroPresenca(false)
    try {
      setPresenca(
        presenca.minha === "going" ? await cancelarPresenca(id) : await marcarPresenca(id, "going"),
      )
    } catch {
      setErroPresenca(true)
    } finally {
      setGravando(false)
    }
  }

  const alternarSalvo = useCallback((id: string) => {
    setSalvos((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }, [])

  /**
   * Enviar o termo abre a busca já consultando (PR #195). Vazio não navega e
   * um caractere só também não: a rota recusaria o termo, e a tela mostraria
   * erro em vez de resultado. O termo aceito entra em `?q=` e nas recentes.
   */
  async function enviarTermo(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const aceito = termoAceito(termo)
    if (aceito === null) {
      setTermoCurto(termo.trim() !== "")
      campoDaBusca.current?.focus()
      return
    }
    setTermoCurto(false)
    registrarRecente(aceito)
    casca.definirConsulta(aceito)
    await navegacao.irPara("busca")
    void navegar({
      to: "/busca",
      search: { q: aceito },
      replace: true,
      state: true,
      resetScroll: false,
    })
  }

  const cidade = dados?.cidade ?? casca.cidade
  const negocios = dados?.negocios.slice(0, 4) ?? []
  const anuncios = dados?.anuncios.slice(0, 4) ?? []
  const grupos = dados?.grupos.slice(0, 2) ?? []
  const encontro = dados?.eventos[0] ?? null
  const perguntas = [...(dados?.perguntas ?? [])]
    .sort((a, b) => a.respostas - b.respostas)
    .slice(0, 4)
  const cidadeVazia =
    dados !== null &&
    perguntas.length === 0 &&
    negocios.length === 0 &&
    anuncios.length === 0 &&
    grupos.length === 0 &&
    dados.eventos.length === 0

  return (
    <section data-tela="inicio" className="grid gap-2">
      <header data-home="abertura" className="bv-home-intro">
        <div data-home="apresentacao">
          <CabecaDePagina
            className="bv-home-heading"
            titulo={`Sua rede em ${cidade}`}
            subtitulo="Moradia, serviços e boas indicações da comunidade militar."
          />
        </div>
        <div data-home="ferramentas" className="bv-home-ferramentas">
          <search data-home="busca" className="bv-home-busca">
            <form className="bv-home-busca-form" onSubmit={enviarTermo}>
              <button
                type="submit"
                data-acao="buscar-termo"
                aria-label={`Buscar em ${cidade}`}
                className="bv-home-busca-acao"
              >
                <Icone nome="search" className="size-5" />
              </button>
              <input
                ref={campoDaBusca}
                data-campo="busca-do-inicio"
                type="search"
                inputMode="search"
                enterKeyHint="search"
                value={termo}
                onChange={(evento) => {
                  setTermo(evento.target.value)
                  setTermoCurto(false)
                }}
                aria-label={`Buscar em ${cidade}`}
                aria-invalid={termoCurto ? true : undefined}
                placeholder={`Buscar em ${cidade}`}
                className="bv-home-busca-campo"
              />
              <button
                type="button"
                data-acao="busca"
                aria-label="Abrir a busca"
                onClick={() => void navegacao.irPara("busca")}
                className="bv-home-busca-acao"
              >
                <Icone nome="chevron_right" className="size-5" />
              </button>
            </form>
          </search>
          {termoCurto ? (
            <p role="alert" className="text-xs text-(--destructive)">
              Escreva ao menos duas letras para buscar.
            </p>
          ) : null}
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
          <EstadoDeErro aoTentar={() => setRodada((valor) => valor + 1)} />
        </div>
      ) : dados === null ? (
        <div className="mt-4">
          <EsqueletoDeLista linhas={4} />
        </div>
      ) : (
        <div data-home="conteudo">
          <div data-home="leitura" className="grid min-w-0 gap-0">
            {cidadeVazia ? (
              <Secao titulo={`${cidade} está começando`} className="mt-4">
                <EstadoVazio
                  titulo="A primeira publicação abre a cidade"
                  texto="Ninguém publicou por aqui ainda. Quem publicar primeiro aparece para toda a cidade — e quem chegar depois encontra."
                  icone="public"
                >
                  <div className="flex flex-wrap justify-center gap-2">
                    <Botao
                      tom="tonal"
                      icone="add"
                      onClick={() => void navegacao.abrir("menu-criar")}
                    >
                      Publicar na cidade
                    </Botao>
                    <Botao
                      tom="contornado"
                      icone="volunteer_activism"
                      onClick={() => void navegacao.irPara("comunidade")}
                    >
                      Ver perguntas
                    </Botao>
                  </div>
                </EstadoVazio>
              </Secao>
            ) : (
              <>
                <Secao
                  titulo="Serviços recomendados"
                  acoes={
                    <Botao tom="texto" onClick={() => void navegacao.irPara("negocios")}>
                      Ver negócios
                    </Botao>
                  }
                >
                  <p className="text-sm text-(--on-surface-variant)">
                    Indicados pela comunidade de {cidade}
                  </p>
                  {negocios.length === 0 ? (
                    <EstadoVazio
                      titulo="Ainda sem negócios cadastrados"
                      texto="As indicações da comunidade ajudarão a formar o guia de serviços."
                      icone="storefront"
                    />
                  ) : (
                    <Grade formato="carrossel-mobile">
                      {negocios.map((negocio) => (
                        <CartaoVitrineNegocio
                          key={negocio.id}
                          negocio={{
                            id: negocio.id,
                            nome: negocio.nome,
                            categoria: rotuloDaCategoria(negocio.categoria),
                            cidade,
                            salvo: salvos.has(negocio.id),
                          }}
                          aoSalvar={() => alternarSalvo(negocio.id)}
                          aoAbrir={() =>
                            void navegacao.irPara("negocio", { parametros: { id: negocio.id } })
                          }
                        />
                      ))}
                    </Grade>
                  )}
                </Secao>

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

                <Secao titulo="Oportunidades perto de você">
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
                      {anuncios.map((anuncio) => (
                        <CartaoVitrineAnuncio
                          key={anuncio.id}
                          anuncio={{
                            id: anuncio.id,
                            titulo: anuncio.title,
                            preco:
                              anuncio.precoCentavos === null ? null : anuncio.precoCentavos / 100,
                            icone: anuncio.tipo === "property" ? "apartment" : "sell",
                            meta: anuncio.bairro ?? cidade,
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
                      {perguntas.map((pergunta) => (
                        <CartaoDaPublicacao
                          key={pergunta.id}
                          publicacao={{
                            id: pergunta.id,
                            autor: "Alguém da cidade",
                            local: cidade,
                            quando: pergunta.grupo ?? "",
                            texto: pergunta.title,
                            respostas: pergunta.respostas,
                            resolvida: pergunta.resolvida,
                          }}
                          salva={salvos.has(pergunta.id)}
                          aoSalvar={() => alternarSalvo(pergunta.id)}
                          aoAbrir={() =>
                            void navegacao.irPara("pergunta", { parametros: { id: pergunta.id } })
                          }
                        />
                      ))}
                    </div>
                  )}
                </Secao>

                <Secao
                  titulo={`Guia de ${cidade}`}
                  acoes={
                    <Botao tom="texto" onClick={() => void navegacao.irPara("guia")}>
                      Abrir guia
                    </Botao>
                  }
                >
                  <LinhaDeLista
                    icone="map"
                    titulo="Organize moradia, mudança e serviços"
                    subtitulo="Um roteiro prático para se estabelecer na cidade."
                    onClick={() => void navegacao.irPara("guia")}
                  />
                </Secao>

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
            )}
          </div>

          <aside data-home="contexto" aria-label="Contexto da cidade" className="min-w-0">
            {grupos.length === 0 ? null : (
              <Secao titulo="Nos seus grupos">
                <div className="grid gap-2">
                  {grupos.map((grupo) => (
                    <LinhaDeLista
                      key={grupo.id}
                      icone="group"
                      titulo={grupo.nome}
                      subtitulo={`${grupo.membros} ${grupo.membros === 1 ? "membro" : "membros"}`}
                      onClick={() =>
                        void navegacao.irPara("grupo", { parametros: { id: grupo.id } })
                      }
                    />
                  ))}
                </div>
              </Secao>
            )}

            {encontro === null ? null : (
              <Secao
                titulo="Próximo encontro"
                acoes={
                  <Botao tom="texto" onClick={() => void navegacao.irPara("agenda")}>
                    Agenda
                  </Botao>
                }
              >
                <LinhaDeLista
                  icone="event"
                  titulo={encontro.title}
                  subtitulo={resumoDoEncontro(encontro.comecaEm, encontro.local)}
                  fim={
                    <span className="text-[13px] font-medium text-(--primary)">
                      {presenca?.minha === "going" ? "Confirmado" : "Vou"}
                    </span>
                  }
                  aria-pressed={presenca?.minha === "going"}
                  disabled={presenca === null || gravando}
                  onClick={() => void alternarPresenca(encontro.id)}
                />
                {erroPresenca ? (
                  <p role="alert" className="mt-2 text-sm text-(--destructive)">
                    Não foi possível {presenca === null ? "carregar" : "gravar"} sua presença.{" "}
                    {presenca === null ? (
                      <button
                        type="button"
                        className="font-medium underline"
                        onClick={() => setTentativaPresenca((valor) => valor + 1)}
                      >
                        Tentar de novo
                      </button>
                    ) : (
                      "Tente de novo."
                    )}
                  </p>
                ) : null}
              </Secao>
            )}

            {grupos.length === 0 && encontro === null ? (
              <Secao titulo={`Em ${cidade}`}>
                <div className="grid gap-2">
                  <LinhaDeLista
                    icone="group"
                    titulo="Grupos da cidade"
                    subtitulo="Converse com quem tem a mesma rotina."
                    onClick={() => void navegacao.irPara("comunidade")}
                  />
                  <LinhaDeLista
                    icone="event"
                    titulo="Encontros"
                    subtitulo="Veja a agenda da cidade."
                    onClick={() => void navegacao.irPara("agenda")}
                  />
                </div>
              </Secao>
            ) : null}
          </aside>
        </div>
      )}
    </section>
  )
}
