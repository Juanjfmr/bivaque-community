import { useEffect, useState } from "react"
import { Icone } from "@/components/bivaque/icone"
import {
  Botao,
  CampoDeBusca,
  CampoDeEscolha,
  Cartao,
  Chip,
  Esqueleto,
  Folha,
  Linha,
  Selo,
} from "@/src/pecas/pecas"
import {
  filtrarExemplos,
  ITENS_DE_EXEMPLO,
  separarPorTipo,
  TIPOS,
  type Cenario,
  type ItemDeExemplo,
  type TipoDeFiltro,
} from "./modelo"
import "./previa-vnext.css"

type Variante = "a" | "b" | "comparar"

function varianteInicial(): Variante {
  const v = new URLSearchParams(window.location.search).get("v")
  return v === "b" || v === "comparar" ? v : "a"
}

function nomeDoTipo(tipo: TipoDeFiltro): string {
  return TIPOS.find((item) => item.id === tipo)?.rotulo ?? "Tudo"
}

function Filtros({
  tipo,
  aoSelecionar,
  itens,
  compacto = false,
}: {
  tipo: TipoDeFiltro
  aoSelecionar: (tipo: TipoDeFiltro) => void
  itens: readonly ItemDeExemplo[]
  compacto?: boolean
}) {
  return (
    <div className={compacto ? "pv-filtros pv-filtros-coluna" : "pv-filtros"} role="group" aria-label="Filtrar por tipo de conteúdo">
      {TIPOS.map((item) => {
        const quantidade = item.id === "todos" ? itens.length : itens.filter((i) => i.tipo === item.id).length
        return (
          <Chip key={item.id} selecionado={tipo === item.id} onClick={() => aoSelecionar(item.id)}>
            {item.rotulo} <span className="pv-contagem" aria-hidden="true">{quantidade}</span>
          </Chip>
        )
      })}
    </div>
  )
}

function CabecaDoGrupo({ titulo, quantidade }: { titulo: string; quantidade: number }) {
  return (
    <div className="pv-secao-cabeca">
      <h3 className="pc-secao">{titulo}</h3>
      <span className="pc-miudo">{quantidade} {quantidade === 1 ? "item" : "itens"}</span>
    </div>
  )
}

function Vazio({ busca, aoLimpar }: { busca: string; aoLimpar: () => void }) {
  return (
    <div className="pv-vazio" role="status">
      <Icone nome="search_off" />
      <h3 className="pc-subtitulo">Nenhum conteúdo neste cenário</h3>
      <p className="pc-apoio">
        {busca.trim() !== ""
          ? "Não há exemplos para essa busca. Tente outra palavra ou retire o filtro."
          : "Uma cidade nova não precisa de cartões vazios para parecer movimentada."}
      </p>
      <Botao tom="contorno" onClick={aoLimpar}>Limpar filtros</Botao>
    </div>
  )
}

function ListaDeItens({
  itens,
  aoAbrir,
}: {
  itens: readonly ItemDeExemplo[]
  aoAbrir: (item: ItemDeExemplo) => void
}) {
  return (
    <ul className="pc-lista pv-lista">
      {itens.map((item) => (
        <li key={item.id}>
          <Linha
            marca={<Icone nome={item.icone} />}
            titulo={item.titulo}
            apoio={`${item.local} · ${item.contexto}`}
            onClick={() => aoAbrir(item)}
            aria-label={`Ver contexto: ${item.titulo}`}
          />
        </li>
      ))}
    </ul>
  )
}

function CartaoDeExemplo({
  item,
  aoAbrir,
}: {
  item: ItemDeExemplo
  aoAbrir: (item: ItemDeExemplo) => void
}) {
  return (
    <Cartao className="pv-rail-card">
      <div className="pv-card-topo">
        <Icone nome={item.icone} />
        <span className="pc-miudo">{nomeDoTipo(item.tipo)}</span>
      </div>
      <h4 className="pc-subtitulo">{item.titulo}</h4>
      <p className="pc-apoio">{item.local}</p>
      <p className="pc-apoio pv-card-resumo">{item.resumo}</p>
      <Botao tom="texto" onClick={() => aoAbrir(item)}>Ver contexto</Botao>
    </Cartao>
  )
}

/**
 * A — explora primeiro. Perguntas em lista (leitura), ofertas em trilho
 * horizontal (descoberta), eventos em linhas (tempo). O header não cria um
 * cartão genérico. Busca e filtros são os MESMOS da variante B.
 */
function Exploracao({
  busca,
  aoBuscar,
  tipo,
  aoFiltrar,
  itens,
  base,
  aoAbrir,
  aoLimpar,
}: PropsDaComposicao) {
  const grupos = separarPorTipo(itens)
  return (
    <section className="pv-screen pv-a" data-composicao="exploracao" aria-label="Alternativa A — exploração contextual">
      <div className="pv-a-abertura">
        <div className="pv-a-introducao">
          <p className="pc-miudo">MANAUS · EXPLORAR A CIDADE</p>
          <h2 className="pc-titulo">O que você precisa resolver hoje?</h2>
          <p className="pc-apoio">Perguntas, serviços e moradia num só lugar.</p>
          <CampoDeBusca
            rotulo="Buscar exemplos na cidade"
            placeholder="Escola, mudança, eletricista..."
            value={busca}
            onChange={(e) => aoBuscar(e.target.value)}
          />
          <Filtros tipo={tipo} aoSelecionar={aoFiltrar} itens={base} />
        </div>
        <aside className="pv-a-contexto">
          <Selo nome="chegadas" tamanho={64} />
          <p className="pc-miudo">REDE LOCAL</p>
          <p className="pc-subtitulo">A experiência de quem chegou antes ajuda quem está chegando.</p>
          <p className="pc-apoio">Nesta prévia, os exemplos são simulados.</p>
        </aside>
      </div>
      {itens.length === 0 ? (
        <Vazio busca={busca} aoLimpar={aoLimpar} />
      ) : (
        <div className="pv-a-conteudo">
          {grupos.pergunta.length > 0 && (
            <section className="pv-grupo">
              <CabecaDoGrupo titulo="Perguntas da cidade" quantidade={grupos.pergunta.length} />
              <ListaDeItens itens={grupos.pergunta} aoAbrir={aoAbrir} />
            </section>
          )}
          {(grupos.negocio.length > 0 || grupos.imovel.length > 0) && (
            <section className="pv-grupo">
              <CabecaDoGrupo
                titulo="Para resolver a vida prática"
                quantidade={grupos.negocio.length + grupos.imovel.length}
              />
              <div className="pv-rail" role="group" aria-label="Explorar serviços e moradias; deslize horizontalmente">
                {[...grupos.negocio, ...grupos.imovel].map((item) => (
                  <CartaoDeExemplo key={item.id} item={item} aoAbrir={aoAbrir} />
                ))}
              </div>
              <p className="pc-miudo pv-deslize">Deslize para ver mais; use Tab para navegar pelos itens.</p>
            </section>
          )}
          {grupos.evento.length > 0 && (
            <section className="pv-grupo">
              <CabecaDoGrupo titulo="Encontros" quantidade={grupos.evento.length} />
              <ListaDeItens itens={grupos.evento} aoAbrir={aoAbrir} />
            </section>
          )}
        </div>
      )}
    </section>
  )
}

/**
 * B — localizar primeiro. Busca proeminente, filtros colaterais e resultado
 * denso em linhas; no desktop o filtro vira área lateral, não cards esticados.
 */
function BuscaOrientada({
  busca,
  aoBuscar,
  tipo,
  aoFiltrar,
  itens,
  base,
  aoAbrir,
  aoLimpar,
}: PropsDaComposicao) {
  return (
    <section className="pv-screen pv-b" data-composicao="busca" aria-label="Alternativa B — busca orientada">
      <header className="pv-b-cabeca">
        <p className="pc-miudo">MANAUS · BUSCA LOCAL</p>
        <h2 className="pc-titulo">Encontre o que precisa.</h2>
        <p className="pc-apoio">Busque por assunto, serviço, imóvel ou encontro.</p>
        <CampoDeBusca
          rotulo="Buscar exemplos na cidade"
          placeholder="O que você está procurando?"
          value={busca}
          onChange={(e) => aoBuscar(e.target.value)}
        />
      </header>
      <div className="pv-b-corpo">
        <aside className="pv-b-lateral">
          <p className="pc-miudo pv-b-filtro-titulo">REFINAR POR ASSUNTO</p>
          <Filtros tipo={tipo} aoSelecionar={aoFiltrar} itens={base} compacto />
        </aside>
        <section className="pv-b-resultados" aria-label="Resultados da busca">
          <div className="pv-secao-cabeca">
            <h3 className="pc-secao">Resultados</h3>
            <span className="pc-miudo">{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
          </div>
          {itens.length === 0 ? (
            <Vazio busca={busca} aoLimpar={aoLimpar} />
          ) : (
            <ListaDeItens itens={itens} aoAbrir={aoAbrir} />
          )}
        </section>
      </div>
    </section>
  )
}

type PropsDaComposicao = {
  busca: string
  aoBuscar: (texto: string) => void
  tipo: TipoDeFiltro
  aoFiltrar: (tipo: TipoDeFiltro) => void
  itens: readonly ItemDeExemplo[]
  base: readonly ItemDeExemplo[]
  aoAbrir: (item: ItemDeExemplo) => void
  aoLimpar: () => void
}

export function PreviaVNext() {
  const [variante, setVariante] = useState<Variante>(varianteInicial)
  const [cenario, setCenario] = useState<Cenario>("completo")
  const [busca, setBusca] = useState("")
  const [tipo, setTipo] = useState<TipoDeFiltro>("todos")
  const [detalhe, setDetalhe] = useState<ItemDeExemplo | null>(null)
  const base = filtrarExemplos(ITENS_DE_EXEMPLO, { busca: "", tipo: "todos", cenario })
  const itens = filtrarExemplos(ITENS_DE_EXEMPLO, { busca, tipo, cenario })

  useEffect(() => {
    const aoVoltar = () => setVariante(varianteInicial())
    window.addEventListener("popstate", aoVoltar)
    return () => window.removeEventListener("popstate", aoVoltar)
  }, [])

  function mudarVariante(proxima: Variante) {
    const url = new URL(window.location.href)
    url.searchParams.set("v", proxima)
    window.history.replaceState(window.history.state, "", url)
    setVariante(proxima)
  }

  function limpar() {
    setTipo("todos")
    setBusca("")
  }

  const props: PropsDaComposicao = {
    busca,
    aoBuscar: setBusca,
    tipo,
    aoFiltrar: setTipo,
    itens,
    base,
    aoAbrir: setDetalhe,
    aoLimpar: limpar,
  }

  return (
    <div className="pc pv" data-laboratorio="design-vnext-f02">
      <div className="pv-laboratorio">
        <header className="pv-controles">
          <p className="pc-miudo">BIVAQUE · LABORATÓRIO VISUAL · F02</p>
          <h1 className="pc-titulo">Início e Busca: duas composições</h1>
          <p className="pc-apoio">
            Protótipos isolados com conteúdo idêntico. Não são telas publicadas nem dados reais.
          </p>
          <div className="pv-controles-linha">
            <div className="pv-escolhas" role="group" aria-label="Escolher composição">
              <Chip selecionado={variante === "a"} onClick={() => mudarVariante("a")}>A · Explorar</Chip>
              <Chip selecionado={variante === "b"} onClick={() => mudarVariante("b")}>B · Buscar</Chip>
              <Chip selecionado={variante === "comparar"} onClick={() => mudarVariante("comparar")}>Comparar</Chip>
            </div>
            <div className="pv-cenario">
              <CampoDeEscolha
                rotulo="Conjunto de dados"
                value={cenario}
                onChange={(e) => setCenario(e.target.value as Cenario)}
                opcoes={[
                  { valor: "completo", rotulo: "Oito exemplos" },
                  { valor: "escasso", rotulo: "Pouco conteúdo" },
                  { valor: "vazio", rotulo: "Sem conteúdo" },
                  { valor: "carregando", rotulo: "Carregando" },
                  { valor: "erro", rotulo: "Falha de leitura" },
                ]}
              />
            </div>
          </div>
          <p className="pc-miudo" role="status" aria-live="polite">
            {nomeDoTipo(tipo)} · {itens.length} {itens.length === 1 ? "resultado" : "resultados"} · conteúdo de demonstração
          </p>
        </header>

        {cenario === "erro" ? (
          <section className="pv-feedback" role="alert">
            <h2 className="pc-subtitulo">Não foi possível carregar os resultados</h2>
            <p className="pc-apoio">Falha simulada de leitura. O erro não é apresentado como lista vazia.</p>
            <Botao tom="principal" onClick={() => setCenario("completo")}>Tentar novamente</Botao>
          </section>
        ) : cenario === "carregando" ? (
          <section className="pv-feedback" role="status" aria-label="Carregando exemplos">
            <h2 className="pc-subtitulo">Carregando exemplos</h2>
            <Esqueleto largura="65%" altura={24} />
            <Esqueleto largura="100%" altura={64} />
            <Esqueleto largura="90%" altura={64} />
            <Botao tom="contorno" onClick={() => setCenario("completo")}>Concluir simulação</Botao>
          </section>
        ) : (
          <div className={variante === "comparar" ? "pv-comparacao" : "pv-um"}>
            {(variante === "a" || variante === "comparar") && <Exploracao {...props} />}
            {(variante === "b" || variante === "comparar") && <BuscaOrientada {...props} />}
          </div>
        )}
      </div>
      <Folha aberta={detalhe !== null} aoFechar={() => setDetalhe(null)} titulo={detalhe?.titulo ?? "Detalhe"}>
        {detalhe !== null && (
          <div className="pv-detalhe">
            <p className="pc-miudo">DEMONSTRAÇÃO · {nomeDoTipo(detalhe.tipo)}</p>
            <p className="pc-corpo">{detalhe.resumo}</p>
            <p className="pc-apoio">{detalhe.local} · {detalhe.contexto}</p>
            <p className="pc-miudo">O item é fictício e não tem destino no aplicativo real.</p>
            <Botao tom="principal" onClick={() => setDetalhe(null)}>Fechar detalhe</Botao>
          </div>
        )}
      </Folha>
    </div>
  )
}
