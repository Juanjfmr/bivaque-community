"use client"

import { useEffect, useState } from "react"

import { useAvisos as useToast } from "@/components/bivaque/avisos"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { LinhaDeLista, Lista } from "@/components/bivaque/lista"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  type AvisoRecebido,
  destinoEmRota,
  type FiltroDeAvisos,
  type ListaDeAvisos,
  lerAvisos,
  marcarLido,
  marcarTodosLidos,
} from "@/lib/dados/avisos"
import type { NomeDeIcone } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, sessaoVencida } from "@/src/eventos/formulario"

/**
 * Avisos (F09): a caixa da web antiga como página do app, aberta pelo sino da
 * Início.
 *
 * A frase e o destino de cada aviso vêm do servidor — a regra de cada tipo
 * vive num lugar só, e a tela não inventa href. Tocar no aviso marca como lido
 * e abre a jornada certa; quando não há jornada no app, o servidor manda a
 * tela segura (Você).
 */

const ICONE_DO_TIPO: Readonly<Record<string, NomeDeIcone>> = {
  comment: "forum",
  group_admission: "groups",
  group_post: "groups",
  invitation_accepted: "family_restroom",
  event_rsvp: "event",
  event_change: "event",
  event_reminder: "event",
  event_invite: "event",
  direct_message: "chat_bubble",
  recommendation_reply: "forum",
  recommendation_request: "forum",
  service_request: "build",
  listing_alert: "sell",
  report_resolved: "report",
  admission_rejected: "verified_user",
}

const FILTROS: ReadonlyArray<readonly [FiltroDeAvisos, string]> = [
  ["todas", "Todas"],
  ["nao-lidas", "Não lidas"],
]

function quando(iso: string): string {
  const data = new Date(iso)
  if (Number.isNaN(data.getTime())) return ""
  return data.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function Avisos() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const { avisar } = useToast()
  const [dados, setDados] = useState<ListaDeAvisos | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [filtro, setFiltro] = useState<FiltroDeAvisos>("todas")
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const [mexendo, setMexendo] = useState(false)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada e filtro pedem nova leitura
  useEffect(() => {
    const controle = new AbortController()
    setDados(null)
    setErro(null)
    void lerAvisos({ filtro, signal: controle.signal })
      .then((lista) => {
        if (controle.signal.aborted) return
        setDados(lista)
        // O contador da casca é o mesmo número da lista.
        casca.definir({ avisos: lista.naoLidos })
      })
      .catch((falha: unknown) => {
        if (controle.signal.aborted) return
        setErro(sessaoVencida(falha) ? "sessao" : acessoNegado(falha) ? "negado" : "falhou")
      })
    return () => controle.abort()
  }, [rodada, filtro])

  async function mais() {
    if (dados === null || dados.proximo === null || carregandoMais) return
    setCarregandoMais(true)
    setErroMais(false)
    try {
      const pagina = await lerAvisos({ filtro, depois: dados.proximo })
      setDados({
        avisos: [...dados.avisos, ...pagina.avisos],
        proximo: pagina.proximo,
        naoLidos: pagina.naoLidos,
      })
      casca.definir({ avisos: pagina.naoLidos })
    } catch {
      setErroMais(true)
    } finally {
      setCarregandoMais(false)
    }
  }

  async function marcarComoLida(aviso: AvisoRecebido) {
    if (aviso.lida) return
    try {
      await marcarLido(aviso.id)
      const naoLidos = Math.max(0, (dados?.naoLidos ?? 0) - 1)
      setDados((atual) =>
        atual === null
          ? atual
          : {
              ...atual,
              avisos: atual.avisos.map((item) =>
                item.id === aviso.id ? { ...item, lida: true } : item,
              ),
              naoLidos,
            },
      )
      casca.definir({ avisos: naoLidos })
    } catch (falha: unknown) {
      avisar({
        texto:
          falha instanceof FalhaDaApi && falha.mensagem !== null
            ? falha.mensagem
            : "Não foi possível marcar como lida. Tente de novo.",
        tipo: "erro",
      })
    }
  }

  function abrir(aviso: AvisoRecebido) {
    const alvo = destinoEmRota(aviso.destino) ?? destinoEmRota("/app/voce")
    if (alvo === null) return
    void marcarComoLida(aviso)
    void navegacao.irPara(
      alvo.nome,
      alvo.parametros === undefined ? {} : { parametros: alvo.parametros },
    )
  }

  async function marcarTodas() {
    if (mexendo) return
    setMexendo(true)
    try {
      const atualizados = await marcarTodosLidos()
      const naoLidos = Math.max(0, (dados?.naoLidos ?? 0) - atualizados)
      setDados((atual) =>
        atual === null
          ? atual
          : {
              ...atual,
              avisos: atual.avisos.map((item) => ({ ...item, lida: true })),
              naoLidos,
            },
      )
      casca.definir({ avisos: naoLidos })
    } catch {
      avisar({ texto: "Não foi possível marcar todas como lidas. Tente de novo.", tipo: "erro" })
    } finally {
      setMexendo(false)
    }
  }

  const naoLidos = dados?.naoLidos ?? 0
  const avisos = dados?.avisos ?? []

  return (
    <section data-tela="avisos" className="grid gap-2">
      <CabecaDePagina
        titulo="Avisos"
        subtitulo="O que aconteceu enquanto você estava fora."
        acao={
          naoLidos > 0 ? (
            <Botao tom="texto" onClick={() => void marcarTodas()} disabled={mexendo}>
              Marcar todas
            </Botao>
          ) : undefined
        }
      />

      <fieldset aria-label="Filtrar avisos" className="flex min-w-0 gap-2 overflow-x-auto pb-1">
        {FILTROS.map(([chave, rotulo]) => (
          <button
            key={chave}
            type="button"
            aria-pressed={filtro === chave}
            data-filtro={chave}
            className={
              filtro === chave
                ? "min-h-11 shrink-0 rounded-full bg-(--secondary-container) px-4 text-sm font-semibold"
                : "min-h-11 shrink-0 rounded-full border border-(--outline-variant) px-4 text-sm"
            }
            onClick={() => setFiltro(chave)}
          >
            {rotulo}
          </button>
        ))}
      </fieldset>

      {erro === "sessao" ? (
        <EstadoDeSessaoVencida />
      ) : erro === "negado" ? (
        <EstadoNegado texto="Sua conta não tem acesso aos avisos." />
      ) : erro === "falhou" ? (
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : dados === null ? (
        <EsqueletoDeLista linhas={4} />
      ) : avisos.length === 0 ? (
        <EstadoVazio
          titulo={filtro === "todas" ? "Nenhum aviso ainda" : "Nada por ler"}
          texto={
            filtro === "todas"
              ? "Quando alguém responder, confirmar ou comentar algo seu, o aviso chega aqui."
              : "Você já leu tudo o que chegou."
          }
          icone="notifications_none"
        />
      ) : (
        <>
          <Lista>
            {avisos.map((aviso) => (
              <LinhaDeLista
                key={aviso.id}
                icone={ICONE_DO_TIPO[aviso.tipo] ?? "notifications"}
                titulo={aviso.texto}
                subtitulo={quando(aviso.criadaEm)}
                data-aviso-item={aviso.id}
                data-nao-lida={aviso.lida ? "nao" : "sim"}
                aria-label={`${aviso.texto}, ${quando(aviso.criadaEm)}${aviso.lida ? "" : ", não lida"}`}
                onClick={() => abrir(aviso)}
                fim={
                  aviso.lida ? undefined : (
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full bg-(--brasa)"
                    />
                  )
                }
              />
            ))}
          </Lista>
          {dados.proximo === null ? null : (
            <Botao
              tom="texto"
              onClick={() => void mais()}
              disabled={carregandoMais}
              className="justify-self-center"
            >
              {carregandoMais ? "Carregando…" : "Carregar mais"}
            </Botao>
          )}
          {erroMais ? (
            <p role="alert" className="text-sm text-(--destructive)">
              Não foi possível carregar mais avisos. Tente de novo.
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}
