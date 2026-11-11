"use client"

import { useLocation, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeFoto, CartaoDeNegocio } from "@/components/bivaque/cartao-de-anuncio"
import { ChipsDeFiltro, type ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { Icone } from "@/components/bivaque/icone"
import { LinhaDePergunta } from "@/components/bivaque/linha-de-pergunta"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import {
  type AnuncioDoInicio,
  type BuscaDaCidade,
  buscarNaCidade,
  type InicioDaCidade,
  lerInicio,
} from "@/lib/dados/inicio"
import { TOPICOS_DAS_PERGUNTAS } from "@/lib/dados/perguntas"
import { iconeDeDado } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco, useRotaAtual } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { termoDaUrl, termosParaUrl, trazOutroTermo } from "@/src/busca/termo-url"
import { useCasca } from "@/src/contexto/casca"
import { EXPLORAR, negocioDoGrupo, rotuloDaCategoria } from "@/src/inicio/categorias"
import { mesclarNaUrl } from "@/src/navegacao/quadro"

/**
 * A busca, com o conteúdo real da cidade da sessão (LAN-F02). O desenho é o da
 * onda 2 (protótipo: features/search/views.js): campo, chips de escopo,
 * contagem, resultados por tipo com teto no "Tudo" e "Ver todos", grade
 * "Explorar" e sugestões quando não há termo, vazio honesto e erro com tentar
 * de novo. Ficam para o refino: sinônimos, trecho da resposta que bateu,
 * palavras que completam o texto e buscas recentes.
 *
 * Sem termo, a grade "Explorar" lê o Início da cidade; com termo (2+ letras),
 * os resultados vêm da rota de busca. Foto de anúncio e de negócio ainda não
 * existe no banco, então o cartão usa a capa com ícone.
 *
 * O termo também chega pelo endereço (LAN-TROCA): `/explorar/busca?q=<termo>`
 * cai aqui como `/app/busca?q=<termo>`, e aí o campo já nasce preenchido —
 * no primeiro render, sem passar pelo estado vazio. A URL é só a porta de
 * entrada; a partir dela quem escreve é a pessoa, e a digitação vence o `q` de
 * origem. Que o campo não seja limpo ao sair da tela é decisão do produto, não
 * desta rota.
 */

const FILTROS: readonly ItemDeFiltro[] = [
  { id: "all", rotulo: "Tudo" },
  { id: "anuncios", rotulo: "Anúncios" },
  { id: "negocios", rotulo: "Negócios" },
  { id: "perguntas", rotulo: "Indicações" },
  { id: "grupos", rotulo: "Grupos" },
  { id: "guia", rotulo: "Guia" },
]

/** O tópico filtra as perguntas da busca (ADR-20261107 item 5); lista fechada. */
const TOPICOS: readonly ItemDeFiltro[] = [
  { id: "todos", rotulo: "Todos os tópicos" },
  ...TOPICOS_DAS_PERGUNTAS,
]

const SUGESTOES = ["escola", "berço", "mudança", "mecânico"] as const
const TAMANHO_DA_LISTA = 20

type Achados = Pick<BuscaDaCidade, "anuncios" | "negocios" | "perguntas" | "grupos" | "guia">

const SEM_ACHADOS: Achados = { anuncios: [], negocios: [], perguntas: [], grupos: [], guia: [] }

/** Contagem que não afirma mais do que a página lida mostra. */
function contagem(quantidade: number, truncada: boolean): string {
  return truncada ? `${quantidade}+` : String(quantidade)
}

function precoDe(anuncio: AnuncioDoInicio): number | null {
  return anuncio.precoCentavos === null ? null : anuncio.precoCentavos / 100
}

export function Busca() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<BuscaDaCidade | null>(null)
  const [explorar, setExplorar] = useState<InicioDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [escopo, setEscopo] = useState("all")
  const [topico, setTopico] = useState("todos")
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null)
  const { consulta, definirConsulta: setConsulta } = casca
  const termo = consulta.trim()
  const comTermo = termo.length >= 2

  // O termo do link entra no campo antes do primeiro desenho: assim a tela já
  // abre pedindo os resultados, em vez de mostrar o estado vazio e só depois
  // trocar pelo da consulta. `semeado` guarda o valor devolvido — a URL é só a
  // porta de entrada, e nada além dele é reaplicado ao campo.
  const busca = useLocation({ select: (l) => l.search as Record<string, unknown> })
  const navegar = useNavigate()
  const rota = useRotaAtual()
  const semeado = useRef<string | null>(null)
  if (semeado.current === null) {
    const doLink = termoDaUrl(busca)
    if (doLink !== "") {
      semeado.current = doLink
      if (doLink !== consulta) setConsulta(doLink)
    }
  }

  // Enquanto o campo mostra o que o link trouxe, o endereço acompanha o termo de
  // verdade: recarregar e o Voltar abrem a mesma consulta. A grafia antiga
  // (`search`) sai do endereço. Depois que a pessoa digita, o endereço não é
  // mais reescrito — a partir daí quem manda é o campo.
  const consultaDoLink = semeado.current
  const trazendo = consultaDoLink !== null
  const termoDoEndereco = trazendo ? consultaDoLink : termo
  const enderecoEmDia = termoDaUrl(busca) === termoDoEndereco
  // biome-ignore lint/correctness/useExhaustiveDependencies: só a troca de termo reescreve o endereço
  useEffect(() => {
    if (!trazendo || enderecoEmDia) return
    void navegar({
      to: rota.caminho,
      search: (atual: Record<string, unknown>) =>
        mesclarNaUrl(atual, termosParaUrl(termoDoEndereco)),
      replace: true,
      resetScroll: false,
    })
  }, [enderecoEmDia, termoDoEndereco, trazendo, rota.caminho])

  // Trocar de rota encerra a porta de entrada: o campo volta a ser só do app.
  // biome-ignore lint/correctness/useExhaustiveDependencies: segue a rota, não o termo
  useEffect(() => {
    semeado.current = null
  }, [rota.nome])

  // O endereço ganha outro termo que o campo não tem (o Voltar para a outra
  // entrada, ou o `q` apagado à mão): o campo é do app e não fica preso ao
  // endereço antigo.
  // biome-ignore lint/correctness/useExhaustiveDependencies: responde ao endereço
  useEffect(() => {
    if (semeado.current !== null) semeado.current = null
    if (trazOutroTermo(busca, consulta)) setConsulta("")
  }, [busca])

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada solicita nova leitura
  useEffect(() => {
    const controle = new AbortController()
    setErro(false)
    const falhou = () => {
      if (!controle.signal.aborted) setErro(true)
    }
    if (comTermo) {
      setDados(null)
      void buscarNaCidade(termo, {
        signal: controle.signal,
        topico: topico === "todos" ? undefined : topico,
      })
        .then((valor) => {
          if (!controle.signal.aborted) setDados(valor)
        })
        .catch(falhou)
    } else {
      setExplorar(null)
      void lerInicio({ signal: controle.signal })
        .then((valor) => {
          if (!controle.signal.aborted) setExplorar(valor)
        })
        .catch(falhou)
    }
    return () => controle.abort()
  }, [termo, comTermo, rodada, topico])

  // Uma consulta digitada tem precedência sobre a categoria tocada na grade.
  useEffect(() => {
    if (termo !== "") setCategoriaAtiva(null)
  }, [termo])

  const cidade = (comTermo ? dados?.cidade : explorar?.cidade) ?? casca.cidade
  const explorando = !comTermo && categoriaAtiva === null
  const carregando = comTermo ? dados === null : explorar === null
  const achados: Achados = comTermo
    ? (dados ?? SEM_ACHADOS)
    : {
        ...SEM_ACHADOS,
        negocios: (explorar?.negocios ?? []).filter((negocio) =>
          negocioDoGrupo(categoriaAtiva, negocio.categoria),
        ),
      }

  const mostrando = (tipo: string): boolean => escopo === "all" || escopo === tipo
  const total =
    (mostrando("anuncios") ? achados.anuncios.length : 0) +
    (mostrando("negocios") ? achados.negocios.length : 0) +
    (mostrando("perguntas") ? achados.perguntas.length : 0) +
    (mostrando("grupos") ? achados.grupos.length : 0) +
    (mostrando("guia") ? achados.guia.length : 0)
  const teto = escopo === "all" ? 4 : Number.POSITIVE_INFINITY
  const negociosDaCidade = explorar?.negocios ?? []
  const anunciosDaCidade = explorar?.anuncios ?? []
  const anunciosTruncados = explorar !== null && explorar.proximo !== null

  return (
    <section data-tela="busca" className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <CabecaDePagina
        titulo={`Buscar em ${cidade}`}
        subtitulo="Encontre oportunidades, negócios e respostas da comunidade."
      />

      <ChipsDeFiltro
        itens={FILTROS}
        valor={escopo}
        aoEscolher={(id) => {
          setEscopo(id)
          // O tópico só alcança as perguntas: fora dos escopos delas, volta a "todos".
          if (id !== "perguntas" && id !== "all") setTopico("todos")
        }}
        rotulo="Filtrar por tipo"
        className="mt-1"
      />

      {comTermo && (escopo === "perguntas" || escopo === "all") ? (
        <div data-topicos="filtro-busca">
          <ChipsDeFiltro
            itens={TOPICOS}
            valor={topico}
            aoEscolher={setTopico}
            rotulo="Filtrar perguntas por tópico"
          />
        </div>
      ) : null}

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={4} />
      ) : explorando ? (
        <>
          <Secao titulo={`Explorar em ${cidade}`} className="mt-4">
            <div data-explorar="categorias" className="grid grid-cols-2 gap-2">
              {EXPLORAR.filter((item) =>
                negociosDaCidade.some((negocio) => negocioDoGrupo(item.id, negocio.categoria)),
              )
                .slice(0, 6)
                .map((item) => {
                  const quantidade = negociosDaCidade.filter((negocio) =>
                    negocioDoGrupo(item.id, negocio.categoria),
                  ).length
                  return (
                    <button
                      key={item.id}
                      type="button"
                      data-explorar-categoria={item.id}
                      onClick={() => {
                        setCategoriaAtiva(item.id)
                        setEscopo("negocios")
                      }}
                      className="bv-press flex min-h-20 items-center gap-2 rounded-xl bg-(--surface-lowest) px-3 text-left ring-1 ring-(--outline-variant) hover:bg-(--muted)"
                    >
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--secondary-container)">
                        <Icone nome={iconeDeDado(item.icone)} className="size-6" />
                      </span>
                      <span className="grid min-w-0 gap-0.5">
                        <b className="text-[13px] leading-4">{item.rotulo}</b>
                        <small className="text-xs text-(--on-surface-variant)">
                          {contagem(quantidade, negociosDaCidade.length >= TAMANHO_DA_LISTA)}{" "}
                          {quantidade === 1 ? "negócio" : "negócios"}
                        </small>
                      </span>
                    </button>
                  )
                })}
              {[
                {
                  id: "imoveis",
                  rotulo: "Imóveis",
                  icone: "apartment",
                  quantidade: anunciosDaCidade.filter((a) => a.tipo === "property").length,
                },
                {
                  id: "desapegos",
                  rotulo: "Desapegos",
                  icone: "sell",
                  quantidade: anunciosDaCidade.filter((a) => a.tipo !== "property").length,
                },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-explorar-categoria={item.id}
                  onClick={() => void navegacao.irPara(item.id)}
                  className="bv-press flex min-h-20 items-center gap-2 rounded-xl bg-(--surface-lowest) px-3 text-left ring-1 ring-(--outline-variant) hover:bg-(--muted)"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-(--secondary-container)">
                    <Icone nome={iconeDeDado(item.icone)} className="size-6" />
                  </span>
                  <span className="grid min-w-0 gap-0.5">
                    <b className="text-[13px] leading-4">{item.rotulo}</b>
                    <small className="text-xs text-(--on-surface-variant)">
                      {contagem(item.quantidade, anunciosTruncados)} disponíveis
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </Secao>
          <Secao titulo="Sugestões" className="mt-4">
            <div className="grid gap-1">
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
        </>
      ) : total === 0 ? (
        <EstadoVazio
          titulo={`Nada sobre “${termo}”`}
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
            {total === 1 ? `${total} resultado` : `${total} resultados`} em {cidade}
          </p>

          {mostrando("anuncios") && achados.anuncios.length > 0 ? (
            <Secao
              titulo="Anúncios"
              acoes={
                escopo === "all" ? (
                  <BotaoVerTodos
                    quando={achados.anuncios.length > 4}
                    rotulo={`Ver todos os ${achados.anuncios.length} anúncios`}
                    aoAcionar={() => setEscopo("anuncios")}
                  />
                ) : undefined
              }
            >
              <Grade formato="cartoes">
                {achados.anuncios.slice(0, teto).map((anuncio) => (
                  <CartaoDeFoto
                    key={anuncio.id}
                    anuncio={{
                      id: anuncio.id,
                      titulo: anuncio.title,
                      preco: precoDe(anuncio),
                      icone: anuncio.tipo === "property" ? "apartment" : "sell",
                      meta: anuncio.bairro ?? cidade,
                    }}
                    aoAbrir={() =>
                      void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })
                    }
                  />
                ))}
              </Grade>
            </Secao>
          ) : null}

          {mostrando("negocios") && achados.negocios.length > 0 ? (
            <Secao
              titulo="Negócios"
              acoes={
                escopo === "all" ? (
                  <BotaoVerTodos
                    quando={achados.negocios.length > 4}
                    rotulo={`Ver todos os ${achados.negocios.length} negócios`}
                    aoAcionar={() => setEscopo("negocios")}
                  />
                ) : undefined
              }
            >
              <Grade formato="cartoes">
                {achados.negocios.slice(0, teto).map((negocio) => (
                  <CartaoDeNegocio
                    key={negocio.id}
                    negocio={{
                      id: negocio.id,
                      nome: negocio.nome,
                      categoria: rotuloDaCategoria(negocio.categoria),
                      cidade,
                    }}
                    aoAbrir={() =>
                      void navegacao.irPara("negocio", { parametros: { id: negocio.id } })
                    }
                  />
                ))}
              </Grade>
            </Secao>
          ) : null}

          {mostrando("perguntas") && achados.perguntas.length > 0 ? (
            <Secao titulo="Indicações e respostas">
              <div className="grid gap-2">
                {achados.perguntas.slice(0, escopo === "all" ? 5 : teto).map((pergunta) => (
                  <LinhaDePergunta
                    key={pergunta.id}
                    pergunta={{
                      id: pergunta.id,
                      pergunta: pergunta.title,
                      autor: "Alguém da cidade",
                      tópico: pergunta.grupo ?? "",
                      cidade,
                      respostas: pergunta.respostas,
                      resolvida: pergunta.resolvida,
                    }}
                    onClick={() =>
                      void navegacao.irPara("pergunta", { parametros: { id: pergunta.id } })
                    }
                  />
                ))}
              </div>
            </Secao>
          ) : null}

          {mostrando("grupos") && achados.grupos.length > 0 ? (
            <Secao titulo="Grupos">
              <div className="grid gap-2">
                {achados.grupos.slice(0, escopo === "all" ? 5 : teto).map((grupo) => (
                  <LinhaDeLista
                    key={grupo.id}
                    icone="group"
                    titulo={grupo.nome}
                    subtitulo={`${grupo.membros} ${grupo.membros === 1 ? "membro" : "membros"}`}
                    onClick={() => void navegacao.irPara("grupo", { parametros: { id: grupo.id } })}
                  />
                ))}
              </div>
            </Secao>
          ) : null}

          {mostrando("guia") && achados.guia.length > 0 ? (
            <Secao titulo="Guia">
              <div className="grid gap-2">
                {achados.guia.slice(0, escopo === "all" ? 5 : teto).map((entrada) => (
                  <LinhaDeLista
                    key={entrada.id}
                    icone="map"
                    titulo={entrada.title}
                    subtitulo={entrada.detalhe ?? ""}
                    onClick={() =>
                      void navegacao.irPara("guia", { parametros: { id: entrada.id } })
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
