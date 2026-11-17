"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"

import { Botao, BotaoDeIcone } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import { NomeDeMembro } from "@/components/bivaque/nome-de-membro"
import { Secao } from "@/components/bivaque/secao"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  type AcaoDeResolucao,
  buscarPergunta,
  denunciarPergunta,
  editarPergunta,
  editarResposta,
  excluirPergunta,
  excluirResposta,
  marcarSalvaPergunta,
  mudarResolucao,
  type PerguntaDaConversa,
  responderPergunta,
} from "@/lib/dados/perguntas"
import { bloquear, lerBloqueados } from "@/lib/dados/voce"
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

/** O alvo do menu: a pergunta inteira ou uma resposta dela. */
type AlvoDoMenu = Readonly<{ tipo: "pergunta" } | { tipo: "resposta"; respostaId: string }>

/** Em que passo do menu a pessoa está. Um diálogo só, sem sobreposição empilhada. */
type PassoDoMenu = "opcoes" | "editar" | "excluir" | "denunciar"

/** O endereço que se compartilha é a tela da pergunta no app. */
function linkDaPergunta(id: string): string {
  return `${window.location.origin}/app/pergunta/${encodeURIComponent(id)}`
}

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
  // O menu ⋮ (F04/F09): a sobreposição vive na entrada, como o menu da publicação
  // de grupo; o alvo escolhido e o passo vivem aqui. Um diálogo só — trocar de
  // passo em vez de empilhar sobreposição é o que faz o Voltar fechar o menu, e
  // não a folha de dentro dele (RUN-165).
  const { aberto: menuAberto, aoMudarAberto: aoMudarMenu } =
    useSobreposicaoDaEntrada("menu-de-linha")
  const [alvoDoMenu, setAlvoDoMenu] = useState<AlvoDoMenu | null>(null)
  const [passo, setPasso] = useState<PassoDoMenu>("opcoes")
  const [denunciando, setDenunciando] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [explicacao, setExplicacao] = useState("")
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false)
  const [erroDaDenuncia, setErroDaDenuncia] = useState<string | null>(null)
  const [avisoDaDenuncia, setAvisoDaDenuncia] = useState("")
  // Edição e exclusão da autoria (F09 lote 2), no mesmo diálogo do menu.
  const [tituloEmEdicao, setTituloEmEdicao] = useState("")
  const [assuntoEmEdicao, setAssuntoEmEdicao] = useState("")
  const [erroDaEdicao, setErroDaEdicao] = useState<string | null>(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [erroDaExclusao, setErroDaExclusao] = useState<string | null>(null)
  const [avisoDoLink, setAvisoDoLink] = useState("")
  const [autorParaBloquear, setAutorParaBloquear] = useState<string | null>(null)
  const [confirmandoBloqueio, setConfirmandoBloqueio] = useState(false)
  const [bloqueando, setBloqueando] = useState(false)
  const [avisoDoBloqueio, setAvisoDoBloqueio] = useState("")
  const focoAoFecharBloqueio = useRef(false)
  const tituloRef = useRef<HTMLHeadingElement>(null)
  // Uma sessão de rede por tela: sair cancela a escrita que ainda estava a caminho.
  const [controle] = useState(() => new AbortController())

  useRolagemEFoco(CARGA_CONCLUIDA)

  useEffect(() => () => controle.abort(), [controle])

  useEffect(() => {
    if (confirmandoBloqueio || !focoAoFecharBloqueio.current) return
    focoAoFecharBloqueio.current = false
    tituloRef.current?.focus()
  }, [confirmandoBloqueio])

  // A entrada guarda a sobreposição, não o alvo: uma recarga com o menu aberto
  // volta sem alvo, e a casca deixaria o corpo inerte com um diálogo que não
  // existe. Fecha pela entrada anterior, que guarda rolagem e foco.
  const fechandoSemAlvo = useRef(false)
  useEffect(() => {
    if (!menuAberto) {
      fechandoSemAlvo.current = false
      return
    }
    if (alvoDoMenu !== null || fechandoSemAlvo.current) return
    fechandoSemAlvo.current = true
    aoMudarMenu(false)
  }, [menuAberto, alvoDoMenu, aoMudarMenu])

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
          editada: false,
          resolvida: local.is_resolved === true,
          resolvidaPorResposta: null,
          propria: true,
          autor: "Você",
          autorId: "",
          cidade: casca.cidade,
          grupo: null,
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
  // O menu trabalha sobre uma resposta só; guardar a linha inteira evita três
  // buscas pelo mesmo id dentro do JSX.
  const respostaDoMenu =
    alvoDoMenu?.tipo === "resposta"
      ? (respostas.find((item) => item.id === alvoDoMenu.respostaId) ?? null)
      : null
  const tituloDoMenu =
    passo === "editar"
      ? `Editar ${alvoDoMenu?.tipo ?? "pergunta"}`
      : passo === "excluir"
        ? `Excluir ${alvoDoMenu?.tipo ?? "pergunta"}?`
        : denunciando
          ? `Denunciar ${alvoDoMenu?.tipo ?? "pergunta"}`
          : `Opções da ${alvoDoMenu?.tipo ?? "pergunta"}`
  const descricaoDoMenu =
    passo === "editar"
      ? "O texto novo fica visível para a comunidade assim que você salvar."
      : passo === "excluir"
        ? alvoDoMenu?.tipo === "pergunta"
          ? "A conversa inteira sai com a pergunta. Não dá para desfazer."
          : "A resposta sai da conversa. Não dá para desfazer."
        : denunciando
          ? "O motivo será enviado à moderação. Não inclua dados pessoais."
          : "A moderação analisa toda denúncia."

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

  function abrirMenu(alvo: AlvoDoMenu) {
    setAlvoDoMenu(alvo)
    setPasso("opcoes")
    setDenunciando(false)
    setMotivo("")
    setExplicacao("")
    setErroDaDenuncia(null)
    setAvisoDaDenuncia("")
    setAutorParaBloquear(null)
    setConfirmandoBloqueio(false)
    setAvisoDoBloqueio("")
    setErroDaEdicao(null)
    setErroDaExclusao(null)
    aoMudarMenu(true)
  }

  // Autoria (F09 lote 2): o formulário abre com o texto de hoje e a falha fica
  // no próprio formulário, para o texto escrito não se perder.
  function abrirEdicao() {
    if (alvoDoMenu === null) return
    if (alvoDoMenu.tipo === "pergunta") {
      setTituloEmEdicao(pergunta.titulo)
      setAssuntoEmEdicao(pergunta.corpo)
    } else {
      setTituloEmEdicao("")
      setAssuntoEmEdicao(respostas.find((item) => item.id === alvoDoMenu.respostaId)?.corpo ?? "")
    }
    setErroDaEdicao(null)
    setPasso("editar")
  }

  // Editar é GRAVADO antes de fechar: o que a tela mostra é o que o servidor
  // devolveu, inclusive a marca "editada" do banco.
  async function salvarEdicao() {
    if (alvoDoMenu === null || salvandoEdicao) return
    setSalvandoEdicao(true)
    setErroDaEdicao(null)
    try {
      if (alvoDoMenu.tipo === "pergunta") {
        const gravada = await editarPergunta(
          id,
          { titulo: tituloEmEdicao, corpo: assuntoEmEdicao },
          { signal: controle.signal },
        )
        setDados({
          ...atual,
          pergunta: {
            ...pergunta,
            titulo: gravada.titulo,
            corpo: gravada.corpo,
            editada: gravada.editada,
          },
        })
      } else {
        const gravada = await editarResposta(id, alvoDoMenu.respostaId, assuntoEmEdicao, {
          signal: controle.signal,
        })
        setDados({
          ...atual,
          respostas: respostas.map((item) =>
            item.id === alvoDoMenu.respostaId
              ? { ...item, corpo: gravada.corpo, editada: gravada.editada }
              : item,
          ),
        })
      }
      aoMudarMenu(false)
    } catch (falha: unknown) {
      if (!foiAbortada(falha)) setErroDaEdicao("Não foi possível salvar a edição. Tente de novo.")
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // A exclusão da resposta que resolvia a pergunta reabre o pedido no banco: a
  // tela relê a conversa em vez de adivinhar o novo estado.
  async function confirmarExclusao() {
    if (alvoDoMenu === null || excluindo) return
    setExcluindo(true)
    setErroDaExclusao(null)
    try {
      if (alvoDoMenu.tipo === "pergunta") {
        await excluirPergunta(id, { signal: controle.signal })
        // A pergunta não existe mais: a entrada é substituída pela Comunidade,
        // para o Voltar não reabrir uma tela de pergunta apagada.
        await navegacao.irPara("comunidade", { replace: true })
        return
      }
      const alvo = alvoDoMenu.respostaId
      await excluirResposta(id, alvo, { signal: controle.signal })
      const resolvia = pergunta.resolvidaPorResposta === alvo
      setDados({
        ...atual,
        pergunta: resolvia
          ? { ...pergunta, resolvida: false, resolvidaPorResposta: null }
          : pergunta,
        respostas: respostas.filter((item) => item.id !== alvo),
      })
      aoMudarMenu(false)
    } catch (falha: unknown) {
      if (!foiAbortada(falha)) setErroDaExclusao("Não foi possível excluir. Tente de novo.")
    } finally {
      setExcluindo(false)
    }
  }

  // Compartilhar (F09 lote 2): a folha do sistema quando existe; senão o link
  // vai para a área de transferência, com aviso. Cancelar a folha não é falha.
  async function compartilhar() {
    const link = linkDaPergunta(id)
    setAvisoDoLink("")
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: pergunta.titulo, url: link })
        return
      }
      await navigator.clipboard.writeText(link)
      setAvisoDoLink("Link copiado.")
    } catch (falha: unknown) {
      if (falha instanceof DOMException && falha.name === "AbortError") return
      setAvisoDoLink("Não foi possível copiar o link. Copie o endereço do navegador.")
    }
  }

  function resolverSemResposta() {
    aoMudarMenu(false)
    void mudar("resolver")
  }

  // A denúncia é GRAVADA antes do aviso: quem denunciou lê a confirmação, e a
  // duplicata (409) chega com a frase do servidor, não com sucesso inventado.
  async function denunciar() {
    if (alvoDoMenu === null || enviandoDenuncia || motivo === "") return
    setEnviandoDenuncia(true)
    setErroDaDenuncia(null)
    setAvisoDaDenuncia("")
    try {
      await denunciarPergunta(
        id,
        alvoDoMenu.tipo === "resposta"
          ? { motivo, explicacao, respostaId: alvoDoMenu.respostaId }
          : { motivo, explicacao },
        { signal: controle.signal },
      )
      if (controle.signal.aborted) return
      const autorId =
        alvoDoMenu.tipo === "resposta"
          ? respostas.find((item) => item.id === alvoDoMenu.respostaId)?.autorId
          : pergunta.autorId
      const autorProprio =
        alvoDoMenu.tipo === "resposta"
          ? respostas.find((item) => item.id === alvoDoMenu.respostaId)?.propria
          : pergunta.propria
      if (autorId && !autorProprio) {
        try {
          const bloqueados = await lerBloqueados({ signal: controle.signal })
          if (bloqueados.some((item) => item.id === autorId)) {
            setAvisoDoBloqueio("Esta pessoa já está bloqueada.")
          } else {
            setAutorParaBloquear(autorId)
          }
        } catch {
          setAutorParaBloquear(autorId)
        }
      }
      aoMudarMenu(false)
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

  async function confirmarBloqueio() {
    if (autorParaBloquear === null || bloqueando) return
    setBloqueando(true)
    try {
      await bloquear(autorParaBloquear, { signal: controle.signal })
      setAvisoDoBloqueio("Pessoa bloqueada.")
    } catch {
      setAvisoDoBloqueio("Não foi possível bloquear esta pessoa. Tente de novo.")
    } finally {
      focoAoFecharBloqueio.current = true
      setConfirmandoBloqueio(false)
      setBloqueando(false)
    }
  }

  function fecharConfirmacaoBloqueio() {
    focoAoFecharBloqueio.current = true
    setConfirmandoBloqueio(false)
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
              editada: false,
              verbete: null,
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
              {pergunta.editada ? " · editada" : ""}
            </small>
          </span>
          {local === null ? (
            <BotaoDeIcone
              nome="more_vert"
              rotulo={pergunta.propria ? "Ações da minha pergunta" : "Opções da pergunta"}
              aberto="dialog"
              disabled={!pergunta.propria && enviandoDenuncia}
              className="ml-auto"
              onClick={() => abrirMenu({ tipo: "pergunta" })}
            />
          ) : null}
        </div>
        <h1
          ref={tituloRef}
          id="titulo-da-tela"
          data-titulo-da-tela
          tabIndex={-1}
          className="text-[22px] leading-7"
        >
          {pergunta.titulo}
        </h1>
        {pergunta.grupo === null ? null : (
          <button
            type="button"
            data-origem-da-pergunta="grupo"
            className="flex min-h-11 w-fit items-center gap-2 rounded-xl bg-(--secondary-container) px-3 text-left text-sm"
            onClick={() =>
              void navegacao.irPara("grupo", { parametros: { id: pergunta.grupo?.id ?? "" } })
            }
          >
            <Icone nome="groups" className="size-4 shrink-0" />
            {`Perguntada no grupo ${pergunta.grupo.nome || "da cidade"} · ver o grupo`}
          </button>
        )}
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
          <div className="flex flex-wrap items-center justify-start gap-2">
            <Botao
              tom="tonal"
              icone={pergunta.salva ? "bookmark" : "bookmark_border"}
              aria-pressed={pergunta.salva}
              disabled={mudandoSeguir}
              onClick={() => void alternarSeguir()}
            >
              {pergunta.salva ? "Seguindo respostas" : "Seguir respostas"}
            </Botao>
            <Botao tom="texto" icone="share" onClick={() => void compartilhar()}>
              Compartilhar
            </Botao>
          </div>
        ) : null}
      </article>

      {avisoDoLink === "" ? null : (
        <p role="status" className="text-sm text-(--on-surface-variant)">
          {avisoDoLink}
        </p>
      )}

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
                        {item.editada ? "Membro da comunidade · editada" : "Membro da comunidade"}
                      </small>
                    </span>
                    <BotaoDeIcone
                      nome="more_vert"
                      rotulo={item.propria ? "Ações da minha resposta" : "Opções da resposta"}
                      aberto="dialog"
                      disabled={!item.propria && enviandoDenuncia}
                      className="ml-auto"
                      onClick={() => abrirMenu({ tipo: "resposta", respostaId: item.id })}
                    />
                  </div>
                  <p className="text-[15px] leading-6">{item.corpo}</p>
                  {item.verbete === null ? null : (
                    <Botao
                      tom="texto"
                      icone="link"
                      data-verbete={item.verbete.id}
                      onClick={() =>
                        void navegacao.irPara("verbete", {
                          parametros: { id: item.verbete?.id ?? "" },
                        })
                      }
                    >
                      {`${item.verbete.nome || "Verbete"} no Guia`}
                    </Botao>
                  )}
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

      {avisoDaDenuncia === "" ? null : (
        <div role="status" tabIndex={-1} className="grid justify-items-start gap-1">
          <p>{avisoDaDenuncia}</p>
          {autorParaBloquear === null || avisoDoBloqueio === "Pessoa bloqueada." ? null : (
            <Botao
              tom="texto"
              onClick={() => {
                setAvisoDoBloqueio("")
                setConfirmandoBloqueio(true)
              }}
            >
              Bloquear autor
            </Botao>
          )}
          {avisoDoBloqueio === "" ? null : <p>{avisoDoBloqueio}</p>}
        </div>
      )}

      <Dialog
        open={confirmandoBloqueio}
        onOpenChange={(aberto) => {
          if (!aberto) fecharConfirmacaoBloqueio()
        }}
      >
        <DialogContent>
          <DialogTitle>Bloquear esta pessoa?</DialogTitle>
          <DialogDescription>
            A conversa ficará fechada nos dois sentidos. A pessoa não será avisada.
          </DialogDescription>
          <div className="flex flex-wrap justify-end gap-2">
            <Botao tom="texto" disabled={bloqueando} onClick={fecharConfirmacaoBloqueio}>
              Cancelar
            </Botao>
            <Botao disabled={bloqueando} onClick={() => void confirmarBloqueio()}>
              {bloqueando ? "Bloqueando…" : "Bloquear"}
            </Botao>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={menuAberto && alvoDoMenu !== null} onOpenChange={aoMudarMenu}>
        <DialogContent>
          <DialogTitle>{tituloDoMenu}</DialogTitle>
          <DialogDescription>{descricaoDoMenu}</DialogDescription>
          {passo === "editar" ? (
            <form
              className="grid gap-3"
              onSubmit={(evento) => {
                evento.preventDefault()
                void salvarEdicao()
              }}
            >
              {alvoDoMenu?.tipo === "pergunta" ? (
                <Campo
                  id="edicao-do-titulo"
                  rotulo="Título da pergunta"
                  valor={tituloEmEdicao}
                  aoMudar={setTituloEmEdicao}
                  maxLength={300}
                  nota={`${tituloEmEdicao.trim().length} de 300 caracteres`}
                />
              ) : null}
              <Campo
                id="edicao-do-texto"
                rotulo={alvoDoMenu?.tipo === "pergunta" ? "Assunto" : "Sua resposta"}
                valor={assuntoEmEdicao}
                aoMudar={setAssuntoEmEdicao}
                area
              />
              {erroDaEdicao === null ? null : <p role="alert">{erroDaEdicao}</p>}
              <Botao type="submit" disabled={salvandoEdicao}>
                {salvandoEdicao ? "Salvando…" : "Salvar"}
              </Botao>
              <Botao type="button" tom="texto" onClick={() => setPasso("opcoes")}>
                Voltar às opções
              </Botao>
            </form>
          ) : passo === "excluir" ? (
            <div className="grid gap-3">
              {erroDaExclusao === null ? null : <p role="alert">{erroDaExclusao}</p>}
              <Botao
                tom="contornado"
                icone="delete"
                data-acao="confirmar-exclusao"
                disabled={excluindo}
                onClick={() => void confirmarExclusao()}
              >
                {excluindo ? "Excluindo…" : `Excluir ${alvoDoMenu?.tipo ?? "pergunta"}`}
              </Botao>
              <Botao type="button" tom="texto" onClick={() => setPasso("opcoes")}>
                Cancelar
              </Botao>
            </div>
          ) : denunciando ? (
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
          ) : alvoDoMenu !== null ? (
            <div className="grid gap-2">
              {alvoDoMenu.tipo === "resposta" && !(respostaDoMenu?.propria === true) ? (
                <Botao tom="texto" disabled={enviandoDenuncia} onClick={() => setDenunciando(true)}>
                  Denunciar resposta
                </Botao>
              ) : alvoDoMenu.tipo === "pergunta" && !pergunta.propria ? (
                <Botao tom="texto" disabled={enviandoDenuncia} onClick={() => setDenunciando(true)}>
                  Denunciar pergunta
                </Botao>
              ) : (
                <>
                  <Botao
                    tom="texto"
                    icone="edit"
                    onClick={() => abrirEdicao()}
                  >{`Editar ${alvoDoMenu.tipo}`}</Botao>
                  {alvoDoMenu.tipo === "pergunta" && !pergunta.resolvida ? (
                    <Botao
                      tom="texto"
                      icone="check_circle"
                      disabled={mudandoResolucao}
                      onClick={resolverSemResposta}
                    >
                      Marcar como resolvida
                    </Botao>
                  ) : null}
                  <Botao
                    tom="texto"
                    icone="delete"
                    onClick={() => {
                      setErroDaExclusao(null)
                      setPasso("excluir")
                    }}
                  >{`Excluir ${alvoDoMenu.tipo}`}</Botao>
                </>
              )}
            </div>
          ) : null}
          {erroDaDenuncia === null ? null : <p role="alert">{erroDaDenuncia}</p>}
        </DialogContent>
      </Dialog>
    </section>
  )
}
