"use client"

import { useEffect, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { desbloquear, lerBloqueados, type PessoaBloqueada } from "@/lib/dados/voce"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"

function quando(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Pessoas bloqueadas (onda 8, F10): a lista real da sessão, com o desfazer.
 * Desbloquear só tira a linha depois que o servidor confirma; se falhar, a
 * pessoa continua na lista e a tela diz o que houve.
 */
export function Bloqueados() {
  const navegacao = useNavegacao()
  const [lista, setLista] = useState<readonly PessoaBloqueada[] | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [removendo, setRemovendo] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setLista(null)
    setErro(false)
    void lerBloqueados({ signal: controle.signal })
      .then((lidas) => {
        if (!controle.signal.aborted) setLista(lidas)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [rodada])

  const desfazer = (id: string) => {
    setRemovendo(id)
    setMensagem(null)
    void desbloquear(id)
      .then(() => setLista((atual) => atual?.filter((pessoa) => pessoa.id !== id) ?? atual))
      .catch(() => setMensagem("Não foi possível desbloquear agora. Tente de novo."))
      .finally(() => setRemovendo(null))
  }

  const carregando = lista === null && !erro
  const linhas = lista ?? []

  return (
    <section data-tela="bloqueados" className="grid gap-2">
      <CabecaDePagina titulo="Pessoas bloqueadas" subtitulo="Quem não aparece mais para você." />

      {mensagem === null ? null : (
        <p role="alert" className="text-sm text-(--destructive)">
          {mensagem}
        </p>
      )}

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={3} />
      ) : linhas.length === 0 ? (
        <EstadoVazio
          titulo="Ninguém bloqueado"
          texto="Bloquear esconde o que a pessoa publicou e fecha a conversa com ela, sem avisá-la. Você desfaz quando quiser."
          icone="person"
          acao={{
            rotulo: "Voltar para Você",
            aoAcionar: () => void navegacao.irPara("voce"),
          }}
        />
      ) : (
        <Lista>
          {linhas.map((pessoa) => (
            <LinhaDeLista
              key={pessoa.id}
              icone="person"
              titulo={pessoa.nome ?? "Pessoa bloqueada"}
              subtitulo={`Bloqueado em ${quando(pessoa.bloqueadoEm)}`}
              fim={
                <span className="text-sm font-semibold text-(--primary)">
                  {removendo === pessoa.id ? "Desbloqueando…" : "Desbloquear"}
                </span>
              }
              disabled={removendo !== null}
              onClick={() => desfazer(pessoa.id)}
            />
          ))}
        </Lista>
      )}
    </section>
  )
}
