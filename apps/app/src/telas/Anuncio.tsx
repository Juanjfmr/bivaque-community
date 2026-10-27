"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"
import { Botao, BotaoDeIcone } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { Capa } from "@/components/bivaque/capa"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import { Secao } from "@/components/bivaque/secao"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { moeda } from "@/lib/formato"
import { iconeDeDado } from "@/lib/icones"
import { useNavegacao, useRolagemEFoco, useSobreposicaoDaEntrada } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { iniciais } from "@/lib/texto"
import { useCasca } from "@/src/contexto/casca"
import { registro, texto } from "@/src/telas/comum"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * O anúncio da onda 6 (protótipo: features/listings/detail.js, renderItem), com
 * dados de demonstração. Salvar é estado local; conversa leva a Conversas.
 * Editor, fotos, mapa do bairro e denúncia ficam para o refino.
 */
export function Anuncio() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
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

  const validacao = validarParametros("anuncio", { id })
  const anuncio = useMemo(
    () => (dados === null ? null : (dados.anuncios.find((item) => item.id === id) ?? null)),
    [dados, id],
  )

  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro) {
    return (
      <section data-tela="anuncio" className="grid gap-2">
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }

  if (dados === null) {
    return (
      <section data-tela="anuncio" className="grid gap-2">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  }

  if (anuncio === null) return <TelaIndisponivel />

  const apresentacao = registro(anuncio.apresentacao)
  const imovel = anuncio.kind === "property"
  const ativo = anuncio.status === "active"
  const vendedor = texto(apresentacao["seller"], "Membro da comunidade")
  const conversaVinculada = dados.conversas.find(
    (conversa) => conversa.context_type === "listing" && conversa.context_id === anuncio.id,
  )

  return (
    <section data-tela="anuncio" className="grid gap-2">
      <div className="relative">
        <Capa
          fonte={texto(apresentacao["imagem"])}
          alt={texto(apresentacao["title"], anuncio.title)}
          icone={iconeDeDado(apresentacao["icon"])}
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
        {typeof anuncio.price_cents === "number" ? (
          <b className="text-[22px]">{moeda(anuncio.price_cents / 100)}</b>
        ) : null}
        <h1 id="titulo-da-tela" data-titulo-da-tela tabIndex={-1} className="text-[24px] leading-8">
          {texto(apresentacao["title"], anuncio.title)}
        </h1>
        <p className="text-sm text-(--on-surface-variant)">
          {texto(apresentacao["hood"], anuncio.neighborhood ?? casca.cidade)} · {casca.cidade}
        </p>
      </div>

      {anuncio.description === null || anuncio.description === "" ? null : (
        <Secao titulo="Sobre o anúncio">
          <p className="text-[15px] leading-6">{anuncio.description}</p>
        </Secao>
      )}

      <Secao titulo="Localização aproximada">
        <div className="flex items-center gap-3 rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)">
          <Icone nome="location_on" className="size-6 shrink-0 text-(--primary)" />
          <span className="grid gap-0.5">
            <b className="text-[15px]">
              {texto(apresentacao["hood"], anuncio.neighborhood ?? casca.cidade)}, {casca.cidade}
            </b>
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
            <small className="text-(--on-surface-variant)">
              {texto(apresentacao["note"], "Membro da comunidade")}
            </small>
          </span>
        </div>
        <div data-acoes-anuncio="sim" className="bv-anuncio-acoes flex flex-wrap gap-2">
          <Botao
            data-acao="contato-interesse"
            icone="chat_bubble"
            disabled={!ativo}
            onClick={() => abrirContato("interesse")}
          >
            Tenho interesse
          </Botao>
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
        {conversaVinculada === undefined ? null : (
          <Botao
            tom="texto"
            onClick={() =>
              void navegacao.irPara("conversa", { parametros: { id: conversaVinculada.id } })
            }
          >
            Ver conversa demonstrativa sobre o anúncio
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
              <div className="flex justify-end gap-2">
                <Botao type="button" tom="texto" onClick={() => setTipoContato(null)}>
                  Cancelar
                </Botao>
                <Botao type="submit" data-acao="guardar-contato">
                  Guardar sem enviar
                </Botao>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </Secao>
    </section>
  )
}
