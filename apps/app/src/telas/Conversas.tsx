"use client"

import { useEffect, useMemo, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { LinhaDeLista } from "@/components/bivaque/lista"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { registro, texto } from "@/src/telas/comum"

/**
 * Conversas da onda 7 (protótipo: features/messaging/views.js, renderThreads),
 * com dados de demonstração.
 */
export function Conversas() {
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

  const conversas = useMemo(() => {
    if (dados === null) return []
    return dados.conversas.map((conversa) => ({
      conversa,
      apresentacao: registro(conversa.apresentacao),
      ultima: ultimaMensagem(dados, conversa.id),
    }))
  }, [dados])

  const carregando = dados === null && !erro

  return (
    <section data-tela="conversas" className="grid gap-2">
      <CabecaDePagina
        titulo="Conversas"
        subtitulo="Contatos sobre anúncios e serviços da cidade."
      />

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={3} />
      ) : conversas.length === 0 ? (
        <EstadoVazio
          titulo="Nenhuma conversa ainda"
          texto="Abra um anúncio ou negócio e toque em “Tenho interesse” ou “Pedir orçamento”."
          icone="chat_bubble"
          acao={{
            rotulo: "Explorar a cidade",
            aoAcionar: () => void navegacao.irPara("inicio"),
          }}
        />
      ) : (
        <div className="grid gap-2">
          {conversas.map(({ conversa, apresentacao, ultima }) => (
            <LinhaDeLista
              key={conversa.id}
              icone="chat_bubble"
              titulo={texto(apresentacao["who"], "Conversa")}
              subtitulo={ultima === "" ? "Comece a conversa" : ultima}
              onClick={() => void navegacao.irPara("conversa", { parametros: { id: conversa.id } })}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function ultimaMensagem(dados: DadosDaCidade, id: string): string {
  const mensagens = dados.mensagens.filter((item) => item.conversation_id === id)
  const ultima = mensagens[mensagens.length - 1]
  return ultima === undefined ? "" : ultima.content
}
