"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { ContextoDaConversa } from "@/components/bivaque/contexto-conversa"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { FalhaDaApi } from "@/lib/api/cliente"
import { buscarConversa, type DetalheDaConversa, enviarMensagem } from "@/lib/dados/conversas"
import { useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { iniciais } from "@/lib/texto"
import { useCasca } from "@/src/contexto/casca"
import { contexto } from "@/src/conversas/contexto"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, sessaoVencida } from "@/src/eventos/formulario"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

export function Conversa() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const [dados, setDados] = useState<DetalheDaConversa | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | "ausente" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [rascunho, setRascunho] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroLocal, setErroLocal] = useState("")
  const [mostrarSeguranca, setMostrarSeguranca] = useState(false)
  const controle = useRef<AbortController | null>(null)
  useRolagemEFoco(CARGA_CONCLUIDA)
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada solicita nova leitura
  useEffect(() => {
    const pedido = new AbortController()
    controle.current = pedido
    setDados(null)
    setErro(null)
    setErroLocal("")
    setEnviando(false)
    setCarregandoMais(false)
    void buscarConversa(id, { signal: pedido.signal })
      .then((valor) => {
        if (!pedido.signal.aborted) setDados(valor)
      })
      .catch((falha: unknown) => {
        if (!pedido.signal.aborted)
          setErro(
            sessaoVencida(falha)
              ? "sessao"
              : acessoNegado(falha)
                ? "negado"
                : falha instanceof FalhaDaApi && falha.status === 404
                  ? "ausente"
                  : "falhou",
          )
      })
    return () => pedido.abort()
  }, [id, rodada])
  // biome-ignore lint/correctness/useExhaustiveDependencies: troca de conversa limpa o rascunho
  useEffect(() => {
    setRascunho("")
  }, [id])
  const nome = dados?.conversa.nome ?? ""
  const mostrarConversaNoTopo = casca.mostrarConversaNoTopo
  useEffect(() => {
    mostrarConversaNoTopo(nome ? { id, nome } : null)
    return () => mostrarConversaNoTopo(null)
  }, [id, nome, mostrarConversaNoTopo])
  async function enviar() {
    const pedido = controle.current
    if (!pedido || pedido.signal.aborted || enviando || !rascunho.trim()) return
    setEnviando(true)
    setErroLocal("")
    try {
      const mensagem = await enviarMensagem(id, rascunho, { signal: pedido.signal })
      if (!pedido.signal.aborted) {
        setDados((atual) =>
          atual ? { ...atual, mensagens: [...atual.mensagens, mensagem] } : atual,
        )
        setRascunho("")
      }
    } catch {
      if (!pedido.signal.aborted) setErroLocal("Não foi possível enviar. Seu texto foi mantido.")
    } finally {
      if (!pedido.signal.aborted) setEnviando(false)
    }
  }
  async function mais() {
    const pedido = controle.current
    if (!pedido || !dados?.anterior || carregandoMais) return
    setCarregandoMais(true)
    setErroLocal("")
    try {
      const pagina = await buscarConversa(id, { antes: dados.anterior, signal: pedido.signal })
      if (!pedido.signal.aborted)
        setDados((atual) =>
          atual
            ? {
                ...atual,
                mensagens: [...pagina.mensagens, ...atual.mensagens],
                anterior: pagina.anterior,
              }
            : atual,
        )
    } catch {
      if (!pedido.signal.aborted) setErroLocal("Não foi possível carregar as mensagens anteriores.")
    } finally {
      if (!pedido.signal.aborted) setCarregandoMais(false)
    }
  }
  const validacao = validarParametros("conversa", { id })
  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />
  if (erro === "ausente") return <TelaIndisponivel />
  if (erro || !dados)
    return (
      <section data-tela="conversa" className="grid gap-2">
        {erro === "sessao" ? (
          <EstadoDeSessaoVencida />
        ) : erro === "negado" ? (
          <EstadoNegado texto="Sua conta não tem acesso a esta conversa." />
        ) : erro === "falhou" ? (
          <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
        ) : (
          <EsqueletoDeLista linhas={3} />
        )}
      </section>
    )
  const origem = contexto(dados.conversa.tipo)
  return (
    <section
      data-tela="conversa"
      className="flex min-h-[calc(100dvh-var(--altura-do-topo)-20px)] min-w-0 flex-col gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-3"
    >
      <div className="flex min-w-0 items-center gap-3 px-1 py-2">
        <Avatar size="lg" className="size-11 shrink-0" aria-hidden="true">
          <AvatarFallback className="bg-(--secondary-container) font-semibold">
            {iniciais(nome)}
          </AvatarFallback>
        </Avatar>
        <span className="grid min-w-0 gap-0.5">
          <h1
            id="titulo-da-tela"
            data-titulo-da-tela
            tabIndex={-1}
            className="truncate text-[19px] font-semibold leading-6"
          >
            {nome}
          </h1>
        </span>
      </div>
      {origem && <ContextoDaConversa origem={origem} />}
      <aside
        data-seguranca-conversa="sim"
        className="rounded-xl bg-(--secondary-container) px-3 py-2 text-xs leading-5"
      >
        <button
          type="button"
          aria-expanded={mostrarSeguranca}
          aria-controls="orientacoes-conversa"
          className="flex min-h-10 w-full items-center gap-2 text-left font-medium"
          onClick={() => setMostrarSeguranca((atual) => !atual)}
        >
          <Icone nome="verified_user" className="size-5 shrink-0" />
          <span className="min-w-0 flex-1">Segurança na negociação</span>
          <Icone
            nome="chevron_right"
            className={mostrarSeguranca ? "size-4 rotate-90" : "size-4"}
          />
        </button>
        {mostrarSeguranca && (
          <p id="orientacoes-conversa" className="pb-1 text-(--on-surface-variant)">
            Nunca pague adiantado nem compartilhe documentos ou dados bancários. Combine a entrega
            em local público.
          </p>
        )}
      </aside>
      {dados.anterior && (
        <Botao tom="contornado" disabled={carregandoMais} onClick={() => void mais()}>
          {carregandoMais ? "Carregando…" : "Ver mensagens anteriores"}
        </Botao>
      )}
      {dados.mensagens.length === 0 ? (
        <EstadoVazio
          titulo="Combine os detalhes por aqui"
          texto="Descreva o que você procura e confirme preço, disponibilidade e horário."
          icone="chat_bubble"
        />
      ) : (
        <div data-mensagens="historico" className="grid min-w-0 content-start gap-2 pb-2">
          {dados.mensagens.map((item) => (
            <p
              key={item.id}
              className={
                item.minha
                  ? "ml-auto max-w-[86%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-(--secondary-container) px-3 py-2.5 text-[14px] leading-5"
                  : "mr-auto max-w-[86%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-(--surface-lowest) px-3 py-2.5 text-[14px] leading-5 ring-1 ring-(--outline-variant)"
              }
            >
              {item.conteudo}
            </p>
          ))}
        </div>
      )}
      <div
        data-compositor-conversa="sim"
        className="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-10 mt-auto grid min-w-0 gap-2 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-2.5 shadow-[0_-4px_16px_var(--shadow-soft)] sm:p-3"
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
              disabled={enviando}
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
          onSubmit={(evento) => {
            evento.preventDefault()
            void enviar()
          }}
        >
          <div className="flex min-w-0 items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="mensagem-da-conversa" className="sr-only">
                Mensagem
              </label>
              <Textarea
                id="mensagem-da-conversa"
                rows={2}
                maxLength={2000}
                value={rascunho}
                disabled={enviando}
                onChange={(evento) => setRascunho(evento.target.value)}
                placeholder="Escreva uma mensagem..."
                className="min-h-12 max-h-32 resize-y rounded-xl"
              />
            </div>
            <Botao
              type="submit"
              data-acao="enviar-mensagem"
              icone="send"
              disabled={enviando || !rascunho.trim() || rascunho.length > 2000}
              className="shrink-0 px-3"
            >
              {enviando ? "Enviando…" : "Enviar"}
            </Botao>
          </div>
        </form>
        {erroLocal && (
          <p role="alert" className="text-xs text-(--destructive)">
            {erroLocal}
          </p>
        )}
      </div>
    </section>
  )
}
