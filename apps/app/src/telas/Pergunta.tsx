"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Secao } from "@/components/bivaque/secao"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import type { Resposta } from "@/lib/dados/contrato"
import { idLocal } from "@/lib/id"
import { lerPerguntasLocais } from "@/lib/perguntas-locais"
import { useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { iniciais } from "@/lib/texto"
import { useCasca } from "@/src/contexto/casca"
import { registro, texto } from "@/src/telas/comum"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * A pergunta da onda 3 (protótipo: features/community/question.js), com dados
 * de demonstração.
 *
 * V1: autor e contexto, título, etiqueta de estado, respostas com contagem de
 * "útil" local e o campo de resposta (que entra só nesta sessão). Ficam para o
 * refino: seguir, compartilhar, negócios relacionados, marcar "ajudou a
 * resolver", denúncia e bloqueio.
 */

const CHAVE_DE_RESPOSTA = "resposta-da-pessoa"

export function Pergunta() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [resposta, setResposta] = useState("")
  const [novas, setNovas] = useState<Resposta[]>([])
  const [uteis, setUteis] = useState<ReadonlySet<string>>(() => new Set())

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

  const validacao = validarParametros("pergunta", { id })
  const pergunta = useMemo(() => {
    if (dados === null) return null
    return (
      dados.perguntas.find((item) => item.id === id) ??
      lerPerguntasLocais(casca.cidade).find((item) => item.id === id) ??
      null
    )
  }, [dados, id, casca.cidade])

  const apresentacao = registro(pergunta?.apresentacao)
  const respostas = useMemo(() => {
    if (dados === null) return []
    return [...dados.respostas, ...novas].filter((item) => item.request_id === id)
  }, [dados, id, novas])

  const alternarUtil = (chave: string) => {
    setUteis((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chave)) proximo.delete(chave)
      else proximo.add(chave)
      return proximo
    })
  }

  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro) {
    return (
      <section data-tela="pergunta" className="grid gap-2">
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }

  if (dados === null) {
    return (
      <section data-tela="pergunta" className="grid gap-2">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  }

  if (pergunta === null) return <TelaIndisponivel />

  const minha = apresentacao["mine"] === true

  return (
    <section data-tela="pergunta" className="grid gap-2">
      <article className="grid gap-3 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--secondary-container) font-semibold">
            {iniciais(texto(apresentacao["who"], "Alguém"))}
          </span>
          <span className="grid gap-0.5">
            <b className="text-sm">
              {minha ? "Você" : texto(apresentacao["who"], "Alguém da cidade")}
            </b>
            <small className="text-[13px] text-(--on-surface-variant)">
              {texto(apresentacao["ctx"], casca.cidade)}
            </small>
          </span>
        </div>
        <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1} className="text-[22px] leading-7">
          {texto(apresentacao["q"], pergunta.title)}
        </h1>
        <div className="flex items-center justify-between gap-3">
          {pergunta.is_resolved === true ? (
            <Etiqueta tom="ok" icone="check_circle">
              Resolvida
            </Etiqueta>
          ) : (
            <Etiqueta tom="neutro">
              {respostas.length === 0 ? "Sem resposta" : `${respostas.length} respostas`}
            </Etiqueta>
          )}
          <span className="text-[13px] text-(--on-surface-variant)">
            {texto(apresentacao["topic"], "")}
          </span>
        </div>
      </article>

      <Secao titulo="Respostas">
        {respostas.length === 0 ? (
          <EstadoVazio
            titulo="A comunidade ainda não respondeu"
            texto="Sua pergunta já está disponível. Você pode acompanhar as respostas por aqui."
            icone="forum"
          />
        ) : (
          <div className="grid gap-3">
            {respostas.map((item) => {
              const dadosDaResposta = registro(item.apresentacao)
              const chave = item.id
              const ajudou = (numeroDoAjudou(dadosDaResposta) ?? 0) + (uteis.has(chave) ? 1 : 0)
              return (
                <article
                  key={item.id}
                  className="grid gap-2 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--muted) text-sm font-semibold">
                      {iniciais(texto(dadosDaResposta["who"], "Membro"))}
                    </span>
                    <span className="grid gap-0.5">
                      <b className="text-sm">
                        {texto(dadosDaResposta["who"], "Membro da comunidade")}
                      </b>
                      <small className="text-[12px] text-(--on-surface-variant)">
                        Membro da comunidade
                      </small>
                    </span>
                  </div>
                  <p className="text-[15px] leading-6">{texto(dadosDaResposta["t"], item.body)}</p>
                  <div className="flex items-center gap-2">
                    <Botao
                      tom={uteis.has(chave) ? "tonal" : "texto"}
                      icone="thumb_up"
                      aria-pressed={uteis.has(chave)}
                      onClick={() => alternarUtil(chave)}
                    >
                      {ajudou > 0 ? `Útil · ${ajudou}` : "Útil"}
                    </Botao>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Secao>

      {pergunta.is_resolved === true ? null : (
        <Secao titulo="Compartilhe uma indicação">
          <Campo
            id={CHAVE_DE_RESPOSTA}
            rotulo="Sua resposta"
            valor={resposta}
            aoMudar={setResposta}
            area
            nota="A resposta entra só nesta sessão de demonstração."
          />
          <div className="flex justify-end">
            <Botao
              icone="send"
              disabled={resposta.trim() === ""}
              onClick={() => {
                const corpo = resposta.trim()
                if (corpo === "") return
                setNovas((atual) => [
                  ...atual,
                  {
                    id: idLocal("resposta-demo-"),
                    request_id: id,
                    author_id: "demo-pessoa-atual",
                    body: corpo,
                    apresentacao: { who: "Você", t: corpo, helped: 0 },
                  },
                ])
                setResposta("")
              }}
            >
              Enviar indicação
            </Botao>
          </div>
        </Secao>
      )}
    </section>
  )
}

function numeroDoAjudou(apresentacao: Record<string, unknown>): number | null {
  const valor = apresentacao["helped"]
  return typeof valor === "number" && Number.isFinite(valor) ? valor : null
}
