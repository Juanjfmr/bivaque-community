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
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { FormularioDeEncontro } from "@/src/eventos/FormularioDeEncontro"
import {
  acessoNegado,
  encontroSumiu,
  foiAbortada,
  mensagemDaFalha,
  sessaoVencida,
} from "@/src/eventos/formulario"
import { texto } from "@/src/telas/comum"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * O encontro, do banco (F05 / ADR-20261105).
 *
 * A cidade mostrada é a do ENCONTRO, não a de quem olha: desde a decisão de 25/09
 * (migration 20260925161111) um membro lê encontros de outras cidades, e a tela
 * precisa dizer de qual cidade é o que ele está vendo. Visitante não recebe
 * "Vou"/"Não vou" nem pergunta — o servidor recusaria, e oferecer botão que
 * falha é pior do que explicar por que ele não existe.
 *
 * Presença e pergunta mostram o que ficou gravado, não um otimismo local: a tela
 * espera a resposta do servidor para mudar, e quando a escrita falha o estado
 * anterior continua com a mensagem do que aconteceu.
 */
export function Evento() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""

  const [encontro, setEncontro] = useState<Encontro | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | "sumiu" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [editando, setEditando] = useState(false)

  const [pergunta, setPergunta] = useState("")
  const [perguntaEnviada, setPerguntaEnviada] = useState(false)
  const [erroDaPergunta, setErroDaPergunta] = useState<string | null>(null)
  const [enviandoPergunta, setEnviandoPergunta] = useState(false)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // Uma sessão de rede por tela: sair cancela escrita que ainda estava a caminho.
  const [controle] = useState(() => new AbortController())
  useEffect(() => () => controle.abort(), [controle])

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
          sessaoVencida(falha)
            ? "sessao"
            : encontroSumiu(falha)
              ? "sumiu"
              : acessoNegado(falha)
                ? "negado"
                : "falhou",
        )
      })
    return () => controle.abort()
  }, [id, rodada])

  const validacao = validarParametros("evento", { id })
  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro === "sumiu") return <TelaIndisponivel />
  if (erro === "sessao") {
    return (
      <section data-tela="evento" className="grid gap-2">
        <EstadoDeSessaoVencida />
      </section>
    )
  }
  if (erro === "negado") {
    return (
      <section data-tela="evento" className="grid gap-2">
        <EstadoNegado texto="Sua conta não tem acesso a este encontro." />
      </section>
    )
  }
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
  const presenca = encontro.presenca
  const podeMarcar = !encontro.visitante && !encontro.souOrganizador && !cancelado

  async function mudarPresenca(situacao: PresencaDoEncontro | null) {
    if (encontro === null || ocupado) return
    setOcupado(true)
    setAviso(null)
    try {
      const gravada =
        situacao === null
          ? await cancelarPresenca(encontro.id, { signal: controle.signal })
          : await marcarPresenca(encontro.id, situacao, { signal: controle.signal })
      setEncontro({ ...encontro, presenca: gravada })
    } catch (falha: unknown) {
      // Nada mudou na tela: o estado anterior continua sendo o que o banco tem.
      if (!foiAbortada(falha)) setAviso(mensagemDaFalha(falha, "presenca"))
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
      await perguntarAoOrganizador(encontro.id, pergunta, { signal: controle.signal })
      setPergunta("")
      setPerguntaEnviada(true)
    } catch (falha: unknown) {
      // O texto continua no campo: é o que a pessoa escreveu.
      if (!foiAbortada(falha)) setErroDaPergunta(mensagemDaFalha(falha, "pergunta"))
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
            <Botao tom="tonal" icone="edit" className="ml-auto" onClick={() => setEditando(true)}>
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
          <small data-cidade-do-evento className="text-(--on-surface-variant)">
            {encontro.cidade}
          </small>
        </span>
      </div>

      {encontro.descricao === null ? null : (
        <Secao titulo="Sobre o encontro">
          <p className="text-[15px] leading-6">{encontro.descricao}</p>
        </Secao>
      )}

      {encontro.visitante ? (
        <section
          data-visitante="sim"
          aria-labelledby="encontro-de-outra-cidade"
          className="grid gap-1 rounded-2xl bg-(--surface-lowest) px-4 py-4 ring-1 ring-(--outline-variant)"
        >
          <h2 id="encontro-de-outra-cidade" className="text-[15px] font-semibold">
            Encontro de outra cidade
          </h2>
          <p className="text-sm text-(--on-surface-variant)">
            Você está vendo {encontro.cidade}. Confirmar presença e perguntar ao organizador ficam
            para quem mora lá.
          </p>
        </section>
      ) : (
        <Secao titulo="Presença">
          <div className="grid grid-cols-3 gap-2">
            <Fato
              valor={presenca === null ? "—" : String(presenca.confirmados)}
              rotulo="confirmados"
            />
            <Fato valor="Livre" rotulo="participação" />
            <Fato valor={rotuloDaMinha(presenca?.minha ?? null)} rotulo="sua presença" />
          </div>

          {encontro.souOrganizador ? (
            <p className="text-sm text-(--on-surface-variant)">
              Você organiza este encontro: a presença é de quem participa.
            </p>
          ) : cancelado ? (
            <p className="text-sm text-(--on-surface-variant)">
              O encontro foi cancelado. Não é preciso confirmar presença.
            </p>
          ) : presenca === null ? null : (
            <div className="flex flex-wrap justify-end gap-2">
              <Botao
                // Tonal nos dois estados: o tom de contorno não segue o tema
                // escuro (defeito do piece, registrado no card) e o botão sumia.
                tom="tonal"
                aria-pressed={presenca.minha === "not_going"}
                disabled={ocupado}
                onClick={() => void mudarPresenca("not_going")}
              >
                Não vou
              </Botao>
              <Botao
                tom={presenca.minha === "going" ? "tonal" : "preenchido"}
                icone={presenca.minha === "going" ? "check" : "event_available"}
                aria-pressed={presenca.minha === "going"}
                disabled={ocupado}
                onClick={() => void mudarPresenca("going")}
              >
                {presenca.minha === "going" ? "Presença confirmada" : "Vou"}
              </Botao>
              {presenca.minha === null ? null : (
                <Botao tom="tonal" disabled={ocupado} onClick={() => void mudarPresenca(null)}>
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
      )}

      {podeMarcar ? (
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
                  tom="tonal"
                  type="submit"
                  disabled={enviandoPergunta || pergunta.trim() === ""}
                >
                  {enviandoPergunta ? "Enviando…" : "Enviar pergunta"}
                </Botao>
              </div>
            </form>
          )}
        </Secao>
      ) : null}

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

function rotuloDaMinha(minha: PresencaDoEncontro | null): string {
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
