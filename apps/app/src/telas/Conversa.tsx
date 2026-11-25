"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Botao, BotaoDeIcone } from "@/components/bivaque/botao"
import { Confirmacao } from "@/components/bivaque/confirmacao"
import { ContextoDaConversa } from "@/components/bivaque/contexto-conversa"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { ItemDoMenu, MenuDaLinha } from "@/components/bivaque/menu-de-linha"
import { NomeDeMembro } from "@/components/bivaque/nome-de-membro"
import { Sobreposicao } from "@/components/bivaque/sobreposicao"
import { Textarea } from "@/components/ui/textarea"
import { enviar, FalhaDaApi } from "@/lib/api/cliente"
import {
  buscarConversa,
  type Caixa,
  type DetalheDaConversa,
  enviarMensagem,
  lerConversas,
  type Mensagem,
  marcarConversaLida,
  novaChaveDeEnvio,
} from "@/lib/dados/conversas"
import { bloquear, lerBloqueados } from "@/lib/dados/voce"
import { useNavegacao, useRolagemEFoco, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { useLarguraDaTela } from "@/src/casca/ganchos"
import { useCasca } from "@/src/contexto/casca"
import { CabecaDoItem } from "@/src/conversas/CabecaDoItem"
import { contexto } from "@/src/conversas/contexto"
import { tomarDenunciaPedida } from "@/src/conversas/denunciaPedida"
import { useItemDaConversa } from "@/src/conversas/item"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, sessaoVencida } from "@/src/eventos/formulario"
import { Avatar } from "@/src/pecas/pecas"
import { ListaDeConversas } from "@/src/telas/Conversas"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/** Os motivos são os da regra compartilhada (`lib/reports/reports`). */
const MOTIVOS_DA_DENUNCIA: ReadonlyArray<readonly [string, string]> = [
  ["spam", "Spam"],
  ["conteudo-inadequado", "Conteúdo inadequado"],
  ["informacao-enganosa", "Informação enganosa"],
  ["outro", "Outro"],
]

/**
 * A conversa (F09). No computador (referência Mobbin, Chats com conversa
 * aberta: https://mobbin.com/screens/fd834924-6a02-4fa0-a5e7-1c3d20f9c549) a
 * caixa fica à esquerda e a conversa, à direita, com o nome de quem conversa
 * UMA vez, no cabeçalho do painel. No celular, lista → conversa.
 *
 * O menu ⋯ é folha de baixo no celular (referência Mobbin, menu ⋯ como folha:
 * https://mobbin.com/screens/f23df80d-4b7d-4a7a-8abc-fdeadbc0bedd) e suspenso
 * no computador. A denúncia é folha e cita a mensagem denunciada.
 */
const ICONE_DO_ITEM: Readonly<Record<string, "sell" | "storefront" | "forum">> = {
  listing: "sell",
  provider: "storefront",
  shared_group: "forum",
}
const ROTA_DO_ITEM: Readonly<Record<string, string>> = {
  listing: "anuncio",
  provider: "negocio",
  shared_group: "grupo",
}

export function Conversa() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const navegacao = useNavegacao()
  const largura = useLarguraDaTela()
  const menuSuspenso = largura >= 1024
  const [dados, setDados] = useState<DetalheDaConversa | null>(null)
  const [caixa, setCaixa] = useState<Caixa | null>(null)
  const [erroCaixa, setErroCaixa] = useState(false)
  const [rodadaCaixa, setRodadaCaixa] = useState(0)
  const balaoFalho = useRef<HTMLDivElement>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | "ausente" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [rascunho, setRascunho] = useState("")
  const [enviando, setEnviando] = useState(false)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroLocal, setErroLocal] = useState("")
  /**
   * O envio que falhou, como balão da própria mensagem (revisão cega 18/11).
   * O anúncio de leitor de tela ("Seu texto foi mantido") é região viva
   * OCULTA no compositor: visível é só o balão — nada de rodapé duplicado
   * (D22/D3).
   */
  const [naoEnviada, setNaoEnviada] = useState<string | null>(null)
  const [anuncioDeEnvio, setAnuncioDeEnvio] = useState("")
  const [aviso, setAviso] = useState("")
  const [mostrarSeguranca, setMostrarSeguranca] = useState(false)
  /** Quem EU bloqueei. O bloqueio da outra pessoa nunca chega ao cliente. */
  const [meusBloqueios, setMeusBloqueios] = useState<readonly string[]>([])
  const [denunciando, setDenunciando] = useState<Mensagem | null>(null)
  const [motivo, setMotivo] = useState("")
  const [explicacao, setExplicacao] = useState("")
  const [agindo, setAgindo] = useState(false)
  const denuncia = useSobreposicaoDaEntrada("conversa-denuncia")
  const menuDaLinha = useSobreposicaoDaEntrada("menu-de-linha")
  const itemDaConversa = useItemDaConversa(
    dados?.conversa.tipo ?? "",
    dados?.conversa.contextoId ?? "",
  )
  const controle = useRef<AbortController | null>(null)
  const envioEmCurso = useRef(false)
  const paginaEmCurso = useRef(false)
  const ultimaChave = useRef<{ texto: string; chave: string } | null>(null)
  useRolagemEFoco(CARGA_CONCLUIDA)
  // A lista de bloqueios é a única fonte do estado "eu bloqueei": ela é minha,
  // sob a RLS, e o banco continua sendo quem recusa a escrita. Se a leitura
  // falhar, o compositor fica como está e a recusa chega na hora de enviar —
  // nunca se inventa bloqueio nem se esconde a conversa.
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada relê os bloqueios
  useEffect(() => {
    const pedido = new AbortController()
    void lerBloqueados({ signal: pedido.signal })
      .then((lista) => {
        if (!pedido.signal.aborted) setMeusBloqueios(lista.map((pessoa) => pessoa.id))
      })
      .catch(() => {
        if (!pedido.signal.aborted) setMeusBloqueios([])
      })
    return () => pedido.abort()
  }, [rodada])
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodadaCaixa solicita nova leitura
  useEffect(() => {
    const pedido = new AbortController()
    setErroCaixa(false)
    setCaixa(null)
    // A caixa da coluna da esquerda (≥768) lê junto com a conversa; se falhar,
    // a conversa segue e a coluna fica como estava.
    void lerConversas({ signal: pedido.signal })
      .then((lida) => {
        if (!pedido.signal.aborted) setCaixa(lida)
      })
      .catch(() => {
        if (!pedido.signal.aborted) setErroCaixa(true)
      })
    return () => pedido.abort()
  }, [id, rodadaCaixa])
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada solicita nova leitura
  useEffect(() => {
    const pedido = new AbortController()
    controle.current = pedido
    envioEmCurso.current = false
    paginaEmCurso.current = false
    setDados(null)
    setErro(null)
    setErroLocal("")
    setEnviando(false)
    setCarregandoMais(false)
    setNaoEnviada(null)
    setAnuncioDeEnvio("")
    void buscarConversa(id, { signal: pedido.signal })
      .then((valor) => {
        if (!pedido.signal.aborted) {
          setDados(valor)
          void marcarConversaLida(id, pedido.signal)
            .then(() => lerConversas({ signal: pedido.signal }))
            .then((lida) => {
              if (!pedido.signal.aborted) {
                casca.definir({ conversas: lida.porLer })
                setCaixa(lida)
              }
            })
            .catch(() => undefined)
        }
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
    ultimaChave.current = null
  }, [id])
  const nome = dados?.conversa.nome ?? ""
  const outroId = dados?.conversa.outroId ?? ""
  // Vindo do "Denunciar" do perfil (rodada 3, M2): com a conversa lida, abre a
  // folha da última mensagem recebida; sem mensagem da pessoa, diz por quê.
  // biome-ignore lint/correctness/useExhaustiveDependencies: o pedido vale para a carga desta conversa
  useEffect(() => {
    if (dados === null || !tomarDenunciaPedida(id)) return
    const recebida = dados.mensagens.filter((mensagem) => !mensagem.minha).at(-1) ?? null
    if (recebida === null) {
      setAviso(`Ainda não há mensagem de ${dados.conversa.nome} para denunciar nesta conversa.`)
      return
    }
    abrirDenuncia(recebida)
  }, [dados, id])
  useEffect(() => {
    if (naoEnviada !== null) balaoFalho.current?.scrollIntoView({ block: "nearest" })
  }, [naoEnviada])
  async function enviarTexto(texto = rascunho, reenvio = false) {
    const pedido = controle.current
    if (!pedido || pedido.signal.aborted || envioEmCurso.current || !texto.trim()) return
    const anterior = ultimaChave.current
    const clientKey =
      anterior !== null && anterior.texto === texto ? anterior.chave : novaChaveDeEnvio()
    envioEmCurso.current = true
    ultimaChave.current = { texto, chave: clientKey }
    setEnviando(true)
    setErroLocal("")
    setAnuncioDeEnvio("")
    try {
      const mensagem = await enviarMensagem(id, texto, { signal: pedido.signal, clientKey })
      if (!pedido.signal.aborted) {
        setDados((atual) =>
          atual ? { ...atual, mensagens: [...atual.mensagens, mensagem] } : atual,
        )
        if (!reenvio) setRascunho("")
        setNaoEnviada((atual) => (atual === texto ? null : atual))
        setAnuncioDeEnvio("")
        ultimaChave.current = null
      }
    } catch {
      // A mensagem que não saiu fica visível como balão seu, marcada
      // "Não enviada", com a ação de tentar de novo; o campo volta limpo e o
      // texto fica só no balão.
      // O leitor de tela ouve o fato pelo anúncio oculto; o que se VÊ é só o
      // balão (D22: um texto por erro).
      if (!pedido.signal.aborted) {
        setAnuncioDeEnvio("Não foi possível enviar. Seu texto foi mantido.")
        setNaoEnviada(texto)
        if (!reenvio) setRascunho("")
      }
    } finally {
      if (!pedido.signal.aborted) {
        envioEmCurso.current = false
        setEnviando(false)
      }
    }
  }
  async function mais() {
    const pedido = controle.current
    if (!pedido || pedido.signal.aborted || !dados?.anterior || paginaEmCurso.current) return
    paginaEmCurso.current = true
    const cursor = dados.anterior
    setCarregandoMais(true)
    setErroLocal("")
    try {
      const pagina = await buscarConversa(id, { antes: cursor, signal: pedido.signal })
      if (!pedido.signal.aborted)
        setDados((atual) =>
          atual?.anterior === cursor
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
      if (!pedido.signal.aborted) {
        paginaEmCurso.current = false
        setCarregandoMais(false)
      }
    }
  }
  async function bloquearPessoa() {
    if (agindo || outroId === "") return
    setAgindo(true)
    setErroLocal("")
    setAviso("")
    try {
      await bloquear(outroId)
      setMeusBloqueios((atuais) => (atuais.includes(outroId) ? atuais : [...atuais, outroId]))
      setRascunho("")
      setAviso("Você bloqueou esta pessoa. A conversa fica fechada nos dois sentidos.")
    } catch {
      setErroLocal("Não foi possível bloquear agora. Tente de novo.")
    } finally {
      setAgindo(false)
    }
  }

  /**
   * Abre a denúncia de uma mensagem. Vindo do menu ⋯ a denúncia SUBSTITUI o
   * menu na mesma entrada (cada entrada tem uma sobreposição só, RUN-165);
   * vindo do toque no balão, abre direto.
   */
  function abrirDenuncia(mensagem: Mensagem, doMenu = false) {
    setDenunciando(mensagem)
    setMotivo("")
    setExplicacao("")
    setErroLocal("")
    setAviso("")
    if (doMenu) {
      void navegacao.atualizarCom((atual) => ({ ...atual, sobreposicao: "conversa-denuncia" }))
      return
    }
    denuncia.aoMudarAberto(true)
  }

  async function enviarDenuncia() {
    if (denunciando === null || agindo || motivo === "") return
    setAgindo(true)
    setErroLocal("")
    try {
      await enviar("POST", `/api/app/mensagens/${encodeURIComponent(denunciando.id)}/denuncia`, {
        motivo,
        explicacao,
      })
      denuncia.aoMudarAberto(false)
      setAviso("Denúncia enviada. A moderação vai analisar.")
    } catch (falha: unknown) {
      setErroLocal(
        falha instanceof FalhaDaApi && falha.mensagem !== null
          ? falha.mensagem
          : "Não foi possível enviar a denúncia. Tente de novo.",
      )
    } finally {
      setAgindo(false)
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
  const bloqueadoPorMim = outroId !== "" && meusBloqueios.includes(outroId)
  // O ⋯ denuncia a última mensagem recebida; sem mensagem da outra pessoa não
  // há o que denunciar nesta conversa e o item não aparece.
  const ultimaRecebida = dados.mensagens.filter((mensagem) => !mensagem.minha).at(-1) ?? null
  return (
    <section
      data-tela="conversa"
      className="grid min-h-[calc(100dvh-var(--altura-do-topo)-20px)] min-w-0 gap-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-3 md:min-h-0 md:pb-0"
    >
      <div data-conversa="grade" className="grid min-w-0 gap-2 md:min-h-0 md:gap-0">
        <aside
          data-caixa="lista"
          className="hidden min-h-0 min-w-0 md:block"
          aria-label="Conversas"
        >
          {erroCaixa && caixa === null ? (
            <EstadoDeErro aoTentar={() => setRodadaCaixa((atual) => atual + 1)} />
          ) : caixa === null ? (
            <EsqueletoDeLista linhas={4} />
          ) : (
            <ListaDeConversas
              conversas={caixa.conversas}
              selecionada={id}
              aoAbrir={(nova) => {
                if (nova === id) return
                void navegacao.irPara("conversa", { parametros: { id: nova } })
              }}
            />
          )}
        </aside>
        <div data-conversa="painel" className="flex min-w-0 flex-col gap-2 sm:gap-3">
          <div data-cabeca="conversa" className="flex min-w-0 items-center gap-3 px-1 py-2">
            <Avatar nome={nome} />
            <span className="grid min-w-0 gap-0.5">
              {/* O nome de quem conversa aparece uma vez só: aqui. A barra do
                  topo diz a seção ("Conversas"). */}
              <h1
                id="titulo-da-tela"
                data-titulo-da-tela
                tabIndex={-1}
                className="truncate text-[19px] font-semibold leading-6"
              >
                <NomeDeMembro
                  nome={nome}
                  aoAbrir={
                    outroId === ""
                      ? undefined
                      : () => void navegacao.irPara("perfil", { parametros: { id: outroId } })
                  }
                  className="truncate text-[19px] leading-6"
                />
              </h1>
            </span>
            {bloqueadoPorMim ? null : menuSuspenso ? (
              <MenuDaLinha rotulo="Opções da conversa" className="ml-auto shrink-0">
                {/*
                  A confirmação SUBSTITUI o menu na mesma entrada. Deixar o Radix
                  fechar o menu (Voltar da entrada) fecharia a confirmação junto,
                  porque cada entrada tem uma sobreposição só — e a pessoa via o
                  menu reabrir sem o diálogo (RUN-165).
                */}
                {ultimaRecebida && (
                  <ItemDoMenu
                    data-acao="denunciar"
                    onSelect={(evento) => evento.preventDefault()}
                    onClick={() => abrirDenuncia(ultimaRecebida, true)}
                  >
                    Denunciar
                  </ItemDoMenu>
                )}
                <ItemDoMenu
                  perigo
                  onSelect={(evento) => evento.preventDefault()}
                  onClick={() =>
                    void navegacao.atualizarCom((atual) => ({
                      ...atual,
                      sobreposicao: "confirmacao",
                    }))
                  }
                >
                  Bloquear {nome}
                </ItemDoMenu>
              </MenuDaLinha>
            ) : (
              <BotaoDeIcone
                rotulo="Opções da conversa"
                nome="more_vert"
                aberto="menu"
                data-acao="opcoes"
                className="ml-auto shrink-0"
                onClick={() => menuDaLinha.aoMudarAberto(true)}
              />
            )}
          </div>
          {/* REGUA-003: o item de que se fala — foto, título e preço — lido pela
              leitura que já existe; sem ela, o tipo da conversa. */}
          {itemDaConversa ? (
            <CabecaDoItem
              item={itemDaConversa}
              icone={ICONE_DO_ITEM[dados.conversa.tipo] ?? "forum"}
              aoAbrir={() => {
                const rotaDoItem = ROTA_DO_ITEM[dados.conversa.tipo]
                if (rotaDoItem === undefined) return
                void navegacao.irPara(rotaDoItem, {
                  parametros: { id: dados.conversa.contextoId },
                })
              }}
            />
          ) : (
            origem && <ContextoDaConversa origem={{ ...origem, detalhe: "" }} />
          )}
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
                Nunca pague adiantado nem compartilhe documentos ou dados bancários. Combine a
                entrega em local público.
              </p>
            )}
          </aside>
          {dados.anterior && (
            <Botao
              tom="contornado"
              disabled={carregandoMais}
              aria-busy={carregandoMais}
              onClick={() => void mais()}
            >
              {carregandoMais ? "Carregando…" : "Ver mensagens anteriores"}
            </Botao>
          )}
          {dados.mensagens.length === 0 && naoEnviada === null ? (
            <EstadoVazio
              titulo="Combine os detalhes por aqui"
              texto="Descreva o que você procura e confirme preço, disponibilidade e horário."
              figura="encontro"
            />
          ) : (
            <div data-mensagens="historico" className="grid min-w-0 content-start gap-2 pb-2">
              {dados.mensagens.map((item) => (
                <div
                  key={item.id}
                  className={
                    item.minha
                      ? "ml-auto flex max-w-[86%] items-end gap-1"
                      : "mr-auto flex max-w-[86%] items-end gap-1"
                  }
                >
                  {item.minha ? (
                    <p className="whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-(--secondary-container) px-3 py-2.5 text-[14px] leading-5">
                      <span>{item.conteudo}</span>
                      <HoraDaMensagem criadaEm={item.criadaEm} />
                    </p>
                  ) : (
                    // A denúncia da mensagem é um toque no balão — sem bandeira
                    // fixa ao lado de cada mensagem (REGUA-003). O nome
                    // acessível diz o gesto depois do conteúdo.
                    <button
                      type="button"
                      data-acao="denunciar-mensagem"
                      aria-haspopup="dialog"
                      className="whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-(--surface-lowest) px-3 py-2.5 text-left text-[14px] leading-5 ring-1 ring-(--outline-variant) hover:bg-(--surface-low) focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-(--ring)"
                      onClick={() => abrirDenuncia(item)}
                    >
                      <span>{item.conteudo}</span>
                      <HoraDaMensagem criadaEm={item.criadaEm} />
                      <span className="sr-only">Denunciar mensagem</span>
                    </button>
                  )}
                </div>
              ))}
              {naoEnviada !== null && (
                <div
                  ref={balaoFalho}
                  data-mensagem="nao-enviada"
                  className="ml-auto grid max-w-[86%] justify-items-end gap-1"
                >
                  {/* D24: a bolha falhada se diferencia da enviada — esmaecida
                      com borda de erro. */}
                  <p className="whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-(--secondary-container) px-3 py-2.5 text-[14px] leading-5 opacity-85 ring-1 ring-(--destructive)/60">
                    {naoEnviada}
                  </p>
                  <p className="flex min-h-11 items-center gap-1.5 text-xs text-(--destructive)">
                    <Icone nome="error" className="size-4" />
                    Não enviada
                    <Botao
                      tom="texto"
                      data-acao="tentar-de-novo"
                      className="min-h-11 px-2 text-xs font-semibold text-(--destructive) underline"
                      disabled={enviando}
                      onClick={() => void enviarTexto(naoEnviada, true)}
                    >
                      Tentar de novo
                    </Botao>
                  </p>
                </div>
              )}
            </div>
          )}
          {aviso && (
            <p role="status" className="text-xs text-(--on-surface-variant)">
              {aviso}
            </p>
          )}
          {bloqueadoPorMim ? (
            // O histórico fica; o que fecha é a escrita, nos dois sentidos. A frase
            // não promete esconder conteúdo: esconder é a frente D1/D2, fora deste lote.
            <div
              data-conversa-bloqueada="sim"
              className="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-10 mt-auto grid gap-1 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3 shadow-[0_-4px_16px_var(--shadow-soft)]"
            >
              <p className="text-sm font-semibold">Você bloqueou {nome}</p>
              <p className="text-xs leading-5 text-(--on-surface-variant)">
                A conversa fica fechada nos dois sentidos; o histórico continua visível para vocês;
                a pessoa não é avisada. Para voltar a conversar, desbloqueie em Pessoas bloqueadas,
                na área Você.
              </p>
            </div>
          ) : (
            <div
              data-compositor-conversa="sim"
              className="sticky bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-10 mt-auto grid min-w-0 gap-2 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-2.5 shadow-[0_-4px_16px_var(--shadow-soft)] sm:p-3"
            >
              <fieldset
                aria-label="Respostas rápidas"
                className="flex min-w-0 flex-nowrap gap-2 overflow-x-auto pb-0.5"
              >
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
                    className="min-h-11 shrink-0 rounded-full border border-(--outline-variant) px-3 text-xs hover:bg-(--surface-low)"
                    onClick={() => setRascunho(opcao)}
                  >
                    {opcao}
                  </button>
                ))}
              </fieldset>
              <form
                className="grid min-w-0 gap-1.5"
                aria-busy={enviando}
                onSubmit={(evento) => {
                  evento.preventDefault()
                  void enviarTexto()
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
                      className="min-h-12 max-h-32 resize-none rounded-3xl"
                    />
                  </div>
                  <BotaoDeIcone
                    type="submit"
                    rotulo="Enviar"
                    nome="send"
                    data-acao="enviar-mensagem"
                    disabled={enviando || !rascunho.trim() || rascunho.length > 2000}
                    className={
                      // D14: um desenho só nos três tamanhos — desligado é
                      // neutro legível (ícone ≥ 3:1); ligado é ardósia.
                      enviando || !rascunho.trim() || rascunho.length > 2000
                        ? "size-11 shrink-0 rounded-full bg-(--surface-high) text-(--on-surface-variant)"
                        : "size-11 shrink-0 rounded-full bg-(--acao) text-(--acao-foreground) hover:bg-(--acao)/90"
                    }
                  />
                </div>
              </form>
              {anuncioDeEnvio && (
                <p role="alert" className="sr-only">
                  {anuncioDeEnvio}
                </p>
              )}
              {erroLocal && (
                <p role="alert" className="text-xs text-(--on-surface-variant)">
                  {erroLocal}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <Confirmacao
        titulo={`Bloquear ${nome}?`}
        texto="A conversa fica fechada nos dois sentidos; o histórico continua visível para vocês; a pessoa não é avisada. Você pode desfazer em Pessoas bloqueadas, na área Você."
        confirmar="Bloquear"
        perigo
        aoConfirmar={() => void bloquearPessoa()}
      />
      {menuDaLinha.aberto && !menuSuspenso && bloqueadoPorMim === false ? (
        <Sobreposicao
          id="menu-de-linha"
          titulo="Opções da conversa"
          descricao="Escolha o que fazer nesta conversa."
          aoFechar={() => menuDaLinha.aoMudarAberto(false)}
        >
          {/* O menuitem só é ARIA válida dentro de um menu; a casca faz assim
              no Criar central (MenuCriar) e a folha segue o mesmo idioma. */}
          <div role="menu" aria-label="Opções da conversa">
            {ultimaRecebida && (
              <button
                type="button"
                role="menuitem"
                data-acao="denunciar"
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left font-medium hover:bg-(--surface-low)"
                onClick={() => abrirDenuncia(ultimaRecebida, true)}
              >
                Denunciar
              </button>
            )}
            <button
              type="button"
              role="menuitem"
              className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left font-medium text-(--destructive) hover:bg-(--surface-low)"
              onClick={() =>
                void navegacao.atualizarCom((atual) => ({ ...atual, sobreposicao: "confirmacao" }))
              }
            >
              Bloquear {nome}
            </button>
          </div>
        </Sobreposicao>
      ) : null}
      {denuncia.aberto && denunciando !== null ? (
        <Sobreposicao
          id="conversa-denuncia"
          titulo="Denunciar mensagem"
          descricao="O motivo vai para a moderação. Não inclua dados pessoais na explicação."
          // D25: no computador nada de folha — diálogo centrado (560 px); a
          // folha de baixo é do celular (referência Mobbin iOS).
          formato={menuSuspenso ? "dialogo" : "folha"}
          aoFechar={() => denuncia.aoMudarAberto(false)}
        >
          <p
            data-mensagem-denunciada="sim"
            className="line-clamp-2 rounded-xl bg-(--surface-low) px-3 py-2 text-sm leading-5 text-(--on-surface-variant)"
          >
            {denunciando.conteudo}
          </p>
          {/* D23: 16 px entre a última opção, o campo e o botão — nada
              encostado no rodapé de ação. */}
          <form
            className="grid gap-4"
            onSubmit={(evento) => {
              evento.preventDefault()
              void enviarDenuncia()
            }}
          >
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Motivo</legend>
              {MOTIVOS_DA_DENUNCIA.map(([valor, rotulo]) => (
                <label key={valor} className="flex min-h-11 items-center gap-3">
                  <input
                    type="radio"
                    className="accent-(--on-surface)"
                    name="motivo-denuncia"
                    value={valor}
                    checked={motivo === valor}
                    onChange={() => setMotivo(valor)}
                  />
                  {rotulo}
                </label>
              ))}
            </fieldset>
            <div className="grid gap-1.5">
              <Textarea
                id="explicacao-denuncia"
                rows={3}
                maxLength={300}
                value={explicacao}
                placeholder="Explicação (opcional)"
                aria-label="Explicação (opcional)"
                onChange={(evento) => setExplicacao(evento.target.value)}
                className="rounded-xl"
              />
              <p className="text-xs text-(--muted-foreground)">
                {explicacao.length}/300 caracteres
              </p>
            </div>
            <Botao
              type="submit"
              data-acao="enviar-denuncia"
              className="rounded-full"
              disabled={agindo || motivo === "" || explicacao.trim().length > 300}
            >
              {agindo ? "Enviando…" : "Enviar denúncia"}
            </Botao>
          </form>
        </Sobreposicao>
      ) : null}
    </section>
  )
}

function HoraDaMensagem({ criadaEm }: { criadaEm: string }) {
  return (
    <time dateTime={criadaEm} className="mt-1 block text-right text-xs opacity-70">
      {new Date(criadaEm).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
    </time>
  )
}
