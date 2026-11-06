"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Secao } from "@/components/bivaque/secao"
import { FalhaDaApi } from "@/lib/api/cliente"
import { buscarPergunta, type PerguntaDaConversa, responderPergunta } from "@/lib/dados/perguntas"
import { idLocal } from "@/lib/id"
import { useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { lerPerguntasLocais } from "@/lib/perguntas-locais"
import { iniciais } from "@/lib/texto"
import { useCasca } from "@/src/contexto/casca"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, foiAbortada, sessaoVencida } from "@/src/eventos/formulario"
import { mensagemDaFalha } from "@/src/perguntas/estado"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * A pergunta e a conversa dela, do banco (F04 / ADR-20261105).
 *
 * O desenho não mudou — autoria e contexto, título, etiqueta de estado, respostas
 * com "Útil" e o campo de resposta. Mudou de onde vem o dado:
 * `lib/dados/perguntas`, que fala com `/api/app/perguntas`. Por isso a tela
 * distingue carregando, falha recuperável, sessão vencida, acesso negado e
 * pergunta que não existe mais.
 *
 * A resposta é GRAVADA antes de aparecer: o que a tela mostra é o que o servidor
 * devolveu, não um otimismo local. Quando a escrita falha, o texto continua no
 * campo e a tela diz o que aconteceu.
 *
 * A pergunta criada na caixa de demonstração da Comunidade não existe no banco:
 * ela abre daqui mesmo, só nesta sessão, como o cadastro dela avisa.
 */
const CHAVE_DE_RESPOSTA = "resposta-da-pessoa"

export function Pergunta() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const [dados, setDados] = useState<PerguntaDaConversa | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | "sumiu" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [resposta, setResposta] = useState("")
  const [erroAoResponder, setErroAoResponder] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [uteis, setUteis] = useState<ReadonlySet<string>>(() => new Set())
  // Uma sessão de rede por tela: sair cancela a escrita que ainda estava a caminho.
  const [controle] = useState(() => new AbortController())

  useRolagemEFoco(CARGA_CONCLUIDA)

  useEffect(() => () => controle.abort(), [controle])

  // Pergunta de demonstração: o id é local e o banco nunca a conheceu.
  const local = useMemo(
    () =>
      id.startsWith("pergunta-demo-")
        ? (lerPerguntasLocais(casca.cidade).find((item) => item.id === id) ?? null)
        : null,
    [id, casca.cidade],
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    if (local !== null) {
      setDados({
        pergunta: {
          id: local.id,
          titulo: local.title,
          corpo: local.body,
          assunto: "",
          criadaEm: "",
          resolvida: local.is_resolved === true,
          propria: true,
          autor: "Você",
          cidade: casca.cidade,
        },
        respostas: [],
      })
      setErro(null)
      return
    }
    const pedido = new AbortController()
    setDados(null)
    setErro(null)
    setErroAoResponder(null)
    void buscarPergunta(id, { signal: pedido.signal })
      .then((lida) => {
        if (!pedido.signal.aborted) setDados(lida)
      })
      .catch((falha: unknown) => {
        if (pedido.signal.aborted) return
        setErro(
          sessaoVencida(falha)
            ? "sessao"
            : acessoNegado(falha)
              ? "negado"
              : falha instanceof FalhaDaApi && falha.codigo === "nao-encontrado"
                ? "sumiu"
                : "falhou",
        )
      })
    return () => pedido.abort()
  }, [id, rodada, local, casca.cidade])

  const validacao = validarParametros("pergunta", { id })
  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro === "sumiu") return <TelaIndisponivel />
  if (erro === "sessao") {
    return (
      <section data-tela="pergunta" className="grid gap-2">
        <EstadoDeSessaoVencida />
      </section>
    )
  }
  if (erro === "negado") {
    return (
      <section data-tela="pergunta" className="grid gap-2">
        <EstadoNegado texto="Sua conta não tem acesso a esta pergunta." />
      </section>
    )
  }
  if (erro === "falhou") {
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

  const pergunta = dados.pergunta
  const respostas = dados.respostas
  // Capturado depois do guarda: `enviar` é declaração de função (hoisted), e o
  // TypeScript não carrega o estreitamento de `dados` para dentro dela.
  const atual = dados

  const alternarUtil = (chave: string) => {
    setUteis((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chave)) proximo.delete(chave)
      else proximo.add(chave)
      return proximo
    })
  }

  async function enviar() {
    const corpo = resposta.trim()
    if (corpo === "" || enviando) return
    setEnviando(true)
    setErroAoResponder(null)
    try {
      const gravada =
        local !== null
          ? // A pergunta de demonstração não tem para onde gravar: a resposta
            // fica na sessão, como a pergunta.
            {
              id: idLocal("resposta-demo-"),
              corpo,
              autor: "",
              propria: true,
              criadaEm: new Date().toISOString(),
              removida: false,
            }
          : await responderPergunta(id, corpo, { signal: controle.signal })
      setDados({ ...atual, respostas: [...respostas, gravada] })
      setResposta("")
    } catch (falha: unknown) {
      // O texto continua no campo: é o que a pessoa escreveu.
      if (!foiAbortada(falha)) setErroAoResponder(mensagemDaFalha(falha, "resposta"))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <section data-tela="pergunta" className="grid gap-2">
      <article className="grid gap-3 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--secondary-container) font-semibold">
            {iniciais(pergunta.propria ? "Você" : pergunta.autor || "Alguém")}
          </span>
          <span className="grid gap-0.5">
            <b className="text-sm">
              {pergunta.propria ? "Você" : pergunta.autor || "Alguém da cidade"}
            </b>
            <small className="text-[13px] text-(--on-surface-variant)">
              {pergunta.cidade || casca.cidade}
            </small>
          </span>
        </div>
        <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1} className="text-[22px] leading-7">
          {pergunta.titulo}
        </h1>
        <div className="flex items-center justify-between gap-3">
          {pergunta.resolvida ? (
            <Etiqueta tom="ok" icone="check_circle">
              Resolvida
            </Etiqueta>
          ) : (
            <Etiqueta tom="neutro">
              {respostas.length === 0 ? "Sem resposta" : `${respostas.length} respostas`}
            </Etiqueta>
          )}
          <span className="text-[13px] text-(--on-surface-variant)">{pergunta.assunto}</span>
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
              const chave = item.id
              const ajudou = uteis.has(chave) ? 1 : 0
              if (item.removida) {
                return (
                  <p
                    key={item.id}
                    className="rounded-2xl bg-(--surface-lowest) px-4 py-3 text-sm text-(--on-surface-variant) ring-1 ring-(--outline-variant)"
                  >
                    Resposta removida pela moderação.
                  </p>
                )
              }
              return (
                <article
                  key={item.id}
                  className="grid gap-2 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--muted) text-sm font-semibold">
                      {iniciais(item.propria ? "Você" : item.autor || "Membro")}
                    </span>
                    <span className="grid gap-0.5">
                      <b className="text-sm">
                        {item.propria ? "Você" : item.autor || "Membro da comunidade"}
                      </b>
                      <small className="text-[12px] text-(--on-surface-variant)">
                        Membro da comunidade
                      </small>
                    </span>
                  </div>
                  <p className="text-[15px] leading-6">{item.corpo}</p>
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

      {pergunta.resolvida ? null : (
        <Secao titulo="Compartilhe uma indicação">
          <Campo
            id={CHAVE_DE_RESPOSTA}
            rotulo="Sua resposta"
            valor={resposta}
            aoMudar={setResposta}
            area
            nota={
              local === null
                ? "Sua resposta fica visível para quem acompanha a pergunta."
                : "A resposta entra só nesta sessão de demonstração."
            }
          />
          {erroAoResponder === null ? null : (
            <p role="alert" className="text-sm text-(--destructive)">
              {erroAoResponder}
            </p>
          )}
          <div className="flex justify-end">
            <Botao
              icone="send"
              disabled={enviando || resposta.trim() === ""}
              onClick={() => void enviar()}
            >
              {enviando ? "Enviando…" : "Enviar indicação"}
            </Botao>
          </div>
        </Secao>
      )}
    </section>
  )
}
