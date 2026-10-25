"use client"

import {
  Bell,
  BellRing,
  CircleCheck,
  MessagesSquare,
  RotateCcw,
  Send,
  ThumbsUp,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Indicacao, Resposta } from "@/lib/dados/indicacoes"
import { fonteDeIndicacoes } from "@/lib/dados/indicacoes"
import { FALHA_DA_DEMONSTRACAO } from "@/lib/demo/dados"
import { PERGUNTA } from "@/lib/demo/textos"
import { quandoRelativo } from "@/lib/texto"
import { cn } from "@/lib/utils"
import { EsqueletoDeLista } from "./esqueleto-de-lista"
import { EstadoDeErro } from "./estado-de-erro"
import { EstadoVazio } from "./estado-vazio"
import { Icone } from "./icone"
import { Pilula } from "./pilula"
import { useBivaque } from "./provedor"

// O detalhe da pergunta (`features/community/question.js`, renderQuestion): a
// pergunta, as respostas, responder, "Útil" na resposta de outra pessoa, marcar
// como resolvida e reabrir para quem perguntou, e seguir as respostas.
export function TelaPergunta({ id }: { id: string }) {
  const { avisar } = useBivaque()
  const [indicacao, setIndicacao] = useState<Indicacao | null>(null)
  const [respostas, setRespostas] = useState<Resposta[]>([])
  const [estado, setEstado] = useState<"carregando" | "pronto" | "ausente" | "erro">("carregando")
  const [texto, setTexto] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [avisoForm, setAvisoForm] = useState("")
  const pedido = useRef(0)

  const carregar = useCallback(
    async (mostrarEspera: boolean) => {
      const meu = pedido.current + 1
      pedido.current = meu
      if (mostrarEspera) setEstado("carregando")
      try {
        const [achada, lista] = await Promise.all([
          fonteDeIndicacoes().obter(id),
          fonteDeIndicacoes().respostas(id),
        ])
        if (meu !== pedido.current) return
        if (!achada) {
          setEstado("ausente")
          return
        }
        setIndicacao(achada)
        setRespostas(lista)
        setEstado("pronto")
      } catch {
        if (meu !== pedido.current) return
        setEstado("erro")
      }
    },
    [id],
  )

  useEffect(() => {
    void carregar(true)
  }, [carregar])

  async function executar(acao: () => Promise<void>) {
    try {
      await acao()
      await carregar(false)
    } catch {
      setEstado("erro")
    }
  }

  async function enviar() {
    const limpo = texto.trim()
    if (limpo.length === 0) return
    setEnviando(true)
    try {
      await fonteDeIndicacoes().responder(id, limpo)
      setTexto("")
      setAvisoForm("")
      await carregar(false)
      avisar(PERGUNTA.enviada)
    } catch {
      setAvisoForm(FALHA_DA_DEMONSTRACAO)
    } finally {
      setEnviando(false)
    }
  }

  if (estado === "carregando") {
    return (
      <div className="pt-5 md:pt-8">
        <EsqueletoDeLista linhas={2} />
      </div>
    )
  }

  if (estado === "erro") {
    return (
      <div className="pt-5 md:pt-8">
        <EstadoDeErro aoTentar={() => void carregar(true)} />
      </div>
    )
  }

  if (estado === "ausente" || indicacao === null) {
    return (
      <div className="pt-5 md:pt-8">
        <EstadoVazio
          titulo={PERGUNTA.naoEncontrada}
          texto={PERGUNTA.naoEncontradaTexto}
          glifo={MessagesSquare}
        >
          <Button variant="secondary" asChild>
            <a href="/inicio">{PERGUNTA.irParaInicio}</a>
          </Button>
        </EstadoVazio>
      </div>
    )
  }

  const resolvida = indicacao.is_resolved
  const estadoDaPergunta = resolvida
    ? PERGUNTA.resolvida
    : respostas.length > 0
      ? PERGUNTA.resposta(respostas.length)
      : PERGUNTA.semResposta

  return (
    <div className="grid gap-5 pt-5 md:pt-8">
      <article className="grid gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--surface-high) text-[13px] font-bold">
            {indicacao.autor.iniciais}
          </span>
          <div className="min-w-0 grow">
            <b className="text-sm font-semibold">
              {indicacao.minha ? "Você" : indicacao.autor.nome}
            </b>
            <p className="text-xs text-(--muted-foreground)">
              {indicacao.body !== "" ? indicacao.body : quandoRelativo(indicacao.created_at)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-pressed={indicacao.seguindo}
            aria-label={indicacao.seguindo ? PERGUNTA.pararDeSeguir : PERGUNTA.seguir}
            onClick={() =>
              void executar(async () => {
                await fonteDeIndicacoes().definirSeguindo(id, !indicacao.seguindo)
                avisar(indicacao.seguindo ? PERGUNTA.deixouDeSeguir : PERGUNTA.seguiu)
              })
            }
          >
            <Icone glifo={indicacao.seguindo ? BellRing : Bell} />
          </Button>
        </div>

        <h1 className="text-[24px] leading-7.5 tracking-[-0.3px] md:text-[30px]">
          {indicacao.title}
        </h1>

        <Pilula tom={resolvida ? "ok" : "neutro"}>
          {resolvida && <Icone glifo={CircleCheck} className="size-3.5" />}
          {estadoDaPergunta}
        </Pilula>
      </article>

      <section className="grid gap-3" aria-label={PERGUNTA.respostas}>
        <h2 className="text-[19px]">{PERGUNTA.respostas}</h2>

        {respostas.length === 0 ? (
          <EstadoVazio
            titulo={PERGUNTA.respostasVazio}
            texto={PERGUNTA.respostasVazioTexto}
            glifo={MessagesSquare}
          />
        ) : (
          <div className="grid gap-3">
            {respostas.map((resposta) => (
              <article
                key={resposta.id}
                className={cn(
                  "grid gap-3 rounded-2xl border border-(--outline-variant) p-4",
                  resposta.ajudou && "border-(--brasa) bg-(--tertiary-container)/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--surface-high) text-[13px] font-bold">
                    {resposta.autor.iniciais}
                  </span>
                  <div className="min-w-0 grow">
                    <b className="text-sm font-semibold">
                      {resposta.minha ? "Você" : resposta.autor.nome}
                    </b>
                    <p className="text-xs text-(--muted-foreground)">
                      {resposta.minha ? PERGUNTA.autor : PERGUNTA.membro}
                    </p>
                  </div>
                  {resposta.ajudou && (
                    <Pilula tom="ok">
                      <Icone glifo={CircleCheck} className="size-3.5" />
                      {PERGUNTA.ajudou}
                    </Pilula>
                  )}
                </div>

                <p className="text-[15px] leading-6">{resposta.body}</p>

                <div className="flex flex-wrap items-center gap-2">
                  {indicacao.minha ? (
                    <Button
                      variant="secondary"
                      onClick={() =>
                        void executar(async () => {
                          if (resposta.ajudou) {
                            await fonteDeIndicacoes().reabrir(id)
                            avisar(PERGUNTA.reabertaAviso)
                          } else {
                            await fonteDeIndicacoes().resolver(id, resposta.id)
                            avisar(PERGUNTA.resolvidaAviso)
                          }
                        })
                      }
                    >
                      <Icone glifo={resposta.ajudou ? RotateCcw : CircleCheck} />
                      {resposta.ajudou ? PERGUNTA.reabrir : PERGUNTA.resolver}
                    </Button>
                  ) : (
                    <Button
                      variant={resposta.marcada_util ? "secondary" : "ghost"}
                      aria-pressed={resposta.marcada_util}
                      onClick={() =>
                        void executar(() => fonteDeIndicacoes().marcarUtil(resposta.id))
                      }
                    >
                      <Icone glifo={ThumbsUp} />
                      {resposta.util > 0 ? `${PERGUNTA.util} · ${resposta.util}` : PERGUNTA.util}
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {!resolvida && (
        <section className="grid gap-3" aria-label={PERGUNTA.compor}>
          <h3>{PERGUNTA.compor}</h3>
          <label className="sr-only" htmlFor="resposta-texto">
            {PERGUNTA.campo}
          </label>
          <Textarea
            id="resposta-texto"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={PERGUNTA.campo}
          />
          {avisoForm !== "" && (
            <p role="alert" id="resposta-erro" className="text-sm text-(--destructive)">
              {avisoForm}
            </p>
          )}
          <div className="flex justify-end">
            <Button onClick={() => void enviar()} disabled={enviando || texto.trim() === ""}>
              <Icone glifo={Send} />
              {PERGUNTA.enviar}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}
