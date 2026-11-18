"use client"

import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Lista } from "@/components/bivaque/lista"
import { desbloquear, lerBloqueados, type PessoaBloqueada } from "@/lib/dados/voce"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { Avatar, Botao as BotaoDaPeca } from "@/src/pecas/pecas"

function quando(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Pessoas bloqueadas (onda 8, F10): a lista real da sessão, com o desfazer em
 * pílula. Desbloquear só tira a linha depois que o servidor confirma; se
 * falhar, a pessoa continua na lista e a tela diz o que houve.
 *
 * Cada linha mostra as iniciais num dos quatro tons da família — a mesma regra
 * do resto do app para quem não tem foto (IDENTIDADE-DAS-PECAS).
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
    <section data-tela="bloqueados" className="grid gap-2 md:mx-auto md:max-w-[720px]">
      <CabecaDePagina titulo="Pessoas bloqueadas" subtitulo="Quem não aparece mais para você." />

      {mensagem === null ? null : (
        <p role="alert" className="text-sm text-(--destructive)">
          {mensagem}
        </p>
      )}

      {erro ? (
        <div
          data-aviso="lista"
          className="flex flex-wrap items-center gap-2 rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)"
        >
          <p role="alert" className="min-w-0 grow text-sm text-(--destructive)">
            Não foi possível carregar a lista agora.
          </p>
          <Botao
            tom="contornado"
            className="shrink-0"
            onClick={() => setRodada((atual) => atual + 1)}
          >
            Tentar de novo
          </Botao>
        </div>
      ) : carregando ? (
        <EsqueletoDeLista linhas={3} />
      ) : linhas.length === 0 ? (
        // O escopo `.pc` traz as variáveis da peça: sem ele o botão da peça
        // perde pílula e borda. A saída do vazio é ação de verdade (revisão
        // às cegas, 5): ardósia preenchida, não o pálido de secundário.
        <div className="pc pc-embutido">
          <EstadoVazio
            titulo="Ninguém bloqueado"
            texto="Quando você bloquear, a pessoa aparece aqui."
            icone="person"
          >
            <BotaoDaPeca data-acao="acao-do-vazio" onClick={() => void navegacao.irPara("voce")}>
              Voltar para Você
            </BotaoDaPeca>
          </EstadoVazio>
        </div>
      ) : (
        <div className="pc pc-embutido">
          <Lista>
            {linhas.map((pessoa) => {
              const nome = pessoa.nome ?? "Pessoa bloqueada"
              return (
                <div
                  key={pessoa.id}
                  data-linha="bloqueado"
                  className="flex min-h-20 flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Avatar nome={nome} tamanho={40} />
                    <span className="grid min-w-0 grow gap-0.5">
                      <b className="truncate text-[15px] font-semibold">{nome}</b>
                      {/* A data inteira numa linha só (revisão às cegas, 4): em
                          375 o botão desce para a linha de baixo em vez de
                          quebrar "Bloqueio desde 03/11/2026" no meio. */}
                      <small className="whitespace-nowrap text-[13px] text-(--on-surface-variant)">
                        {`Bloqueio desde ${quando(pessoa.bloqueadoEm)}`}
                      </small>
                    </span>
                  </span>
                  <BotaoDaPeca
                    tom="contorno"
                    aria-label={`Desbloquear ${nome}`}
                    disabled={removendo !== null}
                    onClick={() => desfazer(pessoa.id)}
                    className="sm:ml-auto"
                  >
                    {removendo === pessoa.id ? "Desbloqueando…" : "Desbloquear"}
                  </BotaoDaPeca>
                </div>
              )
            })}
          </Lista>
        </div>
      )}
    </section>
  )
}
