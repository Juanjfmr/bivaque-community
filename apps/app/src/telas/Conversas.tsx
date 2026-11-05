"use client"

import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { ContextoDaConversa } from "@/components/bivaque/contexto-conversa"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Icone } from "@/components/bivaque/icone"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { type Caixa, lerConversas } from "@/lib/dados/conversas"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { iniciais } from "@/lib/texto"
import { contexto } from "@/src/conversas/contexto"
import { EstadoDeSessaoVencida, EstadoNegado } from "@/src/eventos/EstadosDeAcesso"
import { acessoNegado, sessaoVencida } from "@/src/eventos/formulario"

export function Conversas() {
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<Caixa | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "negado" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [filtro, setFiltro] = useState<"todas" | "anuncios" | "servicos">("todas")
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const controle = useRef<AbortController | null>(null)
  useRolagemEFoco(CARGA_CONCLUIDA)
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada solicita nova leitura
  useEffect(() => {
    const pedido = new AbortController()
    controle.current = pedido
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
    if (!pedido || pedido.signal.aborted || !dados?.proximo || carregandoMais) return
    setCarregandoMais(true)
    setErroMais(false)
    try {
      const pagina = await lerConversas({ depois: dados.proximo, signal: pedido.signal })
      if (!pedido.signal.aborted)
        setDados({ conversas: [...dados.conversas, ...pagina.conversas], proximo: pagina.proximo })
    } catch {
      if (!pedido.signal.aborted) setErroMais(true)
    } finally {
      if (!pedido.signal.aborted) setCarregandoMais(false)
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
  return (
    <section data-tela="conversas" className="grid gap-2">
      <CabecaDePagina
        titulo="Conversas"
        subtitulo="Contatos sobre anúncios e serviços da cidade."
      />
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
      ) : (
        <>
          {filtradas.length === 0 ? (
            <EstadoVazio
              titulo={
                filtro === "todas" ? "Nenhuma conversa ainda" : "Nenhuma conversa neste filtro"
              }
              texto={
                dados.proximo
                  ? "Carregue mais conversas para continuar procurando."
                  : "Abra um anúncio ou negócio para iniciar uma conversa."
              }
              icone="chat_bubble"
            />
          ) : (
            <div className="grid gap-2">
              {filtradas.map((conversa) => {
                const origem = contexto(conversa.tipo)
                return (
                  <article
                    key={conversa.id}
                    data-thread={conversa.id}
                    className="grid min-w-0 gap-2 rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-2.5 sm:p-3"
                  >
                    <button
                      type="button"
                      className="bv-press flex min-h-14 w-full min-w-0 items-center gap-3 text-left"
                      onClick={() =>
                        void navegacao.irPara("conversa", { parametros: { id: conversa.id } })
                      }
                    >
                      <Avatar size="lg" aria-hidden="true">
                        <AvatarFallback className="bg-(--secondary-container) font-semibold">
                          {iniciais(conversa.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="grid min-w-0 flex-1 gap-1">
                        <b className="truncate text-sm">{conversa.nome}</b>
                        <span className="truncate text-[13px] text-(--on-surface-variant)">
                          {conversa.ultima || "Comece a conversa"}
                        </span>
                      </span>
                      <Icone
                        nome="chevron_right"
                        className="size-5 shrink-0 text-(--on-surface-variant)"
                      />
                    </button>
                    {origem && <ContextoDaConversa origem={origem} compacto />}
                  </article>
                )
              })}
            </div>
          )}
          {dados.proximo && (
            <div className="grid justify-items-center gap-2 pt-2">
              {erroMais && <p role="alert">Não foi possível carregar mais conversas.</p>}
              <Botao tom="contornado" disabled={carregandoMais} onClick={() => void mais()}>
                {carregandoMais ? "Carregando…" : "Ver mais conversas"}
              </Botao>
            </div>
          )}
        </>
      )}
    </section>
  )
}
