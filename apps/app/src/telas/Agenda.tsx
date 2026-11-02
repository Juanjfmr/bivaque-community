"use client"

import { useEffect, useMemo, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { texto } from "@/src/telas/comum"

/**
 * A Agenda da cidade da onda 4 (protótipo: features/events/views.js), com os
 * encontros futuros agrupados por dia. Filtro por público e "Criar encontro"
 * ficam para o refino.
 */
export function Agenda() {
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

  const dias = useMemo(() => {
    if (dados === null) return []
    const inicioDeHoje = new Date()
    inicioDeHoje.setHours(0, 0, 0, 0)
    const futuros = dados.eventos
      .map((evento) => ({
        evento,
        quando:
          typeof evento.starts_at === "string" ? new Date(evento.starts_at).getTime() : Number.NaN,
      }))
      .filter(({ quando }) => Number.isFinite(quando) && quando >= inicioDeHoje.getTime())
      .sort((a, b) => a.quando - b.quando)
    const agrupados: { chave: string; itens: (typeof futuros)[number][] }[] = []
    for (const item of futuros) {
      const data = new Date(item.quando)
      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`
      const ultimo = agrupados[agrupados.length - 1]
      if (ultimo?.chave === chave) ultimo.itens.push(item)
      else agrupados.push({ chave, itens: [item] })
    }
    return agrupados
  }, [dados])

  const carregando = dados === null && !erro

  return (
    <section data-tela="agenda" className="grid gap-2">
      <CabecaDePagina
        titulo="Agenda da cidade"
        subtitulo={`Encontros da comunidade de ${casca.cidade}.`}
      />

      {erro ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={4} />
      ) : dias.length === 0 ? (
        <EstadoVazio
          titulo="Nenhum encontro agendado"
          texto="Os próximos encontros aparecerão aqui."
          icone="event"
        />
      ) : (
        dias.map((dia) => (
          <section key={dia.chave} className="grid gap-2">
            <h2 className="px-1 text-[15px] font-semibold">{rotuloDoDia(dia.chave)}</h2>
            <Lista>
              {dia.itens.map(({ evento, quando }) => (
                <LinhaDeLista
                  key={evento.id}
                  icone="event"
                  titulo={evento.title}
                  subtitulo={subtituloDoEncontro(quando, texto(evento.venue))}
                  onClick={() => void navegacao.irPara("evento", { parametros: { id: evento.id } })}
                />
              ))}
            </Lista>
          </section>
        ))
      )}
    </section>
  )
}

function chaveLocal(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`
}

function rotuloDoDia(chave: string): string {
  const hoje = new Date()
  const amanha = new Date(hoje.getTime() + 86_400_000)
  if (chave === chaveLocal(hoje)) return "Hoje"
  if (chave === chaveLocal(amanha)) return "Amanhã"
  const data = new Date(`${chave}T12:00:00`)
  const extenso = data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
  return extenso.charAt(0).toUpperCase() + extenso.slice(1)
}

function subtituloDoEncontro(quando: number, local: string): string {
  const data = new Date(quando)
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  return local === "" ? hora : `${hora} · ${local}`
}
