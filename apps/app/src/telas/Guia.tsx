"use client"

import { useLocation } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { ChipsDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import {
  CATEGORIAS_DO_GUIA,
  type CategoriaDoGuia,
  type GuiaDaCidade,
  lerGuia,
} from "@/lib/dados/guia"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import {
  acessoNegado,
  foiAbortada,
  ICONE_DA_CATEGORIA,
  mensagemDaFalha,
  ROTULO_DA_CATEGORIA,
  sessaoVencida,
} from "@/src/guia/comum"
import {
  CabecalhoDoGuia,
  CORPO_DO_GUIA,
  CorpoDoGuia,
  SecaoDoGuia,
} from "@/src/guia/EstruturaDoGuia"
import { filtrosDaUrl } from "@/src/guia/filtros-da-url"
import { type Passo, SECOES } from "@/src/guia/secoes"

/**
 * O Guia da cidade, do banco (F08 / ADR-20261105).
 *
 * A tela continua sendo a lista de referências por categoria com busca; o que
 * muda é de onde o dado vem — `lib/dados/guia`, que fala com
 * `/api/app/guia`. Por isso a lista distingue carregando, vazio de verdade,
 * filtro sem resultado, sessão vencida e falha recuperável: banco fora não
 * vira "a cidade não tem guia".
 *
 * A estrutura é editorial: quatro seções com âncora no cabeçalho fixo, e a
 * cidade aparece uma vez só, no cabeçalho — o título é "Guia", que cabe numa
 * linha no 375.
 *
 * A leitura do verbete é uma tela própria (`/app/guia/<id>`): a linha leva pela
 * rota, então a recarga mantém a referência aberta e o Voltar do sistema volta
 * para a lista. O Guia não tem folha nem botão de sugestão de lugar novo —
 * sugerir um lugar está fora do escopo do lançamento.
 *
 * O termo e a categoria também chegam pelo endereço (LAN-TROCA):
 * `/app/guia?q=<termo>&categoria=<cat>` abre a tela já filtrada, e o endereço
 * mantém o recorte depois da materialização da entrada (ROTAS_COM_BUSCA). O
 * `?locality=` do guia antigo não é lido: a lista é sempre a da cidade da sessão.
 */

/** Um passo do roteiro de chegada: leva à rota que resolve, sem prometer nada. */
function PassoDoGuia({ passo }: { passo: Passo }) {
  const navegacao = useNavegacao()
  return (
    <article
      data-guia="passo"
      className="grid gap-2 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
    >
      <h3 className="text-[17px] leading-6">{passo.titulo}</h3>
      {passo.texto === undefined ? null : <CorpoDoGuia>{passo.texto}</CorpoDoGuia>}
      {passo.itens === undefined ? null : (
        <ul data-guia="corpo" className={`list-disc pl-5 ${CORPO_DO_GUIA}`}>
          {passo.itens.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      <Botao
        tom="texto"
        icone={passo.icone}
        onClick={() => void navegacao.irPara(passo.rota)}
        className="justify-self-start"
      >
        {passo.rotulo}
      </Botao>
    </article>
  )
}

export function Guia() {
  const navegacao = useNavegacao()
  // O recorte do link (LAN-TROCA) vale já no primeiro desenho: o termo e a
  // categoria são lidos do endereço na montagem, então o primeiro pedido é o da
  // consulta. A URL é só a porta de entrada; a partir dela quem escreve é a
  // pessoa — digitar e tocar o chip vencem o valor de origem, e o endereço não
  // é reescrito enquanto ela digita.
  const endereco = useLocation({ select: (linha) => linha.search as Record<string, unknown> })
  const origem = filtrosDaUrl(endereco)
  const [termo, setTermo] = useState(origem.termo)
  const [busca, setBusca] = useState(origem.termo)
  const [categoria, setCategoria] = useState<CategoriaDoGuia | null>(origem.categoria)
  const [dados, setDados] = useState<GuiaDaCidade | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroAoCarregarMais, setErroAoCarregarMais] = useState<string | null>(null)
  const montada = useRef(true)
  // Identifica a carga vigente: resposta de um filtro antigo não entra na lista
  // nova quando a pessoa troca a busca enquanto "Ver mais" está no ar.
  const carga = useRef(0)

  useRolagemEFoco(CARGA_CONCLUIDA)

  useEffect(() => {
    montada.current = true
    return () => {
      montada.current = false
    }
  }, [])

  // Digitar não dispara uma requisição por tecla; a pausa é o que consulta.
  useEffect(() => {
    const timer = setTimeout(() => setBusca(termo), 300)
    return () => clearTimeout(timer)
  }, [termo])

  // Depois da chegada, um endereço com outro recorte (o Voltar para outra
  // entrada do Guia) leva o termo e a categoria à tela. Ausente ou inválido não
  // mexe no que a pessoa digitou ou filtrou.
  const enderecoLido = useRef(false)
  useEffect(() => {
    if (!enderecoLido.current) {
      enderecoLido.current = true
      return
    }
    if (origem.termo !== "") {
      setTermo(origem.termo)
      setBusca(origem.termo)
    }
    if (origem.categoria !== null) setCategoria(origem.categoria)
  }, [origem.termo, origem.categoria])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    carga.current += 1
    setDados(null)
    setErro(null)
    void lerGuia({ q: busca, categoria, signal: controle.signal })
      .then((lidos) => {
        if (!controle.signal.aborted) setDados(lidos)
      })
      .catch((falha: unknown) => {
        if (controle.signal.aborted) return
        setErro(sessaoVencida(falha) ? "sessao" : acessoNegado(falha) ? "negado" : "falhou")
      })
    return () => controle.abort()
  }, [busca, categoria, rodada])

  async function carregarMais() {
    if (dados === null || dados.proximo === null || carregandoMais) return
    const cargaDoPedido = carga.current
    setCarregandoMais(true)
    setErroAoCarregarMais(null)
    try {
      const proxima = await lerGuia({ q: busca, categoria, depois: dados.proximo })
      if (cargaDoPedido !== carga.current) return
      setDados({
        entradas: [...dados.entradas, ...proxima.entradas],
        proximo: proxima.proximo,
        cidade: proxima.cidade || dados.cidade,
      })
    } catch (falha: unknown) {
      if (cargaDoPedido === carga.current && !foiAbortada(falha)) {
        setErroAoCarregarMais(mensagemDaFalha(falha, "Não foi possível carregar mais referências."))
      }
    } finally {
      if (montada.current) setCarregandoMais(false)
    }
  }

  const filtros = [
    { id: "todas", rotulo: "Todas" },
    ...CATEGORIAS_DO_GUIA.map((id) => ({ id, rotulo: ROTULO_DA_CATEGORIA[id] })),
  ]
  const carregando = dados === null && erro === null
  const filtrando = busca.trim() !== "" || categoria !== null
  const cidade = dados?.cidade ?? ""

  return (
    <section data-tela="guia" className="grid gap-7 pb-6">
      <CabecalhoDoGuia cidade={cidade} />

      {SECOES.map((secao) => (
        <SecaoDoGuia key={secao.id} id={secao.id} titulo={secao.titulo}>
          {secao.passos.map((passo) => (
            <PassoDoGuia key={passo.titulo} passo={passo} />
          ))}

          {secao.id === "referencias" ? (
            <>
              <CorpoDoGuia>
                O que a curadoria e a comunidade já indicaram na cidade. Busque pelo nome ou filtre
                por categoria.
              </CorpoDoGuia>
              <Campo
                id="busca-no-guia"
                rotulo="Buscar no guia"
                valor={termo}
                aoMudar={setTermo}
                placeholder="Colégio, hospital, transportadora…"
              />
              <ChipsDeFiltro
                itens={filtros}
                valor={categoria ?? "todas"}
                aoEscolher={(id) => setCategoria(id === "todas" ? null : (id as CategoriaDoGuia))}
                rotulo="Filtrar por categoria"
              />
              {erro === "sessao" ? (
                <EstadoDeSessaoVencida />
              ) : erro === "negado" ? (
                <EstadoNegado texto="O guia é de quem mora na cidade." />
              ) : erro === "falhou" ? (
                <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
              ) : carregando ? (
                <EsqueletoDeLista linhas={5} />
              ) : dados !== null && dados.entradas.length === 0 ? (
                <EstadoVazio
                  titulo={filtrando ? "Nada com esse filtro" : "O guia ainda está sendo montado"}
                  texto={
                    filtrando
                      ? "Tente outro termo ou veja todas as categorias."
                      : "A curadoria publica as referências da cidade por aqui. As primeiras chegam assim que forem conferidas."
                  }
                  icone="search_off"
                  {...(filtrando
                    ? {
                        acao: {
                          rotulo: "Limpar filtros",
                          aoAcionar: () => {
                            setTermo("")
                            setCategoria(null)
                          },
                        },
                      }
                    : {})}
                />
              ) : dados === null ? null : (
                <>
                  <Lista>
                    {dados.entradas.map((entrada) => (
                      <LinhaDeLista
                        key={entrada.id}
                        icone={ICONE_DA_CATEGORIA[entrada.categoria]}
                        titulo={entrada.nome}
                        subtitulo={entrada.descricao}
                        fim={
                          entrada.salvo ? (
                            <Icone
                              nome="bookmark"
                              preenchido
                              className="size-5 shrink-0 text-(--primary)"
                            />
                          ) : undefined
                        }
                        onClick={() =>
                          void navegacao.irPara("verbete", { parametros: { id: entrada.id } })
                        }
                      />
                    ))}
                  </Lista>
                  {erroAoCarregarMais === null ? null : (
                    <p role="alert" className="text-sm text-(--destructive)">
                      {erroAoCarregarMais}
                    </p>
                  )}
                  {dados.proximo === null ? null : (
                    <Botao
                      tom="contornado"
                      disabled={carregandoMais}
                      onClick={() => void carregarMais()}
                      className="justify-self-center"
                    >
                      {carregandoMais ? "Carregando…" : "Ver mais referências"}
                    </Botao>
                  )}
                </>
              )}
            </>
          ) : null}
        </SecaoDoGuia>
      ))}
    </section>
  )
}
