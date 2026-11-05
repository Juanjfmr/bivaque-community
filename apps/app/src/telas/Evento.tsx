"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import { Secao } from "@/components/bivaque/secao"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  buscarEncontro,
  cancelarPresenca,
  type Encontro,
  marcarPresenca,
  type PresencaDoEncontro,
  perguntarAoOrganizador,
} from "@/lib/dados/eventos"
import { useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { useCasca } from "@/src/contexto/casca"
import { FormularioDeEncontro } from "@/src/eventos/FormularioDeEncontro"
import { mensagemDaFalha } from "@/src/eventos/formulario"
import { texto } from "@/src/telas/comum"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * O encontro, agora do banco (F05 / ADR-20261105).
 *
 * Presença e pergunta mostram o que ficou gravado, não um otimismo local: a tela
 * espera a resposta do servidor para mudar, e quando a escrita falha o estado
 * anterior continua na tela com a mensagem do que aconteceu. Um "vou" que não
 * gravou e some no recarregamento seria a mentira mais cara desta tela.
 */
export function Evento() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()

  const [encontro, setEncontro] = useState<Encontro | null>(null)
  const [erro, setErro] = useState<"falhou" | "nao-encontrado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)

  const [pergunta, setPergunta] = useState("")
  const [perguntaEnviada, setPerguntaEnviada] = useState(false)
  const [erroDaPergunta, setErroDaPergunta] = useState<string | null>(null)
  const [enviandoPergunta, setEnviandoPergunta] = useState(false)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setEncontro(null)
    setErro(null)
    void buscarEncontro(id, { signal: controle.signal })
      .then((lido) => {
        if (!controle.signal.aborted) setEncontro(lido)
      })
      .catch((falha: unknown) => {
        if (controle.signal.aborted) return
        setErro(
          falha instanceof FalhaDaApi && falha.codigo === "nao-encontrado"
            ? "nao-encontrado"
            : "falhou",
        )
      })
    return () => controle.abort()
  }, [id, rodada])

  const validacao = validarParametros("evento", { id })
  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro === "nao-encontrado") return <TelaIndisponivel />

  if (erro === "falhou") {
    return (
      <section data-tela="evento" className="grid gap-2">
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }

  if (encontro === null) {
    return (
      <section data-tela="evento" className="grid gap-2">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  }

  const quando = new Date(encontro.comecaEm)
  const rotuloDaData = Number.isNaN(quando.getTime()) ? "" : rotuloDeDataHora(quando)
  const cancelado = encontro.situacao === "cancelled"

  async function mudarPresenca(situacao: PresencaDoEncontro | null) {
    if (encontro === null || ocupado) return
    setOcupado(true)
    setAviso(null)
    try {
      const presenca =
        situacao === null
          ? await cancelarPresenca(encontro.id)
          : await marcarPresenca(encontro.id, situacao)
      setEncontro({ ...encontro, presenca })
    } catch (falha: unknown) {
      // Nada mudou na tela: o estado anterior continua sendo o que o banco tem.
      setAviso(mensagemDaFalha(falha))
    } finally {
      setOcupado(false)
    }
  }

  async function enviarPergunta(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (encontro === null || enviandoPergunta) return
    setEnviandoPergunta(true)
    setErroDaPergunta(null)
    try {
      await perguntarAoOrganizador(encontro.id, pergunta)
      setPergunta("")
      setPerguntaEnviada(true)
    } catch (falha: unknown) {
      // O texto continua no campo: é o que a pessoa escreveu.
      setErroDaPergunta(mensagemDaFalha(falha))
    } finally {
      setEnviandoPergunta(false)
    }
  }

  return (
    <section data-tela="evento" className="grid gap-2">
      <div className="grid gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2">
          <Etiqueta tom={cancelado ? "aviso" : "neutro"} icone="event">
            {cancelado ? "Encontro cancelado" : "Encontro da comunidade"}
          </Etiqueta>
          {encontro.souOrganizador ? (
            <Botao tom="texto" icone="edit" className="ml-auto" onClick={() => setEditando(true)}>
              Editar
            </Botao>
          ) : null}
        </div>
        <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1} className="text-[24px] leading-8">
          {encontro.titulo}
        </h1>
        <p className="text-sm text-(--on-surface-variant)">{rotuloDaData}</p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)">
        <Icone nome="location_on" className="size-6 shrink-0 text-(--primary)" />
        <span className="grid gap-0.5">
          <b className="text-[15px]">{texto(encontro.local, "Local a confirmar")}</b>
          <small className="text-(--on-surface-variant)">{casca.cidade}</small>
        </span>
      </div>

      {encontro.descricao === null ? null : (
        <Secao titulo="Sobre o encontro">
          <p className="text-[15px] leading-6">{encontro.descricao}</p>
        </Secao>
      )}

      <Secao titulo="Presença">
        <div className="grid grid-cols-3 gap-2">
          <Fato valor={String(encontro.presenca.confirmados)} rotulo="confirmados" />
          <Fato valor="Livre" rotulo="participação" />
          <Fato valor={rotuloDaMinha(encontro.presenca.minha)} rotulo="sua presença" />
        </div>

        {encontro.souOrganizador ? (
          <p className="text-sm text-(--on-surface-variant)">
            Você organiza este encontro: a presença é de quem participa.
          </p>
        ) : cancelado ? (
          <p className="text-sm text-(--on-surface-variant)">
            O encontro foi cancelado. Não é preciso confirmar presença.
          </p>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Botao
              tom={encontro.presenca.minha === "not_going" ? "tonal" : "contornado"}
              aria-pressed={encontro.presenca.minha === "not_going"}
              disabled={ocupado}
              onClick={() => void mudarPresenca("not_going")}
            >
              Não vou
            </Botao>
            <Botao
              tom={encontro.presenca.minha === "going" ? "tonal" : "preenchido"}
              icone={encontro.presenca.minha === "going" ? "check" : "event_available"}
              aria-pressed={encontro.presenca.minha === "going"}
              disabled={ocupado}
              onClick={() => void mudarPresenca("going")}
            >
              {encontro.presenca.minha === "going" ? "Presença confirmada" : "Vou"}
            </Botao>
            {encontro.presenca.minha === null ? null : (
              <Botao tom="texto" disabled={ocupado} onClick={() => void mudarPresenca(null)}>
                Cancelar presença
              </Botao>
            )}
          </div>
        )}

        {aviso === null ? null : (
          <p role="alert" className="text-sm text-(--destructive)">
            {aviso}
          </p>
        )}
      </Secao>

      {encontro.souOrganizador || cancelado ? null : (
        <Secao titulo="Perguntar a quem organiza">
          {perguntaEnviada ? (
            <p className="text-[15px] leading-6">
              Sua pergunta foi enviada. A resposta chega em Conversas.
            </p>
          ) : (
            <form className="grid gap-3" onSubmit={(evento) => void enviarPergunta(evento)}>
              <Campo
                id="pergunta-ao-organizador"
                rotulo="Sua pergunta"
                valor={pergunta}
                aoMudar={setPergunta}
                area
                nota="Sua pergunta será enviada a quem organiza este evento."
              />
              {erroDaPergunta === null ? null : (
                <p role="alert" className="text-sm text-(--destructive)">
                  {erroDaPergunta}
                </p>
              )}
              <div className="flex justify-end">
                <Botao
                  tom="contornado"
                  type="submit"
                  disabled={enviandoPergunta || pergunta.trim() === ""}
                >
                  {enviandoPergunta ? "Enviando…" : "Enviar pergunta"}
                </Botao>
              </div>
            </form>
          )}
        </Secao>
      )}

      {editando ? (
        <FormularioDeEncontro
          encontro={encontro}
          aoFechar={() => setEditando(false)}
          aoSalvar={() => {
            setEditando(false)
            setRodada((atual) => atual + 1)
          }}
        />
      ) : null}
    </section>
  )
}

function rotuloDaMinha(minha: Encontro["presenca"]["minha"]): string {
  if (minha === "going") return "Sim"
  if (minha === "not_going") return "Não"
  if (minha === "interested") return "Interesse"
  return "—"
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
