"use client"

import { useEffect, useRef, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
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
  type GuiaDaCidade,
  lerGuia,
} from "@/lib/dados/guia"
import { useRolagemEFoco, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
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
 * A leitura do verbete abre numa folha da entrada de navegação, então o Voltar
 * do sistema fecha a folha antes de sair da tela.
 */
export function Guia() {
  const folha = useSobreposicaoDaEntrada("folha")
  const [termo, setTermo] = useState("")
  const [busca, setBusca] = useState("")
  const [categoria, setCategoria] = useState<CategoriaDoGuia | null>(null)
  const [dados, setDados] = useState<GuiaDaCidade | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [aberta, setAberta] = useState<string | null>(null)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroAoCarregarMais, setErroAoCarregarMais] = useState<string | null>(null)
  const montada = useRef(true)

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
    setCarregandoMais(true)
    setErroAoCarregarMais(null)
    try {
      const proxima = await lerGuia({ q: busca, categoria, depois: dados.proximo })
      setDados({
        entradas: [...dados.entradas, ...proxima.entradas],
        proximo: proxima.proximo,
        cidade: proxima.cidade || dados.cidade,
      })
    } catch (falha: unknown) {
      if (!foiAbortada(falha)) {
        setErroAoCarregarMais(mensagemDaFalha(falha, "Não foi possível carregar mais referências."))
      }
    } finally {
      if (montada.current) setCarregandoMais(false)
    }
  }

  function abrirVerbete(id: string) {
    setAberta(id)
    folha.aoMudarAberto(true)
  }

  function fecharVerbete() {
    folha.aoMudarAberto(false)
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

  const filtros = [
    { id: "todas", rotulo: "Todas" },
    ...CATEGORIAS_DO_GUIA.map((id) => ({ id, rotulo: ROTULO_DA_CATEGORIA[id] })),
  ]
  const carregando = dados === null && erro === null
  const filtrando = busca.trim() !== "" || categoria !== null
  const cidade = dados?.cidade ?? ""

  return (
    <section data-tela="guia" className="grid gap-2">
      <CabecaDePagina
        titulo={cidade === "" ? "Guia da cidade" : `Guia de ${cidade}`}
        subtitulo="Referências para chegar, se organizar e viver melhor na cidade."
      />

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
              : "A curadoria publica as referências da cidade por aqui."
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
                    <Icone nome="bookmark" className="size-5 shrink-0 text-(--primary)" />
                  ) : undefined
                }
                onClick={() => abrirVerbete(entrada.id)}
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

      {folha.aberto && aberta !== null ? (
        <Sobreposicao id="folha" titulo="Referência do guia" aoFechar={fecharVerbete}>
          <Verbete id={aberta} aoMudarSalvo={atualizarSalvo} />
        </Sobreposicao>
      ) : null}
    </section>
  )
}
