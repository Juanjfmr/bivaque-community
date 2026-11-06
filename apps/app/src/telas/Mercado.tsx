"use client"

import { useLocation, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Selecao } from "@/components/bivaque/campos"
import { CartaoDeFoto } from "@/components/bivaque/cartao-de-anuncio"
import { ChipsDeFiltro, type ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { FormularioImovel } from "@/components/bivaque/formulario-imovel"
import { Grade } from "@/components/bivaque/grade"
import { Icone } from "@/components/bivaque/icone"
import { type ListaDoMercado, lerMercado } from "@/lib/dados/mercado"
import { moeda } from "@/lib/formato"
import { iconeDeDado } from "@/lib/icones"
import {
  useNavegacao,
  useRolagemEFoco,
  useRotaAtual,
  useSobreposicaoDaEntrada,
} from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import {
  excluirRascunhoImovel,
  lerRascunhosImoveis,
  type RascunhoImovel,
} from "@/lib/rascunhos-imoveis"
import { useCasca } from "@/src/contexto/casca"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, sessaoVencida } from "@/src/eventos/formulario"
import {
  atributosDoImovel,
  complementoDoImovel,
  doTipo,
  eAluguel,
  ehImovel,
  precoEmReais,
  rotuloDaCapa,
  totalMensal,
} from "@/src/mercado/cartao"
import {
  type FiltrosDaUrl,
  lerFiltrosDaUrl,
  mudarFiltroNaUrl,
  semAcento,
} from "@/src/mercado/filtros-url"

/**
 * O Mercado do app, do banco (LAN-F06, no molde do F05).
 *
 * O desenho é o mesmo de sempre: uma lista por aba (Desapegos, Imóveis,
 * Negócios), sub-abas navegando de verdade, contagem, salvar local, filtros no
 * cliente e rascunhos. Mudou de onde vem o dado — `lib/dados/mercado`, que fala
 * com `/api/app/mercado` — e por isso a tela distingue carregando, vazio de
 * verdade, falha recuperável, sessão vencida e acesso negado. Banco fora não
 * vira "nada anunciado".
 */

export type AbaDoMercado = "desapegos" | "imoveis" | "negocios"

const SUBABAS: readonly ItemDeFiltro[] = [
  { id: "desapegos", rotulo: "Desapegos" },
  { id: "imoveis", rotulo: "Imóveis" },
  { id: "negocios", rotulo: "Negócios" },
]

export function ListaDeMercado({
  inicial,
  comAbas = true,
}: {
  inicial: AbaDoMercado
  comAbas?: boolean
}) {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<ListaDoMercado | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [salvos, setSalvos] = useState<ReadonlySet<string>>(() => new Set())
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  // Os filtros vêm e vão pela URL (LAN-F06): link antigo com filtro abre
  // filtrado, recarregar mantém a seleção, e o Voltar do roteador a devolve.
  const busca = useLocation({ select: (l) => l.search as Record<string, unknown> })
  const filtros = useMemo(() => lerFiltrosDaUrl(busca), [busca])
  const navegar = useNavigate()
  const rota = useRotaAtual()
  const gravarFiltros = (novos: Partial<FiltrosDaUrl>) => {
    void navegar({
      to: rota.caminho,
      search: (atual: Record<string, unknown>) => mudarFiltroNaUrl(atual, novos),
      replace: true,
      state: true,
      resetScroll: false,
    })
  }
  const tipo = filtros.tipoImovel
  // A select mostra as opções da tela; um valor de link antigo fora delas ainda
  // filtra (o filtro numérico usa `filtros`, não o rótulo exibido).
  const minimoQuartos = String(filtros.quartos)
  const maximoMensal = filtros.valorMaxReais === null ? "todos" : String(filtros.valorMaxReais)
  const [ordenacao, setOrdenacao] = useState("relevancia")
  const [modoLista, setModoLista] = useState(false)
  const { aberto: criandoImovel, aoMudarAberto: setCriandoImovel } =
    useSobreposicaoDaEntrada("rascunho-imovel")
  const [rascunhos, setRascunhos] = useState<RascunhoImovel[]>([])
  const [erroRascunho, setErroRascunho] = useState("")

  useRolagemEFoco(CARGA_CONCLUIDA)

  // A cidade é a da sessão, devolvida pela rota; `casca.cidade` segue no cabeçalho
  // enquanto a rota não traz nome (vazio honesto, nunca cidade inventada).
  // A `pagina` da URL persegue o cursor do servidor até a página pedida.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    // shortcut: negócios sem rota nesta rodada; quando houver /api/app/negocios, ligar aqui
    if (inicial === "negocios") return
    const controle = new AbortController()
    setDados(null)
    setErro(null)
    void lerMercado(
      { tipo: inicial === "imoveis" ? "property" : "item", pagina: filtros.pagina },
      { signal: controle.signal },
    )
      .then((lidos) => {
        if (!controle.signal.aborted) setDados(lidos)
      })
      .catch((falha: unknown) => {
        if (controle.signal.aborted) return
        setErro(sessaoVencida(falha) ? "sessao" : acessoNegado(falha) ? "negado" : "falhou")
      })
    return () => controle.abort()
  }, [inicial, rodada, filtros.pagina])

  useEffect(() => {
    if (inicial !== "imoveis") return
    setRascunhos(lerRascunhosImoveis(casca.cidade))
  }, [inicial, casca.cidade])

  const removerRascunho = (id: string) => {
    if (!excluirRascunhoImovel(casca.cidade, id)) {
      setErroRascunho("Não foi possível excluir o rascunho nesta sessão.")
      return
    }
    setErroRascunho("")
    setRascunhos(lerRascunhosImoveis(casca.cidade))
  }

  const itens = useMemo(() => {
    if (dados === null) return []
    const q = semAcento(filtros.q)
    return dados.anuncios.filter((anuncio) => {
      if (inicial === "imoveis" ? !ehImovel(anuncio) : ehImovel(anuncio)) return false
      if (q !== "" && !semAcento(`${anuncio.titulo} ${anuncio.descricao ?? ""}`).includes(q))
        return false
      if (inicial !== "imoveis") {
        if (
          filtros.precoMinCents !== null &&
          (anuncio.precoCents === null || anuncio.precoCents < filtros.precoMinCents)
        )
          return false
        if (
          filtros.precoMaxCents !== null &&
          (anuncio.precoCents === null || anuncio.precoCents > filtros.precoMaxCents)
        )
          return false
      }
      return true
    })
  }, [dados, inicial, filtros])

  const imoveisFiltrados = useMemo(() => {
    if (inicial !== "imoveis") return itens
    const filtrados = itens.filter((anuncio) => {
      if (tipo !== "todos" && !doTipo(anuncio, tipo)) return false
      if (filtros.quartos > 0 && (anuncio.quartos === null || anuncio.quartos < filtros.quartos))
        return false
      if (filtros.valorMaxReais !== null) {
        const mensal = totalMensal(anuncio)
        if (mensal === null || mensal > filtros.valorMaxReais) return false
      }
      return true
    })
    return filtrados.sort((a, b) => {
      if (ordenacao === "relevancia") return 0
      const precoA = totalMensal(a)
      const precoB = totalMensal(b)
      if (precoA === null && precoB === null) return 0
      if (precoA === null) return 1
      if (precoB === null) return -1
      return ordenacao === "menor" ? precoA - precoB : precoB - precoA
    })
  }, [inicial, itens, tipo, filtros, ordenacao])

  const limparFiltros = () => {
    gravarFiltros({ q: "", tipoImovel: "todos", quartos: 0, valorMaxReais: null })
    setOrdenacao("relevancia")
  }

  const alternarSalvo = (id: string) => {
    setSalvos((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  const carregando = inicial !== "negocios" && dados === null && erro === null
  const cidade = dados?.cidade ?? casca.cidade
  const titulo =
    inicial === "desapegos" ? "Desapegos" : inicial === "imoveis" ? "Imóveis" : "Negócios locais"

  return (
    <section data-tela={inicial} className="grid gap-2">
      <CabecaDePagina
        titulo={titulo}
        subtitulo={
          inicial === "imoveis"
            ? "Aluguel e venda"
            : `O que a comunidade de ${cidade} está anunciando.`
        }
        acao={
          inicial === "imoveis" ? (
            <Botao
              data-acao="anunciar-imovel"
              icone="add"
              tom="tonal"
              onClick={() => setCriandoImovel(true)}
            >
              Anunciar imóvel
            </Botao>
          ) : undefined
        }
      />

      {inicial === "imoveis" ? (
        <FormularioImovel
          aberto={criandoImovel}
          cidade={casca.cidade}
          aoFechar={() => setCriandoImovel(false)}
          aoSalvar={() => {
            setCriandoImovel(false)
            setRascunhos(lerRascunhosImoveis(casca.cidade))
            setErroRascunho("")
          }}
        />
      ) : null}

      {inicial === "imoveis" && rascunhos.length > 0 ? (
        <section
          data-rascunhos-imoveis="sim"
          aria-label="Rascunhos de imóveis"
          className="grid gap-2 rounded-2xl bg-(--surface-container) p-3"
        >
          <b className="text-sm">Seus rascunhos ({rascunhos.length}) — não publicados</b>
          {rascunhos.map((rascunho) => (
            <article
              key={rascunho.id}
              data-rascunho-imovel={rascunho.id}
              className="flex min-w-0 items-center gap-2 rounded-xl bg-(--surface-lowest) px-3 py-2"
            >
              <span className="grid min-w-0 grow gap-0.5">
                <b className="truncate text-sm">{rascunho.titulo}</b>
                <small className="text-xs text-(--on-surface-variant)">
                  {rascunho.bairro} · {rascunho.finalidade === "aluguel" ? "Aluguel" : "Venda"} ·{" "}
                  {moeda(rascunho.preco)}
                </small>
              </span>
              <Botao
                tom="texto"
                data-acao="excluir-rascunho"
                onClick={() => removerRascunho(rascunho.id)}
              >
                Excluir
              </Botao>
            </article>
          ))}
          {erroRascunho === "" ? null : (
            <p role="alert" className="text-xs text-(--destructive)">
              {erroRascunho}
            </p>
          )}
        </section>
      ) : null}

      {comAbas ? (
        <ChipsDeFiltro
          itens={SUBABAS}
          valor={inicial}
          aoEscolher={(aba) => void navegacao.irPara(aba)}
          rotulo="Seções do Mercado"
        />
      ) : null}

      {filtros.q === "" ? null : (
        <Botao
          tom="texto"
          icone="close"
          data-acao="limpar-busca"
          className="justify-self-start"
          onClick={() => gravarFiltros({ q: "" })}
        >
          Limpar busca: {filtros.q}
        </Botao>
      )}

      {inicial === "imoveis" && !carregando && erro === null ? (
        <div data-filtros-imoveis="sim" className="mt-2 grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Botao
              tom="contornado"
              icone="tune"
              aria-expanded={filtrosAbertos}
              aria-controls="painel-filtros-imoveis"
              data-acao="filtros-imoveis"
              onClick={() => setFiltrosAbertos((aberto) => !aberto)}
            >
              Filtros
            </Botao>
            <span className="text-xs text-(--on-surface-variant)">
              {imoveisFiltrados.length} {imoveisFiltrados.length === 1 ? "imóvel" : "imóveis"}
            </span>
          </div>
          {filtrosAbertos ? (
            <div
              id="painel-filtros-imoveis"
              className="grid grid-cols-2 gap-3 rounded-xl border border-(--outline-variant) bg-(--surface-lowest) p-3"
            >
              <Selecao
                id="tipo-imovel"
                rotulo="Tipo"
                valor={tipo}
                aoMudar={(v) => gravarFiltros({ tipoImovel: v })}
                opcoes={[
                  { valor: "todos", titulo: "Todos" },
                  { valor: "apartamento", titulo: "Apartamento" },
                  { valor: "casa", titulo: "Casa" },
                ]}
              />
              <Selecao
                id="quartos-imovel"
                rotulo="Quartos"
                valor={minimoQuartos}
                aoMudar={(v) => gravarFiltros({ quartos: Number(v) || 0 })}
                opcoes={[
                  { valor: "0", titulo: "Qualquer" },
                  { valor: "2", titulo: "2 ou mais" },
                  { valor: "3", titulo: "3 ou mais" },
                ]}
              />
              <div className="col-span-2">
                <Selecao
                  id="total-mensal-imovel"
                  rotulo="Total por mês até (aluguel + condomínio informado)"
                  valor={maximoMensal}
                  aoMudar={(v) =>
                    gravarFiltros({ valorMaxReais: v === "todos" ? null : Number(v) })
                  }
                  opcoes={[
                    { valor: "todos", titulo: "Qualquer valor" },
                    { valor: "3000", titulo: "R$ 3.000" },
                    { valor: "4000", titulo: "R$ 4.000" },
                    { valor: "5000", titulo: "R$ 5.000" },
                  ]}
                />
              </div>
              <Botao
                tom="texto"
                data-acao="limpar-filtros"
                className="col-span-2 justify-self-start"
                onClick={limparFiltros}
              >
                Limpar filtros
              </Botao>
            </div>
          ) : null}
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-43 flex-1 max-w-xs">
              <Selecao
                id="ordenar-imoveis"
                className="bv-ordenar-imoveis"
                rotulo="Ordenar por"
                valor={ordenacao}
                aoMudar={setOrdenacao}
                opcoes={[
                  { valor: "relevancia", titulo: "Mais relevantes" },
                  { valor: "menor", titulo: "Menor total mensal" },
                  { valor: "maior", titulo: "Maior total mensal" },
                ]}
              />
            </div>
            <fieldset aria-label="Modo de visualização" className="flex gap-1">
              <button
                type="button"
                data-acao="modo-grade"
                aria-label="Ver em grade"
                aria-pressed={!modoLista}
                onClick={() => setModoLista(false)}
                className="grid size-11 place-items-center rounded-xl bg-(--surface-lowest) ring-1 ring-(--outline-variant) aria-pressed:bg-(--secondary-container)"
              >
                <Icone nome="ballot" className="size-5" />
              </button>
              <button
                type="button"
                data-acao="modo-lista"
                aria-label="Ver em lista"
                aria-pressed={modoLista}
                onClick={() => setModoLista(true)}
                className="grid size-11 place-items-center rounded-xl bg-(--surface-lowest) ring-1 ring-(--outline-variant) aria-pressed:bg-(--secondary-container)"
              >
                <Icone nome="list" className="size-5" />
              </button>
            </fieldset>
          </div>
        </div>
      ) : null}

      {erro === "sessao" ? (
        <EstadoDeSessaoVencida />
      ) : erro === "negado" ? (
        <EstadoNegado texto="Sua conta não tem acesso ao Mercado desta cidade." />
      ) : erro === "falhou" ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={4} />
      ) : inicial === "negocios" ? (
        // shortcut: negócios sem rota nesta rodada; quando houver /api/app/negocios, ligar aqui
        <EstadoVazio
          titulo="Ainda sem negócios cadastrados"
          texto="As indicações da comunidade ajudarão a formar o guia de serviços."
          icone="storefront"
        />
      ) : (inicial === "imoveis" ? imoveisFiltrados.length === 0 : itens.length === 0) ? (
        <EstadoVazio
          titulo={
            inicial === "imoveis" && itens.length > 0
              ? "Nenhum imóvel corresponde aos filtros"
              : "Nada anunciado nesta seção"
          }
          texto={
            inicial === "imoveis" && itens.length > 0
              ? "Amplie os critérios para ver outros imóveis desta cidade."
              : "Quando alguém publicar, o anúncio aparece aqui para toda a cidade."
          }
          icone="sell"
          {...(inicial === "imoveis" && itens.length > 0
            ? { acao: { rotulo: "Limpar filtros", aoAcionar: limparFiltros } }
            : {})}
        />
      ) : (
        <>
          {inicial === "imoveis" ? null : (
            <p className="text-sm text-(--on-surface-variant)">
              {itens.length} anúncios em {cidade}
            </p>
          )}
          <Grade
            formato="cartoes"
            className={inicial === "imoveis" && modoLista ? "bv-lista-imoveis" : ""}
          >
            {(inicial === "imoveis" ? imoveisFiltrados : itens).map((anuncio) => (
              <CartaoDeFoto
                key={anuncio.id}
                anuncio={{
                  id: anuncio.id,
                  // A capa já sabe ficar sem imagem quando a fonte é nula.
                  fonte: anuncio.foto ?? null,
                  rotulo: rotuloDaCapa(anuncio),
                  porMes: eAluguel(anuncio),
                  titulo: anuncio.titulo,
                  preco: precoEmReais(anuncio),
                  icone: ehImovel(anuncio) ? "apartment" : iconeDeDado(anuncio.categoria),
                  meta: anuncio.bairro ?? anuncio.cidade ?? cidade,
                  salvo: salvos.has(anuncio.id),
                  ...(inicial === "imoveis"
                    ? {
                        detalhes: atributosDoImovel(anuncio),
                        ...(complementoDoImovel(anuncio) === undefined
                          ? {}
                          : { informacaoExtra: complementoDoImovel(anuncio) }),
                      }
                    : {}),
                }}
                aoSalvar={() => alternarSalvo(anuncio.id)}
                aoAbrir={() => void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })}
              />
            ))}
          </Grade>
        </>
      )}
    </section>
  )
}

export function Mercado() {
  return <ListaDeMercado inicial="desapegos" />
}

export function Desapegos() {
  return <ListaDeMercado inicial="desapegos" />
}

export function Catalogo() {
  return <ListaDeMercado inicial="desapegos" />
}

export function Imoveis() {
  return <ListaDeMercado inicial="imoveis" comAbas={false} />
}

export function Negocios() {
  return <ListaDeMercado inicial="negocios" comAbas={false} />
}
