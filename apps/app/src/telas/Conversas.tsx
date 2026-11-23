"use client"

import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { type Caixa, type ConversaDaCaixa, lerConversas } from "@/lib/dados/conversas"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { iniciais } from "@/lib/texto"
import { contexto } from "@/src/conversas/contexto"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, sessaoVencida } from "@/src/eventos/formulario"

/**
 * A caixa de conversas (F09). No computador (referência Mobbin, Chats sem
 * conversa aberta: https://mobbin.com/screens/ecb9d604-1ecb-4f55-b45a-8c9d4efec815)
 * a lista fica à esquerda e o lado direito traz a ilustração com a saída —
 * nunca uma coluna solta esticada. No celular continua lista → conversa.
 */
export function Conversas() {
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<Caixa | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [filtro, setFiltro] = useState<"todas" | "anuncios" | "servicos">("todas")
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const controle = useRef<AbortController | null>(null)
  const paginaEmCurso = useRef(false)
  useRolagemEFoco(CARGA_CONCLUIDA)
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada solicita nova leitura
  useEffect(() => {
    const pedido = new AbortController()
    controle.current = pedido
    paginaEmCurso.current = false
    setDados(null)
    setErro(null)
    void lerConversas({ signal: pedido.signal })
      .then((valor) => {
        if (!pedido.signal.aborted) setDados(valor)
      })
      .catch((falha: unknown) => {
        if (!pedido.signal.aborted)
          setErro(sessaoVencida(falha) ? "sessao" : acessoNegado(falha) ? "negado" : "falhou")
      })
    return () => pedido.abort()
  }, [rodada])
  async function mais() {
    const pedido = controle.current
    if (!pedido || pedido.signal.aborted || !dados?.proximo || paginaEmCurso.current) return
    paginaEmCurso.current = true
    const cursor = dados.proximo
    setCarregandoMais(true)
    setErroMais(false)
    try {
      const pagina = await lerConversas({ depois: cursor, signal: pedido.signal })
      if (!pedido.signal.aborted)
        setDados((atual) =>
          atual?.proximo === cursor
            ? {
                conversas: [...atual.conversas, ...pagina.conversas],
                proximo: pagina.proximo,
                porLer: pagina.porLer,
              }
            : atual,
        )
    } catch {
      if (!pedido.signal.aborted) setErroMais(true)
    } finally {
      if (!pedido.signal.aborted) {
        paginaEmCurso.current = false
        setCarregandoMais(false)
      }
    }
  }
  const filtradas =
    dados?.conversas.filter(
      (conversa) =>
        filtro === "todas" ||
        (filtro === "anuncios"
          ? conversa.tipo === "listing"
          : conversa.tipo === "provider" || conversa.tipo === "service_request"),
    ) ?? []
  const vazia = filtradas.length === 0
  return (
    <section data-tela="conversas" className="grid gap-2">
      <CabecaDePagina
        titulo="Conversas"
        subtitulo="Contatos sobre anúncios e serviços da cidade."
      />
      <div data-caixa="grade" className="grid min-w-0 gap-2 md:min-h-0 md:gap-0">
        <div data-caixa="lista" className="grid min-w-0 content-start gap-2">
          <fieldset
            data-filtros-conversas="sim"
            aria-label="Filtrar conversas"
            className="flex min-w-0 gap-2 overflow-x-auto pb-1"
          >
            {(
              [
                ["todas", "Todas"],
                ["anuncios", "Anúncios"],
                ["servicos", "Serviços"],
              ] as const
            ).map(([chave, rotulo]) => (
              <button
                key={chave}
                type="button"
                aria-pressed={filtro === chave}
                data-filtro={chave}
                className={
                  filtro === chave
                    ? "min-h-11 shrink-0 rounded-full bg-(--secondary-container) px-4 text-sm font-semibold"
                    : "min-h-11 shrink-0 rounded-full border border-(--outline-variant) px-4 text-sm"
                }
                onClick={() => setFiltro(chave)}
              >
                {rotulo}
              </button>
            ))}
          </fieldset>
          {erro === "sessao" ? (
            <EstadoDeSessaoVencida />
          ) : erro === "negado" ? (
            <EstadoNegado texto="Sua conta não tem acesso às conversas." />
          ) : erro === "falhou" ? (
            <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
          ) : dados === null ? (
            <EsqueletoDeLista linhas={3} />
          ) : vazia ? null : (
            <ListaDeConversas
              conversas={filtradas}
              aoAbrir={(id) => void navegacao.irPara("conversa", { parametros: { id } })}
            />
          )}
          {dados?.proximo ? (
            <div className="grid justify-items-center gap-2 pt-2">
              {erroMais && <p role="alert">Não foi possível carregar mais conversas.</p>}
              <Botao
                tom="contornado"
                disabled={carregandoMais}
                aria-busy={carregandoMais}
                onClick={() => void mais()}
              >
                {carregandoMais ? "Carregando…" : "Ver mais conversas"}
              </Botao>
            </div>
          ) : null}
        </div>
        {/* D9: um estado vazio só — o da direita, com saída. Na esquerda ficam
            só os filtros; no celular este painel é o vazio da tela inteira. */}
        <aside
          data-caixa="vazia"
          aria-label={vazia ? "Começar uma conversa" : "Selecione uma conversa"}
          className={
            vazia ? "grid min-h-0 place-items-center" : "hidden min-h-0 place-items-center md:grid"
          }
        >
          <div className="grid max-w-90 justify-items-center gap-3 px-4 py-10 text-center">
            <img
              src={`${import.meta.env.BASE_URL}ilustracoes/encontro.webp`}
              alt=""
              aria-hidden="true"
              className="w-56 max-w-full"
            />
            {vazia ? (
              <>
                <h2 className="text-lg font-semibold leading-6">Comece uma conversa</h2>
                <p className="text-sm leading-5 text-(--on-surface-variant)">
                  {dados?.proximo
                    ? "Carregue mais conversas para continuar procurando."
                    : "Escolha um anúncio ou negócio e mande a primeira mensagem."}
                </p>
                {dados?.proximo ? (
                  <Botao
                    data-acao="ver-mais-conversas"
                    disabled={carregandoMais}
                    aria-busy={carregandoMais}
                    onClick={() => void mais()}
                  >
                    Ver mais conversas
                  </Botao>
                ) : (
                  <Botao
                    data-acao="ir-ao-mercado"
                    icone="storefront"
                    onClick={() => void navegacao.irPara("mercado")}
                  >
                    Ir ao Mercado
                  </Botao>
                )}
              </>
            ) : (
              // D8: a lista tem conversas — o painel não manda "começar" para
              // quem já tem com quem falar, nem oferece o Mercado.
              <>
                <h2 className="text-lg font-semibold leading-6">Selecione uma conversa</h2>
                <p className="text-sm leading-5 text-(--on-surface-variant)">
                  Escolha uma conversa da lista para continuar por aqui.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}

/**
 * A lista da caixa, compartilhada pela rota `conversas` (toda a caixa) e pela
 * rota `conversa` (coluna da esquerda no computador, referência Mobbin, Chats
 * com conversa aberta: https://mobbin.com/screens/fd834924-6a02-4fa0-a5e7-1c3d20f9c549).
 * Linha plana com divisória — a lista da régua não é cartão.
 */
export function ListaDeConversas({
  conversas,
  selecionada,
  comContexto = true,
  aoAbrir,
}: {
  conversas: readonly ConversaDaCaixa[]
  /** A conversa aberta, quando a lista vive ao lado dela. */
  selecionada?: string
  /**
   * A linha do tipo (Anúncio, Serviço) acompanha a caixa; na coluna ao lado da
   * conversa ela não se repete — o contexto da conversa aberta já está no
   * painel.
   */
  comContexto?: boolean
  aoAbrir: (id: string) => void
}) {
  return (
    <div data-lista="conversas" className="grid min-w-0">
      {conversas.map((conversa) => {
        const origem = contexto(conversa.tipo)
        return (
          <article
            key={conversa.id}
            data-thread={conversa.id}
            data-ativa={selecionada === conversa.id ? "sim" : undefined}
            className="border-b border-(--outline-variant) last:border-b-0 data-[ativa=sim]:bg-(--surface-low)"
          >
            <button
              type="button"
              className="bv-press flex min-h-16 w-full min-w-0 items-center gap-3 px-1 py-2.5 text-left hover:bg-(--surface-low) focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-(--ring)"
              onClick={() => aoAbrir(conversa.id)}
            >
              <Avatar size="lg" aria-hidden="true">
                <AvatarFallback className="bg-(--secondary-container) font-semibold">
                  {iniciais(conversa.nome)}
                </AvatarFallback>
              </Avatar>
              <span className="grid min-w-0 flex-1 gap-1">
                <b className="truncate text-sm">{conversa.nome}</b>
                {origem && comContexto && (
                  <span className="truncate text-xs text-(--on-surface-variant)">
                    {origem.titulo}
                  </span>
                )}
                <span
                  className={
                    conversa.porLer
                      ? "truncate text-[13px] font-semibold"
                      : "truncate text-[13px] text-(--on-surface-variant)"
                  }
                >
                  {conversa.ultima || "Comece a conversa"}
                </span>
              </span>
              {conversa.porLer && selecionada !== conversa.id && (
                <span
                  role="img"
                  aria-label="Por ler"
                  className="size-2 shrink-0 rounded-full bg-(--primary)"
                />
              )}
              <Icone
                nome="chevron_right"
                className="size-5 shrink-0 text-(--on-surface-variant) md:hidden"
              />
            </button>
          </article>
        )
      })}
    </div>
  )
}
