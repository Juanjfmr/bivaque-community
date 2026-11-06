"use client"

import { useEffect, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { desocultar, type ItemOcultado, lerOcultados } from "@/lib/dados/voce"
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
 * Ocultados (onda 8, F10): a lista real do que a sessão ocultou, com o
 * desfazer. Mesma regra do bloqueio: só sai da lista depois da confirmação do
 * servidor; falhou, continua visível e a tela diz o que houve.
 */
export function Ocultados() {
  const navegacao = useNavegacao()
  const [lista, setLista] = useState<readonly ItemOcultado[] | null>(null)
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
    void lerOcultados({ signal: controle.signal })
      .then((lidos) => {
        if (!controle.signal.aborted) setLista(lidos)
      })
      .catch(() => {
        if (!controle.signal.aborted) setErro(true)
      })
    return () => controle.abort()
  }, [rodada])

  const desfazer = (id: string) => {
    setRemovendo(id)
    setMensagem(null)
    void desocultar(id)
      .then(() => setLista((atual) => atual?.filter((item) => item.id !== id) ?? atual))
      .catch(() => setMensagem("Não foi possível mostrar de novo agora. Tente de novo."))
      .finally(() => setRemovendo(null))
  }

  const carregando = lista === null && !erro
  const linhas = lista ?? []

  return (
    <section data-tela="ocultados" className="grid gap-2">
      <CabecaDePagina
        titulo="Ocultados"
        subtitulo="O que você ocultou das suas listas — só você vê isto."
      />

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
          titulo="Nada oculto por aqui"
          texto="Ocultar tira o item das suas listas sem avisar ninguém, e você pode mostrar de novo quando quiser."
          icone="visibility_off"
          acao={{
            rotulo: "Ver perguntas da comunidade",
            aoAcionar: () => void navegacao.irPara("comunidade"),
          }}
        />
      ) : (
        <Lista>
          {linhas.map((item) => (
            <LinhaDeLista
              key={item.id}
              icone="visibility_off"
              titulo={item.titulo}
              subtitulo={`Ocultado em ${quando(item.ocultadoEm)}`}
              fim={
                <span className="text-sm font-semibold text-(--primary)">
                  {removendo === item.id ? "Mostrando…" : "Mostrar de novo"}
                </span>
              }
              disabled={removendo !== null}
              onClick={() => desfazer(item.id)}
            />
          ))}
        </Lista>
      )}
    </section>
  )
}
