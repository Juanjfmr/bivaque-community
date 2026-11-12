import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Selecao } from "@/components/bivaque/campos"
import { CartaoDeNegocio } from "@/components/bivaque/cartao-de-anuncio"
import { ChipsDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { type ListaDoMercado, lerMercado } from "@/lib/dados/mercado"
import { type ListaDeNegocios, lerNegocios } from "@/lib/dados/negocios"
import { useEntradaDaTela, useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { type ItemDeSegmento, Segmentos } from "@/src/pecas/segmentos"
import { FalhaDaLeitura } from "./FalhaDaLeitura"
import { avisoDaOrdem, type OrdemDosNegocios, ordemDe } from "./ordem"

/**
 * A lista de negócios da cidade (F07), com as três seções do Mercado no topo.
 *
 * A página tem nome próprio ("Mercado da cidade") — antes ela e a aba se
 * chamavam "Negócios" — e as seções são segmentos que navegam de verdade. A
 * contagem de cada segmento é a que a lista daquela seção já entrega, com o `+`
 * quando há mais páginas; falha de leitura deixa a seção sem número, nunca com
 * zero inventado.
 */

type Contagem = Readonly<{ total: number; temMais: boolean }>

function contar(lista: ListaDoMercado): Contagem {
  return { total: lista.anuncios.length, temMais: lista.proximo !== null }
}

export function Negocios() {
  const navegacao = useNavegacao()
  const entrada = useEntradaDaTela()
  const categoria = entrada.filtros["categoria-negocio"] ?? ""
  const [dados, setDados] = useState<ListaDeNegocios | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [mais, setMais] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const [salvos, setSalvos] = useState<ReadonlySet<string>>(() => new Set())
  const [ordem, setOrdem] = useState<OrdemDosNegocios>("recentes")
  const [contagens, setContagens] = useState<
    Readonly<{ desapegos: Contagem | null; imoveis: Contagem | null }>
  >({ desapegos: null, imoveis: null })
  const controle = useRef<AbortController | null>(null)

  useRolagemEFoco(CARGA_CONCLUIDA)
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada repete a leitura por pedido da pessoa
  useEffect(() => {
    const leitura = new AbortController()
    controle.current = leitura
    setDados(null)
    setErro(null)
    setMais(false)
    setErroMais(false)
    void lerNegocios({ categoria, signal: leitura.signal })
      .then((lidos) => {
        if (!leitura.signal.aborted) setDados(lidos)
      })
      .catch((falha: unknown) => {
        if (!leitura.signal.aborted) setErro(falha)
      })
    return () => leitura.abort()
  }, [categoria, rodada])

  // A contagem das seções irmãs vem da primeira página da lista de cada uma.
  // A leitura que falha deixa o segmento só com o nome.
  useEffect(() => {
    const leitura = new AbortController()
    setContagens({ desapegos: null, imoveis: null })
    void Promise.allSettled([
      lerMercado({ tipo: "item" }, { signal: leitura.signal }),
      lerMercado({ tipo: "property" }, { signal: leitura.signal }),
    ]).then(([desapegos, imoveis]) => {
      if (leitura.signal.aborted) return
      setContagens({
        desapegos: desapegos.status === "fulfilled" ? contar(desapegos.value) : null,
        imoveis: imoveis.status === "fulfilled" ? contar(imoveis.value) : null,
      })
    })
    return () => leitura.abort()
  }, [])

  async function carregarMais() {
    const leitura = controle.current
    if (dados === null || dados.proximo === null || mais || leitura === null) return
    setMais(true)
    setErroMais(false)
    try {
      const lidos = await lerNegocios({ categoria, depois: dados.proximo, signal: leitura.signal })
      if (!leitura.signal.aborted)
        setDados({ ...lidos, negocios: [...dados.negocios, ...lidos.negocios] })
    } catch {
      if (!leitura.signal.aborted) setErroMais(true)
    } finally {
      if (!leitura.signal.aborted) setMais(false)
    }
  }

  // O caminho real de cadastro é o menu Criar, o mesmo do botão da casca: não
  // existe rota própria de cadastro de negócio.
  const anunciar = () => void navegacao.abrir("menu-criar")

  const segmentos: readonly ItemDeSegmento[] = [
    {
      id: "desapegos",
      rotulo: "Desapegos",
      contagem: contagens.desapegos?.total ?? null,
      temMais: contagens.desapegos?.temMais ?? false,
    },
    {
      id: "imoveis",
      rotulo: "Imóveis",
      contagem: contagens.imoveis?.total ?? null,
      temMais: contagens.imoveis?.temMais ?? false,
    },
    {
      id: "negocios",
      rotulo: "Negócios",
      contagem: dados === null ? null : dados.negocios.length,
      temMais: dados !== null && dados.proximo !== null,
    },
  ]

  const aviso = avisoDaOrdem(ordem, false)

  return (
    <section data-tela="negocios" className="grid gap-2">
      <CabecaDePagina
        titulo="Mercado da cidade"
        subtitulo={
          dados === null
            ? "Serviços da sua cidade."
            : `O que a comunidade de ${dados.cidade} está anunciando.`
        }
        acao={
          <Botao tom="texto" onClick={() => void navegacao.irPara("pedidos")}>
            Meus pedidos
          </Botao>
        }
      />
      <Segmentos
        itens={segmentos}
        valor="negocios"
        rotulo="Seções do Mercado"
        aoEscolher={(secao) => void navegacao.irPara(secao)}
        acao={
          <Botao tom="tonal" icone="add" data-acao="anunciar-negocio" onClick={anunciar}>
            Anunciar negócio
          </Botao>
        }
      />
      {erro !== null ? (
        <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : dados === null ? (
        <EsqueletoDeLista linhas={4} />
      ) : (
        <>
          <ChipsDeFiltro
            rotulo="Categorias de negócios"
            valor={categoria || "todas"}
            itens={[
              { id: "todas", rotulo: "Todas" },
              ...dados.categorias.map((item) => ({ id: item.id, rotulo: item.nome })),
            ]}
            aoEscolher={(id) =>
              void navegacao.atualizar({
                filtros: { "categoria-negocio": id === "todas" ? "" : id },
              })
            }
          />
          <div className="mt-2 max-w-xs">
            <Selecao
              id="ordenar-negocios"
              rotulo="Ordenar por"
              valor={ordem}
              aoMudar={(novo) => setOrdem(ordemDe(novo))}
              opcoes={[
                { valor: "recentes", titulo: "Mais recentes" },
                { valor: "proximos", titulo: "Mais próximos" },
              ]}
            />
          </div>
          {aviso === null ? null : (
            <p data-aviso="ordem" role="status" className="text-sm text-(--on-surface-variant)">
              {aviso}
            </p>
          )}
          {dados.negocios.length === 0 ? (
            <EstadoVazio
              titulo="Ainda sem negócios cadastrados"
              texto="Quando um negócio desta categoria estiver disponível na sua cidade, ele aparece aqui."
              icone="storefront"
              acao={{ rotulo: "Anunciar negócio", aoAcionar: anunciar }}
            />
          ) : (
            <>
              <p className="text-sm text-(--on-surface-variant)">
                {dados.negocios.length} {dados.negocios.length === 1 ? "negócio" : "negócios"} em{" "}
                {dados.cidade}
              </p>
              <Grade formato="cartoes">
                {dados.negocios.map((negocio) => (
                  <CartaoDeNegocio
                    key={negocio.id}
                    negocio={{
                      id: negocio.id,
                      nome: negocio.nome,
                      categoria: negocio.categoriaNome,
                      cidade: dados.cidade,
                      salvo: salvos.has(negocio.id),
                    }}
                    aoAbrir={() =>
                      void navegacao.irPara("negocio", { parametros: { id: negocio.id } })
                    }
                    aoSalvar={() =>
                      setSalvos((atual) => {
                        const proximos = new Set(atual)
                        if (proximos.has(negocio.id)) proximos.delete(negocio.id)
                        else proximos.add(negocio.id)
                        return proximos
                      })
                    }
                  />
                ))}
              </Grade>
            </>
          )}
          {erroMais ? (
            <p role="alert" className="text-sm text-(--destructive)">
              Não foi possível carregar mais negócios. Os anteriores continuam aqui.
            </p>
          ) : null}
          {dados.proximo === null ? null : (
            <Botao tom="contornado" disabled={mais} onClick={() => void carregarMais()}>
              {mais ? "Carregando…" : erroMais ? "Tentar de novo" : "Ver mais negócios"}
            </Botao>
          )}
        </>
      )}
    </section>
  )
}
