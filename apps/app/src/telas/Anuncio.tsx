"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { Botao, BotaoDeIcone } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { Capa } from "@/components/bivaque/capa"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import { Secao } from "@/components/bivaque/secao"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { type AnuncioDetalhado, abrirInteresse, buscarAnuncio } from "@/lib/dados/mercado"
import { moeda } from "@/lib/formato"
import { useNavegacao, useRolagemEFoco, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { iniciais } from "@/lib/texto"
import { useCasca } from "@/src/contexto/casca"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, foiAbortada, sessaoVencida } from "@/src/eventos/formulario"
import { anuncioSumiu, mensagemDaFalha } from "@/src/mercado/falha"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * O anúncio, do banco (LAN-F06, no molde do F05).
 *
 * A tela é a mesma de sempre: capa, preço, bairro e cidade aproximados, "Sobre o
 * anúncio", quem anuncia, salvar, as duas ações e o rascunho local de contato.
 * Mudou a fonte: `lib/dados/mercado`, com carregando, vazio honesto por campo,
 * erro recuperável, sessão vencida, acesso negado e "sumiu". O endereço exato
 * nunca aparece: a localização mostrada é o bairro, por escolha de quem anuncia.
 *
 * Interesse sem otimismo: o botão só muda depois da resposta, e a falha deixa o
 * estado anterior com a mensagem do que aconteceu.
 */
export function Anuncio() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [anuncio, setAnuncio] = useState<AnuncioDetalhado | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | "sumiu" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [salvo, setSalvo] = useState(false)
  const interesse = useSobreposicaoDaEntrada("contato-interesse")
  const oferta = useSobreposicaoDaEntrada("contato-oferta")
  const tipoContato = interesse.aberto ? "interesse" : oferta.aberto ? "oferta" : null
  const setTipoContato = (tipo: "interesse" | "oferta" | null) => {
    if (tipo === "interesse") interesse.aoMudarAberto(true)
    else if (tipo === "oferta") oferta.aoMudarAberto(true)
    else if (tipoContato !== null) navegacao.fecharSobreposicao()
  }
  const [mensagem, setMensagem] = useState("")
  const [valorOferta, setValorOferta] = useState("")
  const [rascunhoContato, setRascunhoContato] = useState<string | null>(null)
  const [erroContato, setErroContato] = useState("")
  const [enviandoInteresse, setEnviandoInteresse] = useState(false)
  const [avisoInteresse, setAvisoInteresse] = useState<string | null>(null)
  const [conversaId, setConversaId] = useState<string | null>(null)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // Uma sessão de rede por tela: sair cancela o que ainda estava a caminho.
  const [controle] = useState(() => new AbortController())
  useEffect(() => () => controle.abort(), [controle])

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setAnuncio(null)
    setErro(null)
    setConversaId(null)
    setAvisoInteresse(null)
    void buscarAnuncio(id, { signal: controle.signal })
      .then((lido) => {
        if (controle.signal.aborted) return
        setAnuncio(lido)
        setSalvo(lido.salvo)
      })
      .catch((falha: unknown) => {
        if (controle.signal.aborted) return
        setErro(
          sessaoVencida(falha)
            ? "sessao"
            : anuncioSumiu(falha)
              ? "sumiu"
              : acessoNegado(falha)
                ? "negado"
                : "falhou",
        )
      })
    return () => controle.abort()
  }, [id, rodada])

  useEffect(() => {
    setRascunhoContato(null)
    try {
      setRascunhoContato(window.sessionStorage.getItem(`bivaque:rascunho-contato:${id}`))
    } catch {
      /* sem persistência */
    }
  }, [id])

  const abrirContato = (tipo: "interesse" | "oferta") => {
    setTipoContato(tipo)
    setErroContato("")
    setAvisoInteresse(null)
    setMensagem(
      tipo === "interesse"
        ? "Olá! Tenho interesse neste anúncio. Podemos combinar os detalhes?"
        : "Olá! Gostaria de apresentar uma proposta para este anúncio.",
    )
  }

  const guardarContato = () => {
    const conteudo = mensagem.trim()
    if (conteudo.length < 10 || conteudo.length > 2000) {
      setErroContato("Digite uma mensagem entre 10 e 2000 caracteres.")
      return
    }
    if (
      tipoContato === "oferta" &&
      (!Number.isFinite(Number(valorOferta)) || Number(valorOferta) <= 0)
    ) {
      setErroContato("Informe um valor válido para a oferta.")
      return
    }
    const rascunho =
      tipoContato === "oferta" ? `Oferta de R$ ${valorOferta}: ${conteudo}` : conteudo
    try {
      window.sessionStorage.setItem(`bivaque:rascunho-contato:${id}`, rascunho)
      setRascunhoContato(rascunho)
      setErroContato("")
      setTipoContato(null)
    } catch {
      setErroContato("Não foi possível guardar a mensagem nesta sessão. Ela não foi enviada.")
    }
  }

  /** Grava o interesse no servidor; nada muda na tela antes da resposta. */
  async function enviarInteresse() {
    if (enviandoInteresse) return
    setEnviandoInteresse(true)
    setAvisoInteresse(null)
    try {
      setConversaId(await abrirInteresse(id, { signal: controle.signal }))
      setTipoContato(null)
    } catch (falha: unknown) {
      if (!foiAbortada(falha)) setAvisoInteresse(mensagemDaFalha(falha, "interesse"))
    } finally {
      setEnviandoInteresse(false)
    }
  }

  const validacao = validarParametros("anuncio", { id })
  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro === "sumiu") return <TelaIndisponivel />

  if (erro === "sessao") {
    return (
      <section data-tela="anuncio" className="grid gap-2">
        <EstadoDeSessaoVencida />
      </section>
    )
  }
  if (erro === "negado") {
    return (
      <section data-tela="anuncio" className="grid gap-2">
        <EstadoNegado texto="Sua conta não tem acesso a este anúncio." />
      </section>
    )
  }
  if (erro === "falhou") {
    return (
      <section data-tela="anuncio" className="grid gap-2">
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }
  if (anuncio === null) {
    return (
      <section data-tela="anuncio" className="grid gap-2">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  }

  const imovel = anuncio.tipo === "property"
  const ativo = anuncio.status === "active"
  const preco = anuncio.precoCents === null ? null : anuncio.precoCents / 100
  const cidadeDoAnuncio = anuncio.cidade ?? casca.cidade
  const localizacao =
    anuncio.bairro === null ? cidadeDoAnuncio : `${anuncio.bairro} · ${cidadeDoAnuncio}`
  const localizacaoAproximada =
    anuncio.bairro === null ? cidadeDoAnuncio : `${anuncio.bairro}, ${cidadeDoAnuncio}`
  const vendedor = anuncio.donoNome ?? "Membro da comunidade"

  return (
    <section data-tela="anuncio" className="grid gap-2">
      <div className="relative">
        <Capa
          fonte={anuncio.foto ?? anuncio.fotos[0] ?? null}
          alt={anuncio.titulo}
          icone={imovel ? "apartment" : undefined}
        />
        <span className="absolute top-2 left-2">
          <Etiqueta tom="neutro">
            {ativo ? (imovel ? "Imóvel" : "Desapego") : imovel ? "Indisponível" : "Vendido"}
          </Etiqueta>
        </span>
        <span className="absolute top-2 right-2">
          <BotaoDeIcone
            rotulo={salvo ? "Remover dos salvos" : "Salvar anúncio"}
            nome={salvo ? "bookmark" : "bookmark_border"}
            aria-pressed={salvo}
            onClick={() => setSalvo((atual) => !atual)}
            className="bg-(--surface-lowest)/85 backdrop-blur"
          />
        </span>
      </div>

      <div className="grid gap-1 px-1">
        {preco === null ? null : <b className="text-[22px]">{moeda(preco)}</b>}
        <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1} className="text-[24px] leading-8">
          {anuncio.titulo}
        </h1>
        <p className="text-sm text-(--on-surface-variant)">{localizacao}</p>
      </div>

      <Secao titulo="Sobre o anúncio">
        {anuncio.descricao === null ? (
          <p className="text-[15px] leading-6 text-(--on-surface-variant)">
            Quem anunciou não escreveu uma descrição.
          </p>
        ) : (
          <p className="text-[15px] leading-6">{anuncio.descricao}</p>
        )}
      </Secao>

      <Secao titulo="Localização aproximada">
        <div className="flex items-center gap-3 rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)">
          <Icone nome="location_on" className="size-6 shrink-0 text-(--primary)" />
          <span className="grid gap-0.5">
            <b className="text-[15px]">{localizacaoAproximada}</b>
            <small className="text-(--on-surface-variant)">
              O endereço exato pode ser combinado na conversa.
            </small>
          </span>
        </div>
      </Secao>

      <Secao titulo="Quem está anunciando">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-(--secondary-container) font-semibold">
            {iniciais(vendedor)}
          </span>
          <span className="grid gap-0.5">
            <b className="text-[15px]">{vendedor}</b>
            {anuncio.donoNome === null ? null : (
              <small className="text-(--on-surface-variant)">Membro da comunidade</small>
            )}
          </span>
        </div>
        <div data-acoes-anuncio="sim" className="bv-anuncio-acoes flex flex-wrap gap-2">
          {conversaId === null ? (
            <Botao
              data-acao="contato-interesse"
              icone="chat_bubble"
              disabled={!ativo || enviandoInteresse}
              onClick={() => abrirContato("interesse")}
            >
              {enviandoInteresse ? "Enviando…" : "Tenho interesse"}
            </Botao>
          ) : (
            <Botao tom="tonal" icone="check" data-estado="interesse-gravado" disabled>
              Conversa aberta
            </Botao>
          )}
          <Botao
            data-acao="contato-oferta"
            tom="contornado"
            icone="sell"
            disabled={!ativo}
            onClick={() => abrirContato("oferta")}
          >
            Fazer uma oferta
          </Botao>
        </div>
        {conversaId === null ? null : (
          <Botao
            tom="texto"
            data-acao="ver-conversa"
            onClick={() => void navegacao.irPara("conversa", { parametros: { id: conversaId } })}
          >
            Ver conversa
          </Botao>
        )}
        {rascunhoContato === null ? null : (
          <div
            data-rascunho-contato="sim"
            className="grid gap-2 rounded-xl bg-(--surface-lowest) p-3 ring-1 ring-(--outline-variant)"
          >
            <b className="text-sm">Mensagem preparada — não enviada</b>
            <p className="whitespace-pre-wrap break-words text-sm">{rascunhoContato}</p>
            <div className="flex justify-end gap-2">
              <Botao
                tom="texto"
                onClick={() => {
                  setMensagem(rascunhoContato)
                  setTipoContato("interesse")
                }}
              >
                Editar
              </Botao>
              <Botao
                tom="contornado"
                data-acao="excluir-contato"
                onClick={() => {
                  try {
                    window.sessionStorage.removeItem(`bivaque:rascunho-contato:${id}`)
                  } catch {
                    /* sem persistência */
                  }
                  setRascunhoContato(null)
                }}
              >
                Excluir
              </Botao>
            </div>
          </div>
        )}
        <Dialog
          open={tipoContato !== null}
          onOpenChange={(novo) => {
            if (!novo) setTipoContato(null)
          }}
        >
          <DialogContent
            unstyled
            data-fluxo="rascunho-contato"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto grid max-h-[90dvh] w-full max-w-xl gap-3 overflow-y-auto rounded-t-2xl border border-(--outline-variant) bg-(--surface-lowest) p-5 shadow-xl sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2 sm:rounded-2xl"
          >
            <DialogTitle className="pr-12 text-xl">
              {tipoContato === "oferta" ? "Preparar oferta" : "Preparar mensagem"}
            </DialogTitle>
            <DialogDescription>
              Para {vendedor}. Esta mensagem ficará somente no navegador e não será enviada.
            </DialogDescription>
            <form
              className="grid gap-3"
              onSubmit={(evento) => {
                evento.preventDefault()
                guardarContato()
              }}
            >
              {tipoContato === "oferta" ? (
                <Campo
                  id="valor-contato"
                  rotulo="Valor proposto (R$)"
                  valor={valorOferta}
                  aoMudar={setValorOferta}
                  type="number"
                  min="1"
                  step="0.01"
                  required
                />
              ) : null}
              <Campo
                id="mensagem-contato"
                rotulo="Mensagem"
                valor={mensagem}
                aoMudar={setMensagem}
                area
              />
              {erroContato === "" ? null : (
                <p role="alert" className="text-sm text-(--destructive)">
                  {erroContato}
                </p>
              )}
              {avisoInteresse === null ? null : (
                <p role="alert" className="text-sm text-(--destructive)">
                  {avisoInteresse}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Botao type="button" tom="texto" onClick={() => setTipoContato(null)}>
                  Cancelar
                </Botao>
                <Botao type="submit" data-acao="guardar-contato">
                  Guardar sem enviar
                </Botao>
                {tipoContato === "interesse" ? (
                  <Botao
                    type="button"
                    tom="contornado"
                    disabled={enviandoInteresse}
                    onClick={() => void enviarInteresse()}
                  >
                    {enviandoInteresse ? "Abrindo…" : "Abrir conversa"}
                  </Botao>
                ) : null}
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </Secao>
    </section>
  )
}
