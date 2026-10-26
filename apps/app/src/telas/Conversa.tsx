"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useRolagemEFoco } from "@/lib/navegacao/react"
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
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [rascunho, setRascunho] = useState("")
  const [novas, setNovas] = useState<readonly string[]>([])

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

  const apresentacao = registro(conversa.apresentacao)
  const quem = texto(apresentacao["who"], "Conversa")

  return (
    <section data-tela="conversa" className="grid gap-2">
      <div className="flex items-center gap-3 px-1 py-2">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--secondary-container) font-semibold">
          {iniciais(quem)}
        </span>
        <span className="grid gap-0.5">
          <h1
            id="titulo-da-tela"
            data-titulo-da-tela
            tabIndex={-1}
            className="text-[20px] leading-6"
          >
            {quem}
          </h1>
          <small className="text-(--on-surface-variant)">Conversa da comunidade</small>
        </span>
      </div>

      <p className="flex items-start gap-2 rounded-2xl bg-(--secondary-container) px-4 py-3 text-[13px]">
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
        <div className="grid gap-2">
          {mensagens.map((item) => {
            const minha = item.sender_id === MEU_ID_NA_DEMO
            return (
              <p
                key={item.id}
                className={
                  minha
                    ? "ml-auto max-w-[85%] rounded-2xl bg-(--secondary-container) px-4 py-2 text-[15px]"
                    : "mr-auto max-w-[85%] rounded-2xl bg-(--surface-lowest) px-4 py-2 text-[15px] ring-1 ring-(--outline-variant)"
                }
              >
                {item.content}
              </p>
            )
          })}
          {novas.map((item) => (
            <p
              key={item}
              className="ml-auto max-w-[85%] rounded-2xl bg-(--secondary-container) px-4 py-2 text-[15px]"
            >
              {item}
            </p>
          ))}
        </div>
      )}

      <Campo
        id="mensagem-da-conversa"
        rotulo="Mensagem"
        valor={rascunho}
        aoMudar={setRascunho}
        area
        nota="Demonstração: mensagens fictícias só nesta sessão."
      />
      <div className="flex justify-end">
        <Botao
          icone="send"
          disabled={rascunho.trim() === ""}
          onClick={() => {
            setNovas((atual) => [...atual, rascunho.trim()])
            setRascunho("")
          }}
        >
          Enviar
        </Botao>
      </div>
    </section>
  )
}
