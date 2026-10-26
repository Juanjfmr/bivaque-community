"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import { Secao } from "@/components/bivaque/secao"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { useCasca } from "@/src/contexto/casca"
import { numero, registro, texto } from "@/src/telas/comum"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * O encontro da onda 4 (protótipo: features/events/views.js, renderEvent).
 * Confirmar presença é estado local nesta sessão. Editar e cancelar ficam para
 * o refino (editor de evento).
 */
export function Evento() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [confirmado, setConfirmado] = useState(false)

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

  const validacao = validarParametros("evento", { id })
  const evento = useMemo(
    () => (dados === null ? null : (dados.eventos.find((item) => item.id === id) ?? null)),
    [dados, id],
  )

  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro) {
    return (
      <section data-tela="evento" className="grid gap-2">
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }

  if (dados === null) {
    return (
      <section data-tela="evento" className="grid gap-2">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  }

  if (evento === null) return <TelaIndisponivel />

  const apresentacao = registro(evento.apresentacao)
  const confirmados = numero(apresentacao["going"]) + (confirmado ? 1 : 0)
  const vagas = numero(apresentacao["max"])
  const quando = typeof evento.starts_at === "string" ? new Date(evento.starts_at) : null
  const rotulo = quando === null ? "" : rotuloDeDataHora(quando)

  return (
    <section data-tela="evento" className="grid gap-2">
      <div className="grid gap-2 px-1">
        <Etiqueta tom="neutro" icone="event">
          Encontro da comunidade
        </Etiqueta>
        <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1} className="text-[24px] leading-8">
          {evento.title}
        </h1>
        <p className="text-sm text-(--on-surface-variant)">{rotulo}</p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)">
        <Icone nome="location_on" className="size-6 shrink-0 text-(--primary)" />
        <span className="grid gap-0.5">
          <b className="text-[15px]">{texto(evento.venue, "Local a confirmar")}</b>
          <small className="text-(--on-surface-variant)">{casca.cidade}</small>
        </span>
      </div>

      {evento.description === null || evento.description === "" ? null : (
        <Secao titulo="Sobre o encontro">
          <p className="text-[15px] leading-6">{evento.description}</p>
        </Secao>
      )}

      <Secao titulo="Presença">
        <div className="grid grid-cols-3 gap-2">
          <Fato valor={String(confirmados)} rotulo="confirmados" />
          <Fato
            valor={vagas === 0 ? "Livre" : String(vagas)}
            rotulo={vagas === 0 ? "participação" : "vagas totais"}
          />
          <Fato valor={confirmado ? "Sim" : "—"} rotulo="sua presença" />
        </div>
        <div className="flex justify-end">
          <Botao
            tom={confirmado ? "tonal" : "preenchido"}
            icone={confirmado ? "check" : "event_available"}
            aria-pressed={confirmado}
            onClick={() => setConfirmado((atual) => !atual)}
          >
            {confirmado ? "Presença confirmada" : "Confirmar presença"}
          </Botao>
        </div>
      </Secao>
    </section>
  )
}

function Fato({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="grid justify-items-center gap-0.5 rounded-2xl bg-(--surface-lowest) px-3 py-4 ring-1 ring-(--outline-variant)">
      <b className="text-[20px]">{valor}</b>
      <small className="text-center text-[12px] text-(--on-surface-variant)">{rotulo}</small>
    </div>
  )
}

function rotuloDeDataHora(data: Date): string {
  const dia = data.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })
  const hora = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  const comMaiuscula = dia.charAt(0).toUpperCase() + dia.slice(1)
  return `${comMaiuscula} · ${hora}`
}
