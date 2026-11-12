"use client"

import { useLocation } from "@tanstack/react-router"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
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
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { lerRecentes } from "@/src/busca/recentes"
import { termoDaUrl } from "@/src/busca/termo-url"
import { useCasca } from "@/src/contexto/casca"
import { EXPLORAR, negocioDoGrupo, rotuloDaCategoria } from "@/src/inicio/categorias"

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
 * cai aqui como `/app/busca?q=<termo>`, e aí a tela já nasce consultando o
 * termo — no primeiro render, sem passar pelo estado vazio. A URL é só a porta
 * de entrada; a partir dela quem escreve é a pessoa, e a digitação vence o `q`
 * de origem (o endereço não é reescrito enquanto ela digita). Que o campo não
 * seja limpo ao sair da tela é decisão do produto, não desta rota.
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
  const [recentes, setRecentes] = useState<readonly string[]>([])
  const { consulta, definirConsulta: setConsulta } = casca

  // O termo do link (LAN-TROCA) já vale como consulta no primeiro desenho: a
  // semente é lida do endereço na montagem, então o primeiro pedido é o da
  // busca, sem passar pelo Início. O campo da casca recebe o mesmo termo num
  // efeito de layout, antes de a tela aparecer — nada é escrito durante o render.
  // Chegar por um link com termo válido manda no campo; depois disso, quem
  // escreve é a pessoa.
  const busca = useLocation({ select: (l) => l.search as Record<string, unknown> })
  const termoDoEndereco = termoDaUrl(busca)
  const [semente, setSemente] = useState<string | null>(() => termoDoEndereco || null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: a semente é aplicada uma vez
  useLayoutEffect(() => {
    if (semente === null) return
    if (semente !== consulta) setConsulta(semente)
    setSemente(null)
  }, [semente])

  // Depois da chegada, um endereço com outro termo válido (o Voltar para outra
  // busca) leva esse termo ao campo. Termo ausente ou que a busca não aceita não
  // mexe no que a pessoa digitou.
  const enderecoLido = useRef(false)
  // biome-ignore lint/correctness/useExhaustiveDependencies: responde só ao endereço
  useEffect(() => {
    if (!enderecoLido.current) {
      enderecoLido.current = true
      return
    }
    if (termoDoEndereco !== "" && termoDoEndereco !== consulta.trim()) {
      setConsulta(termoDoEndereco)
    }
  }, [termoDoEndereco])

  const termo = (semente ?? consulta).trim()
  const comTermo = termo.length >= 2

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

  // As recentes vêm do aparelho e só existem depois de uma busca de verdade:
  // sem registro, a seção não aparece (nada de "recente" inventada).
  useEffect(() => {
    if (!comTermo) setRecentes(lerRecentes())
  }, [comTermo])

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
  const perguntasDaCidade = explorar?.perguntas ?? []
  const gruposDaCidade = explorar?.grupos ?? []
  const bairrosDaCidade = [
    ...new Set(
      anunciosDaCidade.flatMap((anuncio) => (anuncio.bairro === null ? [] : [anuncio.bairro])),
    ),
  ].slice(0, 6)
  const cidadeSemConteudo =
    !comTermo &&
    categoriaAtiva === null &&
    explorar !== null &&
    negociosDaCidade.length === 0 &&
    anunciosDaCidade.length === 0 &&
    perguntasDaCidade.length === 0 &&
    gruposDaCidade.length === 0
  const resumoDaCidade = [
    negociosDaCidade.length === 0
      ? null
      : `${negociosDaCidade.length} ${negociosDaCidade.length === 1 ? "negócio" : "negócios"}`,
    anunciosDaCidade.length === 0
      ? null
      : `${anunciosDaCidade.length} ${anunciosDaCidade.length === 1 ? "anúncio" : "anúncios"}`,
    perguntasDaCidade.length === 0
      ? null
      : `${perguntasDaCidade.length} ${perguntasDaCidade.length === 1 ? "indicação" : "indicações"}`,
    gruposDaCidade.length === 0
      ? null
      : `${gruposDaCidade.length} ${gruposDaCidade.length === 1 ? "grupo" : "grupos"}`,
  ]
    .filter((parte): parte is string => parte !== null)
    .join(" · ")

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
        cidadeSemConteudo ? (
          <Secao titulo={`${cidade} está começando`} className="mt-4">
            <EstadoVazio
              titulo="Nada publicado por aqui ainda"
              texto="A busca mostra o que a cidade publicar. Você pode abrir o caminho: peça uma indicação ou anuncie algo."
              icone="public"
            >
              <div className="flex flex-wrap justify-center gap-2">
                <Botao tom="tonal" icone="add" onClick={() => void navegacao.abrir("menu-criar")}>
                  Publicar na cidade
                </Botao>
                <Botao
                  tom="contornado"
                  icone="volunteer_activism"
                  onClick={() => void navegacao.irPara("comunidade")}
                >
                  Ver a comunidade
                </Botao>
              </div>
            </EstadoVazio>
          </Secao>
        ) : (
          <>
            <div data-busca="primeira-entrada" className="mt-3 grid gap-1">
              <h2 className="text-lg font-semibold">O que você precisa em {cidade}?</h2>
              <p className="text-sm text-(--on-surface-variant)">
                Digite acima para procurar serviços, oportunidades e respostas — ou comece por um
                dos caminhos abaixo.
              </p>
            </div>

            {recentes.length === 0 ? null : (
              <Secao titulo="Buscas recentes">
                <div className="grid gap-1">
                  {recentes.map((recente) => (
                    <LinhaDeLista
                      key={recente}
                      icone="history"
                      titulo={recente}
                      onClick={() => setConsulta(recente)}
                    />
                  ))}
                </div>
              </Secao>
            )}

            <Secao titulo={`Explorar em ${cidade}`}>
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

            <Secao titulo={`O que existe em ${cidade}`}>
              <p data-busca="resumo-da-cidade" className="text-sm text-(--on-surface-variant)">
                {resumoDaCidade}
              </p>
              {bairrosDaCidade.length === 0 ? null : (
                <p className="text-sm text-(--on-surface-variant)">
                  {`Com anúncios em ${bairrosDaCidade.join(", ")}.`}
                </p>
              )}
            </Secao>

            <Secao titulo="Crie o que falta">
              <p className="text-sm text-(--on-surface-variant)">
                Não encontrou? Peça uma indicação, anuncie um desapego ou divulgue seu negócio.
              </p>
              <div>
                <Botao tom="tonal" icone="add" onClick={() => void navegacao.abrir("menu-criar")}>
                  Abrir o Criar
                </Botao>
              </div>
            </Secao>
          </>
        )
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
