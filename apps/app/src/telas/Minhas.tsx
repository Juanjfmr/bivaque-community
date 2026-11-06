"use client"

import { useEffect, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { LinhaDePergunta } from "@/components/bivaque/linha-de-pergunta"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { Secao } from "@/components/bivaque/secao"
import { lerPublicacoes, type PublicacoesDaPessoa } from "@/lib/dados/voce"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"

/**
 * Minhas indicações e publicações (onda 3, F10): o que a pessoa perguntou e o
 * que publicou na comunidade, lido da conta (`/api/app/voce/publicacoes`) e não
 * mais da demonstração. O desenho é o aprovado; a seção de publicações é a
 * parte da jornada que faltava na fonte.
 */
export function Minhas() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<PublicacoesDaPessoa | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(false)
    void lerPublicacoes({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setDados(lidas)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [rodada])

  const carregando = dados === null && !erro
  const publicacoes = dados?.publicacoes ?? []
  const perguntas = dados?.perguntas ?? []
  const vazio = dados !== null && publicacoes.length === 0 && perguntas.length === 0

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
      ) : vazio ? (
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
        <div className="grid gap-3">
          {publicacoes.length === 0 ? null : (
            <Secao titulo="Suas publicações">
              <Lista>
                {publicacoes.map((publicacao) => (
                  <LinhaDeLista
                    key={publicacao.id}
                    icone="chat_bubble"
                    titulo={publicacao.texto}
                    subtitulo={publicacao.grupo ?? "Comunidade"}
                    onClick={() =>
                      void navegacao.irPara("publicacao", {
                        parametros: { id: publicacao.id },
                      })
                    }
                  />
                ))}
              </Lista>
            </Secao>
          )}

          {perguntas.length === 0 ? null : (
            <div className="grid gap-2">
              {perguntas.map((pergunta) => (
                <LinhaDePergunta
                  key={pergunta.id}
                  pergunta={{
                    id: pergunta.id,
                    pergunta: pergunta.titulo,
                    autor: "Você",
                    propria: true,
                    tópico: "",
                    cidade: casca.cidade,
                    respostas: pergunta.respostas,
                    resolvida: pergunta.resolvida,
                  }}
                  onClick={() =>
                    void navegacao.irPara("pergunta", { parametros: { id: pergunta.id } })
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
