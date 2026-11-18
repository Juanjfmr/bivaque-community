"use client"

import { useLocation, useNavigate } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Selecao } from "@/components/bivaque/campos"
import { CartaoDeFoto } from "@/components/bivaque/cartao-de-anuncio"
import type { ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { FormularioImovel } from "@/components/bivaque/formulario-imovel"
import { Grade } from "@/components/bivaque/grade"
import { Icone } from "@/components/bivaque/icone"
import {
  type AnuncioDaLista,
  type ListaDoMercado,
  lerMercado,
  marcarSalvoAnuncio,
} from "@/lib/dados/mercado"
import { moeda } from "@/lib/formato"
import { iconeDeDado } from "@/lib/icones"
import {
  useNavegacao,
  useRolagemEFoco,
  useRotaAtual,
  useSobreposicaoDaEntrada,
} from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, foiAbortada, sessaoVencida } from "@/src/eventos/formulario"
import {
  atributosDoImovel,
  complementoDoImovel,
  eAluguel,
  ehImovel,
  precoEmReais,
  rotuloDaCapa,
} from "@/src/mercado/cartao"
import { mensagemDaFalha } from "@/src/mercado/falha"
import { type FiltrosDaUrl, lerFiltrosDaUrl, mudarFiltroNaUrl } from "@/src/mercado/filtros-url"
import { Segmentos } from "@/src/pecas/segmentos"

/**
 * O Mercado do app, do banco (LAN-F06, no molde do F05).
 *
 * O desenho é o mesmo de sempre: uma lista por aba (Desapegos, Imóveis,
 * Negócios), sub-abas navegando de verdade, contagem, salvar local e filtros.
 * Mudou de onde vem o dado — `lib/dados/mercado`, que fala
 * com `/api/app/mercado` — e por isso a tela distingue carregando, vazio de
 * verdade, falha recuperável, sessão vencida e acesso negado. Banco fora não
 * vira "nada anunciado". Em Imóveis, "Anunciar imóvel" publica de verdade e
 * leva ao anúncio criado.
 *
 * Os filtros (RUN-171) são do SERVIDOR: a tela manda q/bairro/tipo/quarto/teto
 * na query e desenha o que voltou. Filtrar a página carregada era o meio feito
 * — o filtro valia só para os 20 primeiros. O que o servidor não filtra não tem
 * controle aqui.
 */

export type AbaDoMercado = "desapegos" | "imoveis"

const SUBABAS: readonly ItemDeFiltro[] = [
  { id: "desapegos", rotulo: "Desapegos" },
  { id: "imoveis", rotulo: "Imóveis" },
  { id: "negocios", rotulo: "Negócios" },
]

export function ListaDeMercado({ inicial }: { inicial: AbaDoMercado }) {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<ListaDoMercado | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [avisoSalvo, setAvisoSalvo] = useState<string | null>(null)
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
  const [modoLista, setModoLista] = useState(false)
  const { aberto: criandoImovel, aoMudarAberto: setCriandoImovel } =
    useSobreposicaoDaEntrada("rascunho-imovel")

  useRolagemEFoco(CARGA_CONCLUIDA)

  // A cidade é a da sessão, devolvida pela rota; `casca.cidade` segue no cabeçalho
  // enquanto a rota não traz nome (vazio honesto, nunca cidade inventada).
  // A `pagina` da URL persegue o cursor do servidor até a página pedida, e a
  // chave abaixo refaz a busca do zero quando qualquer filtro muda: o cursor da
  // página anterior não significa nada para outro critério.
  const chaveDosFiltros = JSON.stringify(filtros)
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o "tentar de novo"; chaveDosFiltros já resume os filtros
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(null)
    void lerMercado(
      {
        tipo: inicial === "imoveis" ? "property" : "item",
        pagina: filtros.pagina,
        q: filtros.q,
        bairro: filtros.bairro,
        ...(filtros.tipoNegocio === null ? {} : { tipoNegocio: filtros.tipoNegocio }),
        quartos: filtros.quartos,
        ...(filtros.valorMaxReais === null ? {} : { valorMax: filtros.valorMaxReais }),
        tipoImovel: filtros.tipoImovel,
        ...(filtros.precoMinCents === null ? {} : { precoMinCents: filtros.precoMinCents }),
        ...(filtros.precoMaxCents === null ? {} : { precoMaxCents: filtros.precoMaxCents }),
      },
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
  }, [inicial, rodada, chaveDosFiltros])

  // O servidor já filtrou: a tela desenha o que voltou, sem recortar a página.
  const itens = dados?.anuncios ?? []

  const limparFiltros = () => {
    gravarFiltros({
      q: "",
      bairro: "",
      tipoNegocio: null,
      tipoImovel: "todos",
      quartos: 0,
      valorMaxReais: null,
      precoMinCents: null,
      precoMaxCents: null,
    })
  }

  /**
   * Um chip por filtro ativo, inclusive os que vêm de link (bairro e negócio do
   * alerta): o critério fica visível e sai com um toque. Filtro que filtra sem
   * aparecer faz a lista parecer quebrada.
   */
  const chips: { chave: string; rotulo: string; remover: () => void }[] = []
  if (filtros.q !== "") {
    chips.push({
      chave: "q",
      rotulo: `Busca: ${filtros.q}`,
      remover: () => gravarFiltros({ q: "" }),
    })
  }
  if (filtros.bairro !== "") {
    chips.push({
      chave: "bairro",
      rotulo: `Bairro: ${filtros.bairro}`,
      remover: () => gravarFiltros({ bairro: "" }),
    })
  }
  if (filtros.tipoNegocio !== null) {
    chips.push({
      chave: "tipo_negocio",
      rotulo: filtros.tipoNegocio === "sale" ? "Venda" : "Aluguel",
      remover: () => gravarFiltros({ tipoNegocio: null }),
    })
  }
  if (filtros.tipoImovel !== "todos") {
    chips.push({
      chave: "tipo",
      rotulo: filtros.tipoImovel === "casa" ? "Casa" : "Apartamento",
      remover: () => gravarFiltros({ tipoImovel: "todos" }),
    })
  }
  if (filtros.quartos > 0) {
    chips.push({
      chave: "quartos",
      rotulo: `${filtros.quartos}+ quartos`,
      remover: () => gravarFiltros({ quartos: 0 }),
    })
  }
  if (filtros.valorMaxReais !== null) {
    chips.push({
      chave: "valor_max",
      rotulo: `Até ${moeda(filtros.valorMaxReais)}`,
      remover: () => gravarFiltros({ valorMaxReais: null }),
    })
  }
  if (filtros.precoMinCents !== null) {
    chips.push({
      chave: "preco_min",
      rotulo: `A partir de ${moeda(filtros.precoMinCents / 100)}`,
      remover: () => gravarFiltros({ precoMinCents: null }),
    })
  }
  if (filtros.precoMaxCents !== null) {
    chips.push({
      chave: "preco_max",
      rotulo: `Até ${moeda(filtros.precoMaxCents / 100)}`,
      remover: () => gravarFiltros({ precoMaxCents: null }),
    })
  }
  const temFiltros = chips.length > 0

  /**
   * O marcador do cartão grava em `listing_saves` (LAN-F06). A tela vira antes,
   * porque o toque precisa responder na hora; se o servidor recusar, o cartão
   * volta ao estado anterior e a mensagem diz o que aconteceu. O estado de
   * verdade é o da lista: recarregar mostra o que o banco tem.
   */
  const alternarSalvo = async (anuncio: AnuncioDaLista) => {
    const alvo = !anuncio.salvo
    const ajustar = (salvo: boolean) =>
      setDados((atual) =>
        atual === null
          ? atual
          : {
              ...atual,
              anuncios: atual.anuncios.map((item) =>
                item.id === anuncio.id ? { ...item, salvo } : item,
              ),
            },
      )
    setAvisoSalvo(null)
    ajustar(alvo)
    try {
      await marcarSalvoAnuncio(anuncio.id, alvo)
    } catch (falha: unknown) {
      ajustar(!alvo)
      if (!foiAbortada(falha)) setAvisoSalvo(mensagemDaFalha(falha, "salvar"))
    }
  }

  const carregando = dados === null && erro === null
  const cidade = dados?.cidade ?? casca.cidade
  const titulo = inicial === "desapegos" ? "Desapegos" : "Imóveis"

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
          // Publicado: o app abre o próprio anúncio, como o desapego do Criar.
          // Não fechar a folha antes: `irPara` já substitui a entrada aberta (é
          // o `entrarEmRota` que fecha a sobreposição); um `back()` aqui
          // correria com a navegação e voltaria para a lista.
          aoSalvar={(id) => void navegacao.irPara("anuncio", { parametros: { id }, replace: true })}
        />
      ) : null}

      <Segmentos
        itens={SUBABAS}
        valor={inicial}
        aoEscolher={(aba) => void navegacao.irPara(aba)}
        rotulo="Seções do Mercado"
        grupo="mercado"
      />

      {chips.length === 0 ? null : (
        <div data-chips="filtros-mercado" className="flex flex-wrap gap-1">
          {chips.map((chip) => (
            <Botao
              key={chip.chave}
              tom="texto"
              icone="close"
              data-acao="remover-filtro"
              data-filtro={chip.chave}
              onClick={chip.remover}
            >
              {chip.rotulo}
            </Botao>
          ))}
        </div>
      )}

      {inicial === "imoveis" && erro === null ? (
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
              {itens.length} {itens.length === 1 ? "imóvel" : "imóveis"}
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
                  id="valor-imovel"
                  // O teto do servidor é a coluna do negócio (aluguel ou venda),
                  // não aluguel+condomínio: a copy promete o que ele faz.
                  rotulo={
                    filtros.tipoNegocio === "sale" ? "Preço de venda até" : "Aluguel até, por mês"
                  }
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

      {avisoSalvo === null ? null : (
        <p role="alert" className="text-sm text-(--destructive)">
          {avisoSalvo}
        </p>
      )}

      {erro === "sessao" ? (
        <EstadoDeSessaoVencida />
      ) : erro === "negado" ? (
        <EstadoNegado texto="Sua conta não tem acesso ao Mercado desta cidade." />
      ) : erro === "falhou" ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={4} />
      ) : itens.length === 0 ? (
        <EstadoVazio
          // O vazio é do servidor: sem filtro é "nada anunciado"; com filtro é
          // "nada com esse critério" — e o caminho de saída é tirar o filtro.
          titulo={
            temFiltros
              ? inicial === "imoveis"
                ? "Nenhum imóvel corresponde aos filtros"
                : "Nenhum anúncio corresponde aos filtros"
              : "Nada anunciado nesta seção"
          }
          texto={
            temFiltros
              ? "Tire um filtro para ver mais anúncios desta cidade."
              : "Quando alguém publicar, o anúncio aparece aqui para toda a cidade."
          }
          icone="sell"
          {...(temFiltros ? { acao: { rotulo: "Limpar filtros", aoAcionar: limparFiltros } } : {})}
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
            {itens.map((anuncio) => (
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
                  salvo: anuncio.salvo,
                  ...(inicial === "imoveis"
                    ? {
                        detalhes: atributosDoImovel(anuncio),
                        ...(complementoDoImovel(anuncio) === undefined
                          ? {}
                          : { informacaoExtra: complementoDoImovel(anuncio) }),
                      }
                    : {}),
                }}
                aoSalvar={() => void alternarSalvo(anuncio)}
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
  return <ListaDeMercado inicial="imoveis" />
}
