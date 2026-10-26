"use client"

import { useEffect, useMemo, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { LinhaDePergunta } from "@/components/bivaque/linha-de-pergunta"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { contagemDeRespostas, registro, texto } from "@/src/telas/comum"

/**
 * Minhas indicações (onda 3): as perguntas que a pessoa fez, com o estado de
 * cada uma. V1 das respostas que a pessoa escreveu fica para o refino.
 */
export function Minhas() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)

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
  const minhas = useMemo(() => {
    if (dados === null) return []
    return dados.perguntas
      .map((pergunta) => ({ pergunta, apresentacao: registro(pergunta.apresentacao) }))
      .filter(({ apresentacao }) => apresentacao["mine"] === true)
  }, [dados])

  const carregando = dados === null && !erro

  return (
    <section data-tela="minhas" className="grid gap-2">
      <CabecaDePagina
        titulo="Minhas indicações"
        subtitulo="As perguntas que você fez e o que a comunidade respondeu."
      />

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={3} />
      ) : minhas.length === 0 ? (
        <EstadoVazio
          titulo="Você ainda não perguntou nada"
          texto="Peça uma indicação à comunidade — quem já passou por isso costuma responder rápido."
          icone="forum"
          acao={{
            rotulo: "Ir para a Comunidade",
            aoAcionar: () => void navegacao.irPara("comunidade"),
          }}
        />
      ) : (
        <div className="grid gap-2">
          {minhas.map(({ pergunta, apresentacao }) => (
            <LinhaDePergunta
              key={pergunta.id}
              pergunta={{
                id: pergunta.id,
                pergunta: texto(apresentacao["q"], pergunta.title),
                autor: "Você",
                propria: true,
                tópico: texto(apresentacao["topic"], ""),
                cidade: casca.cidade,
                respostas: respostas.get(pergunta.id) ?? 0,
                resolvida: pergunta.is_resolved === true,
              }}
              onClick={() => void navegacao.irPara("pergunta", { parametros: { id: pergunta.id } })}
            />
          ))}
        </div>
      )}
    </section>
  )
}
