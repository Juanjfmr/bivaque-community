"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"

import { Botao, BotaoDeIcone } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { NomeDeMembro } from "@/components/bivaque/nome-de-membro"
import { Secao } from "@/components/bivaque/secao"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  type AcaoDeResolucao,
  buscarPergunta,
  denunciarPergunta,
  marcarSalvaPergunta,
  mudarResolucao,
  type PerguntaDaConversa,
  responderPergunta,
} from "@/lib/dados/perguntas"
import { idLocal } from "@/lib/id"
import { useNavegacao, useRolagemEFoco, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
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
 * e o campo de resposta. Mudou de onde vem o dado:
 * `lib/dados/perguntas`, que fala com `/api/app/perguntas`. Por isso a tela
 * distingue carregando, falha recuperável, sessão vencida, acesso negado e
 * pergunta que não existe mais.
 *
 * Só quem perguntou resolve ou reabre, e quem decide isso é o banco: a tela
 * esconde os botões de quem não é autor, mas a RPC recusa de novo.
 *
 * A resposta é GRAVADA antes de aparecer: o que a tela mostra é o que o servidor
 * devolveu, não um otimismo local. Quando a escrita falha, o texto continua no
 * campo e a tela diz o que aconteceu.
 *
 * A pergunta criada na caixa de demonstração da Comunidade não existe no banco:
 * ela abre daqui mesmo, só nesta sessão, como o cadastro dela avisa.
 */
const CHAVE_DE_RESPOSTA = "resposta-da-pessoa"

/** O alvo da denúncia: a pergunta inteira ou uma resposta dela. */
type AlvoDaDenuncia = Readonly<{ tipo: "pergunta" } | { tipo: "resposta"; respostaId: string }>

/** A lista fechada de motivos, a mesma de `lib/reports` no servidor. */
const MOTIVOS_DA_DENUNCIA: ReadonlyArray<readonly [valor: string, rotulo: string]> = [
  ["spam", "Spam"],
  ["conteudo-inadequado", "Conteúdo inadequado"],
  ["informacao-enganosa", "Informação enganosa"],
  ["outro", "Outro"],
]

/** A frase da resolução quando o servidor não mandou uma. */
function fraseDaResolucao(falha: unknown): string {
  if (falha instanceof FalhaDaApi && falha.codigo === "sem-sessao") {
    return "Sua sessão expirou. Entre de novo para continuar."
  }
  if (falha instanceof FalhaDaApi && falha.mensagem !== null) return falha.mensagem
  return "Não foi possível mudar a resolução. Tente de novo."
}

function fraseDoSeguir(falha: unknown): string {
  if (falha instanceof FalhaDaApi && falha.codigo === "sem-sessao") {
    return "Sua sessão expirou. Entre de novo para continuar."
  }
  if (falha instanceof FalhaDaApi && falha.mensagem !== null) return falha.mensagem
  return "Não foi possível seguir esta pergunta. Tente de novo."
}

export function Pergunta() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<PerguntaDaConversa | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | "sumiu" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [resposta, setResposta] = useState("")
  const [erroAoResponder, setErroAoResponder] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [mudandoResolucao, setMudandoResolucao] = useState(false)
  const [erroDaResolucao, setErroDaResolucao] = useState<string | null>(null)
  const [mudandoSeguir, setMudandoSeguir] = useState(false)
  const [erroDoSeguir, setErroDoSeguir] = useState<string | null>(null)
  // Denúncia (F04): a sobreposição vive na entrada, como o menu da publicação de
  // grupo; o alvo escolhido vive aqui.
  const { aberto: denunciaAberta, aoMudarAberto: aoMudarDenuncia } =
    useSobreposicaoDaEntrada("menu-de-linha")
  const [alvoDaDenuncia, setAlvoDaDenuncia] = useState<AlvoDaDenuncia | null>(null)
  const [denunciando, setDenunciando] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [explicacao, setExplicacao] = useState("")
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false)
  const [erroDaDenuncia, setErroDaDenuncia] = useState<string | null>(null)
  const [avisoDaDenuncia, setAvisoDaDenuncia] = useState("")
  // Uma sessão de rede por tela: sair cancela a escrita que ainda estava a caminho.
  const [controle] = useState(() => new AbortController())

  useRolagemEFoco(CARGA_CONCLUIDA)

  useEffect(() => () => controle.abort(), [controle])

  // A entrada guarda a sobreposição, não o alvo: uma recarga com o menu aberto
  // volta sem alvo, e a casca deixaria o corpo inerte com um diálogo que não
  // existe. Fecha pela entrada anterior, que guarda rolagem e foco.
  const fechandoSemAlvo = useRef(false)
  useEffect(() => {
    if (!denunciaAberta) {
      fechandoSemAlvo.current = false
      return
    }
    if (alvoDaDenuncia !== null || fechandoSemAlvo.current) return
    fechandoSemAlvo.current = true
    aoMudarDenuncia(false)
  }, [denunciaAberta, alvoDaDenuncia, aoMudarDenuncia])

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
          resolvidaPorResposta: null,
          propria: true,
          autor: "Você",
          autorId: "",
          cidade: casca.cidade,
          salva: false,
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
    setErroDoSeguir(null)
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
  // A pergunta de demonstração não tem banco: resolver nela seria mentira.
  const podeResolver = pergunta.propria && local === null

  async function mudar(acao: AcaoDeResolucao, respostaId?: string) {
    if (mudandoResolucao) return
    setMudandoResolucao(true)
    setErroDaResolucao(null)
    try {
      const estado = await mudarResolucao(id, acao, respostaId, { signal: controle.signal })
      setDados({
        ...atual,
        pergunta: {
          ...pergunta,
          resolvida: estado.resolvida,
          resolvidaPorResposta: estado.resolvidaPorResposta,
        },
      })
    } catch (falha: unknown) {
      if (!foiAbortada(falha)) setErroDaResolucao(fraseDaResolucao(falha))
    } finally {
      setMudandoResolucao(false)
    }
  }

  // Seguir respostas: otimista, porque o rótulo é a própria confirmação. A
  // falha desfaz o que a tela já mostrou e diz por quê.
  async function alternarSeguir() {
    if (mudandoSeguir) return
    const alvo = !pergunta.salva
    setMudandoSeguir(true)
    setErroDoSeguir(null)
    setDados({ ...atual, pergunta: { ...pergunta, salva: alvo } })
    try {
      const salvo = await marcarSalvaPergunta(id, alvo, { signal: controle.signal })
      setDados({ ...atual, pergunta: { ...pergunta, salva: salvo } })
    } catch (falha: unknown) {
      if (!foiAbortada(falha)) {
        setDados(atual)
        setErroDoSeguir(fraseDoSeguir(falha))
      }
    } finally {
      setMudandoSeguir(false)
    }
  }

  function abrirDenuncia(alvo: AlvoDaDenuncia) {
    setAlvoDaDenuncia(alvo)
    setDenunciando(false)
    setMotivo("")
    setExplicacao("")
    setErroDaDenuncia(null)
    setAvisoDaDenuncia("")
    aoMudarDenuncia(true)
  }

  // A denúncia é GRAVADA antes do aviso: quem denunciou lê a confirmação, e a
  // duplicata (409) chega com a frase do servidor, não com sucesso inventado.
  async function denunciar() {
    if (alvoDaDenuncia === null || enviandoDenuncia || motivo === "") return
    setEnviandoDenuncia(true)
    setErroDaDenuncia(null)
    setAvisoDaDenuncia("")
    try {
      await denunciarPergunta(
        id,
        alvoDaDenuncia.tipo === "resposta"
          ? { motivo, explicacao, respostaId: alvoDaDenuncia.respostaId }
          : { motivo, explicacao },
        { signal: controle.signal },
      )
      if (controle.signal.aborted) return
      aoMudarDenuncia(false)
      setAvisoDaDenuncia("Denúncia enviada. A moderação vai analisar.")
    } catch (falha: unknown) {
      if (!foiAbortada(falha))
        setErroDaDenuncia(
          falha instanceof FalhaDaApi && falha.mensagem !== null
            ? falha.mensagem
            : "Não foi possível enviar a denúncia. Tente de novo.",
        )
    } finally {
      if (!controle.signal.aborted) setEnviandoDenuncia(false)
    }
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
              autorId: "",
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
            <NomeDeMembro
              nome={pergunta.propria ? "Você" : pergunta.autor || "Alguém da cidade"}
              aoAbrir={
                pergunta.propria || pergunta.autorId === ""
                  ? undefined
                  : () => void navegacao.irPara("perfil", { parametros: { id: pergunta.autorId } })
              }
            />
            <small className="text-[13px] text-(--on-surface-variant)">
              {pergunta.cidade || casca.cidade}
            </small>
          </span>
          {!pergunta.propria && local === null ? (
            <BotaoDeIcone
              nome="more_vert"
              rotulo="Opções da pergunta"
              aberto="dialog"
              disabled={enviandoDenuncia}
              className="ml-auto"
              onClick={() => abrirDenuncia({ tipo: "pergunta" })}
            />
          ) : null}
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
        {podeResolver && pergunta.resolvida ? (
          <div className="flex justify-start">
            <Botao
              tom="texto"
              icone="undo"
              disabled={mudandoResolucao}
              onClick={() => void mudar("reabrir")}
            >
              Reabrir pergunta
            </Botao>
          </div>
        ) : null}
        {local === null ? (
          <div className="flex justify-start">
            <Botao
              tom="tonal"
              icone={pergunta.salva ? "bookmark" : "bookmark_border"}
              aria-pressed={pergunta.salva}
              disabled={mudandoSeguir}
              onClick={() => void alternarSeguir()}
            >
              {pergunta.salva ? "Seguindo respostas" : "Seguir respostas"}
            </Botao>
          </div>
        ) : null}
      </article>

      {erroDoSeguir === null ? null : (
        <p role="alert" className="text-sm text-(--destructive)">
          {erroDoSeguir}
        </p>
      )}

      {erroDaResolucao === null ? null : (
        <p role="alert" className="text-sm text-(--destructive)">
          {erroDaResolucao}
        </p>
      )}

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
                      <NomeDeMembro
                        nome={item.propria ? "Você" : item.autor || "Membro da comunidade"}
                        aoAbrir={
                          item.propria || item.autorId === ""
                            ? undefined
                            : () =>
                                void navegacao.irPara("perfil", {
                                  parametros: { id: item.autorId },
                                })
                        }
                      />
                      <small className="text-[12px] text-(--on-surface-variant)">
                        Membro da comunidade
                      </small>
                    </span>
                    {item.propria ? null : (
                      <BotaoDeIcone
                        nome="more_vert"
                        rotulo="Opções da resposta"
                        aberto="dialog"
                        disabled={enviandoDenuncia}
                        className="ml-auto"
                        onClick={() => abrirDenuncia({ tipo: "resposta", respostaId: item.id })}
                      />
                    )}
                  </div>
                  <p className="text-[15px] leading-6">{item.corpo}</p>
                  {!podeResolver ? null : pergunta.resolvidaPorResposta === item.id ? (
                    <div className="flex items-center gap-2">
                      <Etiqueta tom="ok" icone="check_circle">
                        Resolveu a pergunta
                      </Etiqueta>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Botao
                        tom="texto"
                        icone="check_circle"
                        disabled={mudandoResolucao}
                        onClick={() => void mudar("marcar", item.id)}
                      >
                        Ajudou a resolver
                      </Botao>
                    </div>
                  )}
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

      {avisoDaDenuncia === "" ? null : <p role="status">{avisoDaDenuncia}</p>}

      <Dialog open={denunciaAberta && alvoDaDenuncia !== null} onOpenChange={aoMudarDenuncia}>
        <DialogContent>
          <DialogTitle>
            {denunciando && alvoDaDenuncia !== null
              ? `Denunciar ${alvoDaDenuncia.tipo}`
              : `Opções da ${alvoDaDenuncia?.tipo ?? "pergunta"}`}
          </DialogTitle>
          <DialogDescription>
            {denunciando
              ? "O motivo será enviado à moderação. Não inclua dados pessoais."
              : "A moderação analisa toda denúncia."}
          </DialogDescription>
          {denunciando ? (
            <form
              className="grid gap-3"
              onSubmit={(evento) => {
                evento.preventDefault()
                void denunciar()
              }}
            >
              <fieldset className="grid gap-2">
                <legend>Motivo</legend>
                {MOTIVOS_DA_DENUNCIA.map(([valor, rotulo]) => (
                  <label key={valor} className="flex min-h-11 items-center gap-3">
                    <input
                      type="radio"
                      name="motivo-denuncia"
                      value={valor}
                      checked={motivo === valor}
                      onChange={() => setMotivo(valor)}
                    />
                    {rotulo}
                  </label>
                ))}
              </fieldset>
              <Campo
                id="explicacao-denuncia"
                rotulo="Explicação (opcional)"
                valor={explicacao}
                aoMudar={setExplicacao}
                area
                nota={`${explicacao.length}/300 caracteres`}
              />
              <Botao
                type="submit"
                disabled={enviandoDenuncia || motivo === "" || explicacao.trim().length > 300}
              >
                {enviandoDenuncia ? "Enviando…" : "Enviar denúncia"}
              </Botao>
              <Botao type="button" tom="texto" onClick={() => setDenunciando(false)}>
                Voltar às opções
              </Botao>
            </form>
          ) : alvoDaDenuncia !== null ? (
            <div className="grid gap-2">
              <Botao tom="texto" disabled={enviandoDenuncia} onClick={() => setDenunciando(true)}>
                Denunciar {alvoDaDenuncia.tipo}
              </Botao>
            </div>
          ) : null}
          {erroDaDenuncia === null ? null : <p role="alert">{erroDaDenuncia}</p>}
        </DialogContent>
      </Dialog>
    </section>
  )
}
