"use client"

import { useEffect, useRef, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { ChipsDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { Sobreposicao } from "@/components/bivaque/sobreposicao"
import {
  CATEGORIAS_DO_GUIA,
  type CategoriaDoGuia,
  type EntradaDoGuia,
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
import { type Passo, SECOES } from "@/src/guia/secoes"
import { Verbete } from "@/src/guia/Verbete"

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
 * linha no 375. Quem não acha o lugar que precisa tem o caminho de sugestão do
 * Criar na última seção e no estado vazio.
 *
 * A leitura do verbete abre numa folha sobre a lista. A folha é estado local da
 * tela: o Voltar do sistema não a fecha — quem fecha é o botão, o Escape ou o
 * arrasto —, e o histórico do roteador não é empilhado por ela.
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
  const [termo, setTermo] = useState("")
  const [busca, setBusca] = useState("")
  const [categoria, setCategoria] = useState<CategoriaDoGuia | null>(null)
  const [dados, setDados] = useState<GuiaDaCidade | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [aberta, setAberta] = useState<EntradaDoGuia | null>(null)
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

  function abrirVerbete(entrada: EntradaDoGuia) {
    setAberta(entrada)
  }

  function atualizarSalvo(id: string, salvo: boolean) {
    setDados((atual) =>
      atual === null
        ? atual
        : {
            ...atual,
            entradas: atual.entradas.map((entrada) =>
              entrada.id === id ? { ...entrada, salvo } : entrada,
            ),
          },
    )
  }

  /** O caminho real de sugestão de lugar é o Criar: o menu abre com as portas. */
  function sugerirLugar() {
    void navegacao.abrir("menu-criar")
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
                      : "A curadoria publica as referências da cidade por aqui. Você pode sugerir o primeiro lugar."
                  }
                  icone="search_off"
                  acao={
                    filtrando
                      ? {
                          rotulo: "Limpar filtros",
                          aoAcionar: () => {
                            setTermo("")
                            setCategoria(null)
                          },
                        }
                      : { rotulo: "Sugerir um lugar para o Guia", aoAcionar: sugerirLugar }
                  }
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
                            <Icone nome="bookmark" className="size-5 shrink-0 text-(--primary)" />
                          ) : undefined
                        }
                        onClick={() => abrirVerbete(entrada)}
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

          {secao.id === "contribuir" ? (
            <div
              data-guia="contribuicao"
              className="grid gap-3 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
            >
              <CorpoDoGuia>
                Conhece um colégio, hospital, transporte ou despachante que deveria estar aqui? A
                indicação entra no Criar e a curadoria confere antes de publicar.
              </CorpoDoGuia>
              <Botao
                tom="contornado"
                icone="add_business"
                data-acao="sugerir-lugar"
                onClick={sugerirLugar}
                className="justify-self-start"
              >
                Sugerir um lugar para o Guia
              </Botao>
            </div>
          ) : null}
        </SecaoDoGuia>
      ))}

      {aberta === null ? null : (
        // O título é o nome da referência: sem ele a folha não diz o que a
        // pessoa abriu. O verbete carrega o resto pelo id.
        <Sobreposicao
          id="folha"
          titulo={aberta.nome}
          descricao={ROTULO_DA_CATEGORIA[aberta.categoria]}
          aoFechar={() => setAberta(null)}
        >
          <Verbete id={aberta.id} aoMudarSalvo={atualizarSalvo} />
        </Sobreposicao>
      )}
    </section>
  )
}
