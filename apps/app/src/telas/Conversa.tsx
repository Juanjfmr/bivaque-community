"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Textarea } from "@/components/ui/textarea"
import { ContextoDaConversa } from "@/components/bivaque/contexto-conversa"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  guardarMensagemDePrevia,
  lerMensagensDePrevia,
  type MensagemDePrevia,
  origemDaConversa,
} from "@/lib/contexto-conversa"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { iniciais } from "@/lib/texto"
import { useCasca } from "@/src/contexto/casca"
import { registro, texto } from "@/src/telas/comum"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * A conversa da onda 7 (protótipo: features/messaging/views.js, renderChat),
 * com dados de demonstração. A mensagem nova entra só nesta sessão. Respostas
 * rápidas, bloqueio e origem do contato ficam para o refino.
 */
// shortcut: id da conta de demonstração; vira sessão real quando o backend entrar.
const MEU_ID_NA_DEMO = "demo-rafael"

export function Conversa() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [rascunho, setRascunho] = useState("")
  const [novas, setNovas] = useState<readonly MensagemDePrevia[]>([])
  const [erroLocal, setErroLocal] = useState("")

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

  const validacao = validarParametros("conversa", { id })
  const conversa = useMemo(
    () => (dados === null ? null : (dados.conversas.find((item) => item.id === id) ?? null)),
    [dados, id],
  )
  const quem = conversa ? texto(registro(conversa.apresentacao)["who"], "Conversa") : ""
  const origem = conversa && dados ? origemDaConversa(conversa, dados) : null
  const abrirOrigem = () => {
    if (!origem || !origem.id || origem.tipo === "texto") return
    void navegacao.irPara(origem.tipo === "anuncio" ? "anuncio" : "negocio", {
      parametros: { id: origem.id },
    })
  }
  const mostrarConversaNoTopo = casca.mostrarConversaNoTopo
  useEffect(() => {
    mostrarConversaNoTopo(quem ? { id, nome: quem } : null)
    return () => mostrarConversaNoTopo(null)
  }, [id, quem, mostrarConversaNoTopo])
  useEffect(() => {
    setNovas(lerMensagensDePrevia(casca.cidade, id))
    setRascunho("")
  }, [id, casca.cidade])

  const adicionarPrevia = () => {
    const enviadas = guardarMensagemDePrevia(casca.cidade, id, rascunho)
    if (enviadas === null) {
      setErroLocal("Não foi possível guardar a mensagem nesta sessão. Nada foi enviado.")
      return
    }
    setNovas(enviadas)
    setRascunho("")
    setErroLocal("")
  }

  const mensagens = useMemo(() => {
    if (dados === null) return []
    return dados.mensagens
      .filter((item) => item.conversation_id === id)
      .slice()
      .sort((a, b) => texto(a.created_at).localeCompare(texto(b.created_at)))
  }, [dados, id])

  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro) {
    return (
      <section data-tela="conversa" className="grid gap-2">
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }

  if (dados === null) {
    return (
      <section data-tela="conversa" className="grid gap-2">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  }

  if (conversa === null) return <TelaIndisponivel />

  return (
    <section
      data-tela="conversa"
      className="flex min-h-[calc(100dvh-var(--altura-do-topo)-20px)] min-w-0 flex-col gap-3 pb-3"
    >
      <div className="flex min-w-0 items-center gap-3 px-1 py-2">
        <Avatar size="lg" className="size-11 shrink-0">
          <AvatarFallback className="bg-(--secondary-container) font-semibold">
            {iniciais(quem)}
          </AvatarFallback>
        </Avatar>
        <span className="grid min-w-0 gap-0.5">
          <h1
            id="titulo-da-tela"
            data-titulo-da-tela
            tabIndex={-1}
            className="truncate text-[19px] font-semibold leading-6"
          >
            {quem}
          </h1>
          <small className="text-(--on-surface-variant)">Prévia de conversa · sem envio real</small>
        </span>
      </div>

      {origem === null ? null : (
        <ContextoDaConversa
          origem={origem}
          {...(origem.id === null ? {} : { aoAbrir: abrirOrigem })}
        />
      )}

      <p className="flex items-start gap-2 rounded-xl bg-(--secondary-container) px-3 py-2 text-[12px] leading-5">
        <Icone nome="verified_user" className="mt-0.5 size-5 shrink-0" />
        Nunca pague adiantado nem envie documentos pelo chat. Combine a entrega em local público.
      </p>

      {mensagens.length === 0 && novas.length === 0 ? (
        <EstadoVazio
          titulo="Combine os detalhes por aqui"
          texto="Descreva o que você procura e confirme preço, disponibilidade e horário."
          icone="chat_bubble"
        />
      ) : (
        <div data-mensagens="historico" className="grid min-w-0 content-start gap-2 pb-2">
          {mensagens.map((item) => {
            const minha = item.sender_id === MEU_ID_NA_DEMO
            return (
              <p
                key={item.id}
                className={
                  minha
                    ? "ml-auto max-w-[86%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-(--secondary-container) px-3 py-2.5 text-[14px] leading-5"
                    : "mr-auto max-w-[86%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-(--surface-lowest) px-3 py-2.5 text-[14px] leading-5 ring-1 ring-(--outline-variant)"
                }
              >
                {item.content}
              </p>
            )
          })}
          {novas.map((item) => (
            <div
              key={item.id}
              data-mensagem-previa="sim"
              className="ml-auto grid max-w-[86%] gap-1"
            >
              <p className="whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-(--secondary-container) px-3 py-2.5 text-[14px] leading-5">
                {item.conteudo}
              </p>
              <small className="text-right text-[11px] text-(--on-surface-variant)">
                Só na sua sessão · não enviada
              </small>
            </div>
          ))}
        </div>
      )}

      <div
        data-compositor-conversa="sim"
        className="sticky bottom-2 z-10 mt-auto grid min-w-0 gap-2 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3 shadow-[0_-4px_16px_var(--shadow-soft)] md:bottom-3"
      >
        <fieldset aria-label="Respostas rápidas" className="flex gap-2 overflow-x-auto pb-0.5">
          {[
            "Ainda está disponível?",
            "Podemos combinar a retirada?",
            "Obrigado, vou confirmar.",
          ].map((opcao) => (
            <button
              type="button"
              key={opcao}
              data-resposta-rapida="sim"
              className="min-h-9 shrink-0 rounded-full border border-(--outline-variant) px-3 text-xs hover:bg-(--surface-low)"
              onClick={() => setRascunho(opcao)}
            >
              {opcao}
            </button>
          ))}
        </fieldset>
        <form
          className="grid min-w-0 gap-1.5"
          onSubmit={(evento) => { evento.preventDefault(); adicionarPrevia() }}
        >
          <div className="flex min-w-0 items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="mensagem-da-conversa" className="sr-only">Mensagem da prévia</label>
              <Textarea
                id="mensagem-da-conversa"
                aria-label="Mensagem da prévia"
                rows={2}
                maxLength={2000}
                value={rascunho}
                onChange={(evento) => setRascunho(evento.target.value)}
                placeholder="Escreva uma mensagem..."
                className="min-h-12 max-h-32 resize-y rounded-xl"
              />
            </div>
            <Botao
              type="submit"
              data-acao="adicionar-previa-conversa"
              icone="send"
              disabled={rascunho.trim() === "" || rascunho.length > 2000}
              className="shrink-0 px-3"
            >
              Adicionar
            </Botao>
          </div>
          <small className="text-[11px] leading-4 text-(--on-surface-variant)">
            Apenas prévia nesta sessão; nenhuma mensagem é entregue.
          </small>
        </form>
        {erroLocal === "" ? null : (
          <p role="alert" className="text-xs text-(--destructive)">
            {erroLocal}
          </p>
        )}
      </div>
    </section>
  )
}
