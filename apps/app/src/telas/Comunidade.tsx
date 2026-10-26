"use client"

import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeNegocio } from "@/components/bivaque/cartao-de-anuncio"
import { ChipsDeFiltro, type ItemDeFiltro } from "@/components/bivaque/chips-de-filtro"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { Icone } from "@/components/bivaque/icone"
import { LinhaDePergunta } from "@/components/bivaque/linha-de-pergunta"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { contagemDeRespostas, numero, registro, texto } from "@/src/telas/comum"

/**
 * A Comunidade da onda 3 (protótipo: features/community/views.js), com dados
 * de demonstração.
 *
 * V1: abas Indicações, Grupos e Negócios; filtros Para ajudar, Resolvidas e
 * Minhas; contagem de resolvidas; lista de perguntas e negócios. Ficam para o
 * refino: abas com indicador deslizante, botão "Perguntar", paginação e o
 * bloco de quem está esperando resposta.
 */

const ABAS: readonly ItemDeFiltro[] = [
  { id: "ind", rotulo: "Indicações" },
  { id: "grp", rotulo: "Grupos" },
  { id: "biz", rotulo: "Negócios" },
]

const FILTROS: readonly ItemDeFiltro[] = [
  { id: "help", rotulo: "Para ajudar" },
  { id: "ok", rotulo: "Resolvidas" },
  { id: "mine", rotulo: "Minhas" },
]

export function Comunidade() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [aba, setAba] = useState("ind")
  const [filtro, setFiltro] = useState("help")

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

  const respostas = useMemo(() => contagemDeRespostas(dados), [dados])

  const perguntas = useMemo(() => {
    if (dados === null) return []
    return dados.perguntas
      .map((pergunta) => ({ pergunta, apresentacao: registro(pergunta.apresentacao) }))
      .filter(({ pergunta, apresentacao }) => {
        const minha = apresentacao["mine"] === true
        if (filtro === "mine") return minha
        if (filtro === "ok") return pergunta.is_resolved === true
        return pergunta.is_resolved !== true && !minha
      })
      .sort((a, b) => (respostas.get(a.pergunta.id) ?? 0) - (respostas.get(b.pergunta.id) ?? 0))
  }, [dados, filtro, respostas])

  const resolvidas = useMemo(() => {
    if (dados === null) return 0
    return dados.perguntas.filter((pergunta) => pergunta.is_resolved === true).length
  }, [dados])

  const negocios = useMemo(() => {
    if (dados === null) return []
    return dados.negocios
      .map((negocio) => ({ negocio, apresentacao: registro(negocio.apresentacao) }))
      .sort((a, b) => numero(b.apresentacao["recN"]) - numero(a.apresentacao["recN"]))
  }, [dados])

  const grupos = useMemo(() => {
    if (dados === null) return []
    return dados.grupos.map((grupo) => ({ grupo, apresentacao: registro(grupo.apresentacao) }))
  }, [dados])

  const carregando = dados === null && !erro

  return (
    <section data-tela="comunidade" className="grid gap-2">
      <CabecaDePagina
        titulo="Comunidade"
        subtitulo="O que a comunidade sabe fica disponível para quem chegar depois."
      />

      <ChipsDeFiltro itens={ABAS} valor={aba} aoEscolher={setAba} rotulo="Seções da Comunidade" />

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={4} />
      ) : aba === "ind" ? (
        <>
          <div className="flex items-center gap-3 rounded-2xl bg-(--secondary-container) px-4 py-3">
            <Icone nome="history_edu" className="size-6 shrink-0 text-(--primary)" />
            <span className="grid gap-0.5">
              <b className="text-[15px]">{resolvidas} indicações resolvidas</b>
              <small className="text-(--on-surface-variant)">
                Busque uma resposta antes de perguntar.
              </small>
            </span>
          </div>

          {filtro === "help" && perguntas.length > 0 ? (
            <p className="flex items-center gap-2 text-sm text-(--on-surface-variant)">
              <Icone nome="volunteer_activism" className="size-5" />
              Perguntas sem resposta aparecem primeiro. Responder leva um minuto.
            </p>
          ) : null}

          <ChipsDeFiltro
            itens={FILTROS}
            valor={filtro}
            aoEscolher={setFiltro}
            rotulo="Filtrar perguntas"
          />

          {perguntas.length === 0 ? (
            <EstadoVazio
              titulo={
                filtro === "help" ? "Ninguém esperando resposta" : "Nenhuma pergunta por aqui"
              }
              texto="Você pode buscar uma indicação ou iniciar uma nova pergunta."
              icone="forum"
              acao={{
                rotulo: "Pedir indicação",
                aoAcionar: () => void navegacao.irPara("comunidade"),
              }}
            />
          ) : (
            <div className="grid gap-2">
              {perguntas.map(({ pergunta, apresentacao }) => (
                <LinhaDePergunta
                  key={pergunta.id}
                  pergunta={{
                    id: pergunta.id,
                    pergunta: texto(apresentacao["q"], pergunta.title),
                    autor: texto(apresentacao["who"], "Alguém da cidade"),
                    propria: apresentacao["mine"] === true,
                    tópico: texto(apresentacao["topic"], ""),
                    cidade: casca.cidade,
                    respostas: respostas.get(pergunta.id) ?? 0,
                    resolvida: pergunta.is_resolved === true,
                  }}
                  onClick={() =>
                    void navegacao.irPara("pergunta", { parametros: { id: pergunta.id } })
                  }
                />
              ))}
            </div>
          )}
        </>
      ) : aba === "grp" ? (
        grupos.length === 0 ? (
          <EstadoVazio
            titulo="Ainda sem grupos nesta cidade"
            texto="Grupos reúnem quem tem a mesma rotina, o mesmo ciclo ou o mesmo interesse."
            icone="group"
          />
        ) : (
          <div className="grid gap-2">
            {grupos.map(({ grupo, apresentacao }) => (
              <LinhaDeLista
                key={grupo.id}
                icone="group"
                titulo={texto(apresentacao["t"], grupo.name)}
                subtitulo={`${numero(apresentacao["members"])} membros`}
                onClick={() => void navegacao.irPara("grupo", { parametros: { id: grupo.id } })}
              />
            ))}
          </div>
        )
      ) : negocios.length === 0 ? (
        <EstadoVazio
          titulo="Ainda sem negócios cadastrados"
          texto="As indicações da comunidade ajudarão a formar o guia de serviços."
          icone="storefront"
        />
      ) : (
        <Secao
          acoes={
            <Botao tom="texto" onClick={() => void navegacao.irPara("negocios")}>
              Ver todos os negócios
            </Botao>
          }
        >
          <Grade formato="cartoes">
            {negocios.map(({ negocio, apresentacao }) => (
              <CartaoDeNegocio
                key={negocio.id}
                negocio={{
                  id: negocio.id,
                  nome: texto(apresentacao["name"], negocio.display_name),
                  categoria: texto(apresentacao["cat"], negocio.category ?? ""),
                  cidade: casca.cidade,
                  indicacoes: numero(apresentacao["recN"]),
                  patrocinado: apresentacao["spon"] === true,
                  aguardando: apresentacao["claimed"] === false,
                }}
                aoAbrir={() => void navegacao.irPara("negocio", { parametros: { id: negocio.id } })}
              />
            ))}
          </Grade>
        </Secao>
      )}
    </section>
  )
}
