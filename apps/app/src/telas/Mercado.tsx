"use client"

import { useEffect, useMemo, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Selecao } from "@/components/bivaque/campos"
import { CartaoDeFoto, CartaoDeNegocio } from "@/components/bivaque/cartao-de-anuncio"
import { ChipsDeFiltro, type ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { FormularioImovel } from "@/components/bivaque/formulario-imovel"
import { Grade } from "@/components/bivaque/grade"
import { Icone } from "@/components/bivaque/icone"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { moeda } from "@/lib/formato"
import { iconeDeDado } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import {
  CHAVE_ABERTURA_IMOVEL,
  excluirRascunhoImovel,
  lerRascunhosImoveis,
  PEDIDO_CRIAR_IMOVEL,
  type RascunhoImovel,
} from "@/lib/rascunhos-imoveis"
import { useCasca } from "@/src/contexto/casca"
import { numero, registro, texto } from "@/src/telas/comum"

/**
 * O Mercado da onda 5 (protótipo: features/listings/catalog.js), com dados de
 * demonstração.
 *
 * V1: uma lista por aba (Desapegos, Imóveis, Negócios), com as sub-abas
 * navegando de verdade, contagem, salvar local e vazios. Ficam para o refino:
 * filtros de ordenação, faixa de preço, mapa, painel de bairro e paginação.
 */

export type AbaDoMercado = "desapegos" | "imoveis" | "negocios"

const SUBABAS: readonly ItemDeFiltro[] = [
  { id: "desapegos", rotulo: "Desapegos" },
  { id: "imoveis", rotulo: "Imóveis" },
  { id: "negocios", rotulo: "Negócios" },
]

function ehImovel(kind: unknown): boolean {
  return kind === "imovel" || kind === "property"
}

/** Não presumir condomínio zero quando o valor não consta do anúncio. */
function totalMensal(anuncio: DadosDaCidade["anuncios"][number]): number | null {
  if (typeof anuncio.price_cents !== "number") return null
  const aluguel = anuncio.price_cents / 100
  const descricao = anuncio.description ?? ""
  const valor = /condomínio\s+de\s+R\$\s*([\d.,]+)/i.exec(descricao)?.[1]
  if (!valor) return null
  const condominio = Number(valor.replaceAll(".", "").replace(",", "."))
  return Number.isFinite(condominio) ? aluguel + condominio : null
}

function quartos(anuncio: DadosDaCidade["anuncios"][number]): number | null {
  const nome = /\b(\d+)\s+quartos?\b/i.exec(anuncio.title)?.[1]
  return nome ? Number(nome) : null
}

/** Resumo apenas de atributos explicitamente informados pelo anunciante. */
function atributosDoImovel(anuncio: DadosDaCidade["anuncios"][number]): string[] {
  const descricao = anuncio.description ?? ""
  const itens: string[] = []
  const quantidadeDeQuartos = quartos(anuncio)
  if (quantidadeDeQuartos !== null) itens.push(`${quantidadeDeQuartos} quartos`)
  const area = /(\d+(?:[.,]\d+)?)\s*m²/i.exec(descricao)?.[1]
  if (area) itens.push(`${area} m²`)
  const vaga = /(\d+)\s+vagas?\b/i.exec(descricao)?.[1]
  if (vaga) itens.push(`${vaga} ${vaga === "1" ? "vaga" : "vagas"}`)
  else if (/\buma vaga\b/i.test(descricao)) itens.push("1 vaga")
  return itens
}

function complementoDoImovel(anuncio: DadosDaCidade["anuncios"][number]): string | undefined {
  const descricao = anuncio.description ?? ""
  const partes: string[] = []
  const condominio = /condomínio\s+de\s+R\$\s*([\d.,]+)/i.exec(descricao)?.[1]
  if (condominio) {
    const valor = Number(condominio.replaceAll(".", "").replace(",", "."))
    if (Number.isFinite(valor)) partes.push(`Condomínio ${moeda(valor)}`)
  }
  const disponibilidade = /disponível a partir de ([^.]+)/i.exec(descricao)?.[1]
  if (disponibilidade) partes.push(`Disponível a partir de ${disponibilidade.trim()}`)
  return partes.length === 0 ? undefined : partes.join(" · ")
}

export function ListaDeMercado({
  inicial,
  comAbas = true,
}: {
  inicial: AbaDoMercado
  comAbas?: boolean
}) {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [salvos, setSalvos] = useState<ReadonlySet<string>>(() => new Set())
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)
  const [tipo, setTipo] = useState("todos")
  const [minimoQuartos, setMinimoQuartos] = useState("0")
  const [maximoMensal, setMaximoMensal] = useState("todos")
  const [ordenacao, setOrdenacao] = useState("relevancia")
  const [modoLista, setModoLista] = useState(false)
  const [criandoImovel, setCriandoImovel] = useState(false)
  const [rascunhos, setRascunhos] = useState<RascunhoImovel[]>([])
  const [erroRascunho, setErroRascunho] = useState("")

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
    if (inicial !== "imoveis") return
    setRascunhos(lerRascunhosImoveis(casca.cidade))
    const abrir = () => {
      try {
        window.sessionStorage.removeItem(CHAVE_ABERTURA_IMOVEL)
      } catch {
        /* sem persistência */
      }
      setCriandoImovel(true)
    }
    window.addEventListener(PEDIDO_CRIAR_IMOVEL, abrir)
    try {
      if (window.sessionStorage.getItem(CHAVE_ABERTURA_IMOVEL) === "1") abrir()
    } catch {
      /* CTA do catálogo continua disponível sem storage */
    }
    return () => window.removeEventListener(PEDIDO_CRIAR_IMOVEL, abrir)
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
    return dados.anuncios
      .map((anuncio) => ({ anuncio, apresentacao: registro(anuncio.apresentacao) }))
      .filter(({ anuncio }) =>
        inicial === "imoveis"
          ? anuncio.kind !== null && ehImovel(anuncio.kind)
          : !ehImovel(anuncio.kind),
      )
  }, [dados, inicial])

  const imoveisFiltrados = useMemo(() => {
    if (inicial !== "imoveis") return itens
    const filtrados = itens.filter(({ anuncio }) => {
      if (tipo !== "todos" && !anuncio.title.toLocaleLowerCase("pt-BR").includes(tipo)) return false
      const quartosDoImovel = quartos(anuncio)
      if (
        minimoQuartos !== "0" &&
        (quartosDoImovel === null || quartosDoImovel < Number(minimoQuartos))
      )
        return false
      if (maximoMensal !== "todos") {
        const mensal = totalMensal(anuncio)
        if (mensal === null || mensal > Number(maximoMensal)) return false
      }
      return true
    })
    return filtrados.sort((a, b) => {
      if (ordenacao === "relevancia") return 0
      const precoA = totalMensal(a.anuncio)
      const precoB = totalMensal(b.anuncio)
      if (precoA === null && precoB === null) return 0
      if (precoA === null) return 1
      if (precoB === null) return -1
      return ordenacao === "menor" ? precoA - precoB : precoB - precoA
    })
  }, [inicial, itens, tipo, minimoQuartos, maximoMensal, ordenacao])

  const limparFiltros = () => {
    setTipo("todos")
    setMinimoQuartos("0")
    setMaximoMensal("todos")
    setOrdenacao("relevancia")
  }

  const negocios = useMemo(() => {
    if (dados === null) return []
    return dados.negocios
      .map((negocio) => ({ negocio, apresentacao: registro(negocio.apresentacao) }))
      .sort((a, b) => numero(b.apresentacao["recN"]) - numero(a.apresentacao["recN"]))
  }, [dados])

  const alternarSalvo = (id: string) => {
    setSalvos((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  const carregando = dados === null && !erro
  const titulo =
    inicial === "desapegos" ? "Desapegos" : inicial === "imoveis" ? "Imóveis" : "Negócios locais"

  return (
    <section data-tela={inicial} className="grid gap-2">
      <CabecaDePagina
        titulo={titulo}
        subtitulo={`O que a comunidade de ${casca.cidade} está anunciando.`}
        acao={
          inicial === "imoveis" ? (
            <Botao data-acao="anunciar-imovel" icone="add" onClick={() => setCriandoImovel(true)}>
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

      {inicial === "imoveis" && !carregando && !erro ? (
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
                aoMudar={setTipo}
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
                aoMudar={setMinimoQuartos}
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
                  aoMudar={setMaximoMensal}
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

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={4} />
      ) : inicial === "negocios" ? (
        negocios.length === 0 ? (
          <EstadoVazio
            titulo="Ainda sem negócios cadastrados"
            texto="As indicações da comunidade ajudarão a formar o guia de serviços."
            icone="storefront"
          />
        ) : (
          <>
            <p className="text-sm text-(--on-surface-variant)">
              {negocios.length === 1 ? "1 negócio" : `${negocios.length} negócios`} em{" "}
              {casca.cidade}
            </p>
            <Grade formato="cartoes">
              {negocios.map(({ negocio, apresentacao }) => (
                <CartaoDeNegocio
                  key={negocio.id}
                  negocio={{
                    id: negocio.id,
                    fonte: texto(apresentacao["imagem"]),
                    nome: texto(apresentacao["name"], negocio.display_name),
                    categoria: texto(apresentacao["cat"], negocio.category ?? ""),
                    cidade: casca.cidade,
                    indicacoes: numero(apresentacao["recN"]),
                    patrocinado: apresentacao["spon"] === true,
                    aguardando: apresentacao["claimed"] === false,
                  }}
                  aoAbrir={() =>
                    void navegacao.irPara("negocio", { parametros: { id: negocio.id } })
                  }
                />
              ))}
            </Grade>
          </>
        )
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
          <p className="text-sm text-(--on-surface-variant)">
            {inicial === "imoveis" ? imoveisFiltrados.length : itens.length}{" "}
            {inicial === "imoveis" ? "imóveis" : "anúncios"} em {casca.cidade}
          </p>
          <Grade
            formato="cartoes"
            className={inicial === "imoveis" && modoLista ? "bv-lista-imoveis" : ""}
          >
            {(inicial === "imoveis" ? imoveisFiltrados : itens).map(({ anuncio, apresentacao }) => (
              <CartaoDeFoto
                key={anuncio.id}
                anuncio={{
                  id: anuncio.id,
                  fonte: texto(apresentacao["imagem"]),
                  rotulo: texto(apresentacao["flag"]) || undefined,
                  porMes: texto(apresentacao["per"]) === "/mês",
                  titulo: texto(apresentacao["title"], anuncio.title),
                  preco: typeof anuncio.price_cents === "number" ? anuncio.price_cents / 100 : null,
                  icone: iconeDeDado(apresentacao["icon"]),
                  meta: texto(apresentacao["hood"], anuncio.neighborhood ?? casca.cidade),
                  salvo: salvos.has(anuncio.id) || apresentacao["saved"] === true,
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
