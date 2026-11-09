"use client"

import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDeFoto } from "@/components/bivaque/cartao-de-anuncio"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Grade } from "@/components/bivaque/grade"
import { lerMeusAnuncios } from "@/lib/dados/criar"
import type { AnuncioDaLista, ListaDoMercado } from "@/lib/dados/mercado"
import { moeda } from "@/lib/formato"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import {
  DEFINICOES_CRIAR,
  excluirRascunhoCriacao,
  lerRascunhosCriacao,
  type RascunhoCriacao,
} from "@/lib/rascunhos-criacao"
import { lerRascunhosImoveis, type RascunhoImovel } from "@/lib/rascunhos-imoveis"
import { useCasca } from "@/src/contexto/casca"
import { lerRascunho } from "@/src/criar/rascunho"
import { GerenciarAnuncio } from "@/src/mercado/gerenciar"
import { FalhaDaLeitura } from "@/src/negocios/FalhaDaLeitura"

/**
 * Anúncios da sessão sob RLS; mantém os rascunhos das jornadas ainda locais.
 */
export function MeusAnuncios() {
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<ListaDoMercado | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [carregandoMais, setCarregandoMais] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [rascunhos, setRascunhos] = useState<RascunhoImovel[]>([])
  const [outros, setOutros] = useState<RascunhoCriacao[]>([])
  const [expandido, setExpandido] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<string | null>(null)
  const [erroLocal, setErroLocal] = useState("")
  const [gerenciando, setGerenciando] = useState<AnuncioDaLista | null>(null)
  const paginaPendente = useRef<AbortController | null>(null)
  const geracaoDaLista = useRef(0)
  const [desapegoLocal] = useState(() =>
    lerRascunho(`bivaque:f03:desapego:${casca.cidade}`, { titulo: "" }),
  )

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o pedido de "tentar de novo"
  useEffect(() => {
    // Uma nova cidade/releitura invalida também as páginas pendentes.
    geracaoDaLista.current += 1
    paginaPendente.current?.abort()
    paginaPendente.current = null
    setCarregandoMais(false)
    setErroMais(false)
    const controle = new AbortController()
    setDados(null)
    setErro(null)
    void lerMeusAnuncios({ signal: controle.signal })
      .then((lidos) => {
        if (!controle.signal.aborted) setDados(lidos)
      })
      .catch((falha: unknown) => {
        if (!controle.signal.aborted) setErro(falha)
      })
    return () => {
      controle.abort()
      geracaoDaLista.current += 1
      paginaPendente.current?.abort()
      paginaPendente.current = null
    }
  }, [casca.cidade, rodada])

  useEffect(() => {
    setRascunhos(lerRascunhosImoveis(casca.cidade))
    setOutros(lerRascunhosCriacao(casca.cidade))
  }, [casca.cidade])

  const meus = dados?.anuncios ?? []
  const carregando = dados === null && erro === null
  async function carregarMais() {
    if (!dados?.proximo || carregandoMais || paginaPendente.current !== null) return
    const controle = new AbortController()
    paginaPendente.current = controle
    const geracao = geracaoDaLista.current
    const cursor = dados.proximo
    setCarregandoMais(true)
    setErroMais(false)
    try {
      const mais = await lerMeusAnuncios({ depois: cursor, signal: controle.signal })
      if (controle.signal.aborted || geracao !== geracaoDaLista.current) return
      setDados((atual) => {
        // O cursor identifica a página-base. Nunca acrescente resultados a uma
        // lista que foi substituída por troca de cidade, retry ou edição.
        if (controle.signal.aborted || geracao !== geracaoDaLista.current) return atual
        if (atual === null || atual.proximo !== cursor) return atual
        return { ...mais, anuncios: [...atual.anuncios, ...mais.anuncios] }
      })
    } catch {
      if (!controle.signal.aborted && geracao === geracaoDaLista.current) setErroMais(true)
    } finally {
      if (paginaPendente.current === controle) paginaPendente.current = null
      if (geracao === geracaoDaLista.current) setCarregandoMais(false)
    }
  }

  return (
    <section data-tela="meus-anuncios" className="grid gap-2">
      <CabecaDePagina
        titulo="Meus anúncios"
        subtitulo="Seus anúncios por estado e os rascunhos desta aba."
      />

      {desapegoLocal.titulo !== "" && (
        <section
          data-rascunho-desapego="sim"
          className="mt-3 grid gap-2 rounded-xl bg-(--surface-lowest) p-3 ring-1 ring-(--outline-variant)"
        >
          <b className="text-sm">Rascunho de desapego — não publicado</b>
          <p className="break-words text-sm">{desapegoLocal.titulo}</p>
          <Botao tom="texto" onClick={() => void navegacao.abrir("menu-criar")}>
            Continuar em Criar
          </Botao>
        </section>
      )}

      {rascunhos.length === 0 ? null : (
        <section data-meus-rascunhos="sim" className="mt-4 grid gap-2">
          <b className="text-[15px]">Rascunhos de imóveis — não publicados</b>
          {rascunhos.map((rascunho) => (
            <div
              key={rascunho.id}
              className="flex min-w-0 items-center gap-2 rounded-xl bg-(--surface-lowest) p-3 ring-1 ring-(--outline-variant)"
            >
              <span className="grid min-w-0 grow gap-0.5">
                <b className="truncate text-sm">{rascunho.titulo}</b>
                <small className="text-xs text-(--on-surface-variant)">
                  {rascunho.bairro} · {moeda(rascunho.preco)}
                </small>
              </span>
              <Botao tom="texto" onClick={() => void navegacao.irPara("imoveis")}>
                Ver
              </Botao>
            </div>
          ))}
        </section>
      )}

      {outros.length === 0 ? null : (
        <section data-rascunhos-criacao="sim" className="mt-3 grid gap-2">
          <b className="text-[15px]">Outros rascunhos — não publicados ({outros.length})</b>
          <p className="text-xs text-(--on-surface-variant)">
            Indicações e negócios ainda não são visíveis para outros membros.
          </p>
          {outros.map((item) => (
            <article
              key={item.id}
              data-rascunho-criacao={item.tipo}
              className="grid gap-2 rounded-xl bg-(--surface-lowest) p-3 ring-1 ring-(--outline-variant)"
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <span className="grid min-w-0 grow gap-1">
                  <small className="text-xs font-medium text-(--on-surface-variant)">
                    {DEFINICOES_CRIAR[item.tipo].nome}
                  </small>
                  <b className="break-words text-sm">{item.titulo}</b>
                  <small className="text-xs text-(--on-surface-variant)">{item.complemento}</small>
                </span>
                <Botao
                  tom="texto"
                  data-acao="detalhes-rascunho"
                  aria-expanded={expandido === item.id}
                  onClick={() => setExpandido((atual) => (atual === item.id ? null : item.id))}
                >
                  {expandido === item.id ? "Fechar" : "Ver"}
                </Botao>
              </div>
              {expandido === item.id ? (
                <div
                  data-detalhes-rascunho={item.id}
                  className="grid gap-2 border-t border-(--outline-variant) pt-2"
                >
                  <p className="whitespace-pre-wrap break-words text-sm">{item.descricao}</p>
                  {item.valor === null ? null : (
                    <p className="text-sm">Preço solicitado: {moeda(item.valor)}</p>
                  )}
                  {item.horario === null ? null : (
                    <p className="text-sm">Data informada: {item.horario.replace("T", " ")}</p>
                  )}
                  {confirmar === item.id ? (
                    <fieldset
                      aria-label="Confirmar exclusão"
                      className="flex flex-wrap items-center justify-end gap-2"
                    >
                      <small className="text-xs">Excluir rascunho desta sessão?</small>
                      <Botao tom="texto" onClick={() => setConfirmar(null)}>
                        Cancelar
                      </Botao>
                      <Botao
                        tom="contornado"
                        data-acao="confirmar-exclusao-rascunho"
                        onClick={() => {
                          if (!excluirRascunhoCriacao(casca.cidade, item.id)) {
                            setErroLocal("Não foi possível excluir este rascunho.")
                            return
                          }
                          setOutros(lerRascunhosCriacao(casca.cidade))
                          setExpandido(null)
                          setConfirmar(null)
                          setErroLocal("")
                        }}
                      >
                        Confirmar exclusão
                      </Botao>
                    </fieldset>
                  ) : (
                    <div className="flex justify-end">
                      <Botao
                        tom="texto"
                        data-acao="excluir-rascunho-criacao"
                        onClick={() => setConfirmar(item.id)}
                      >
                        Excluir rascunho
                      </Botao>
                    </div>
                  )}
                </div>
              ) : null}
            </article>
          ))}
          {erroLocal === "" ? null : (
            <p role="alert" className="text-xs text-(--destructive)">
              {erroLocal}
            </p>
          )}
        </section>
      )}

      {erro !== null ? (
        <FalhaDaLeitura falha={erro} aoTentar={() => setRodada((atual) => atual + 1)} />
      ) : carregando ? (
        <EsqueletoDeLista linhas={3} />
      ) : meus.length === 0 ? (
        <EstadoVazio
          titulo={
            rascunhos.length > 0 || outros.length > 0
              ? "Nenhum anúncio publicado"
              : "Você ainda não anunciou nada"
          }
          texto="Um anúncio bem explicado costuma vender rápido na cidade."
          icone="sell"
          acao={{
            rotulo: "Anunciar desapego",
            aoAcionar: () => void navegacao.abrir("menu-criar"),
          }}
        />
      ) : (
        <Grade formato="cartoes">
          {meus.map((anuncio) => (
            <div key={anuncio.id} className="grid gap-1">
              <CartaoDeFoto
                anuncio={{
                  id: anuncio.id,
                  titulo: anuncio.titulo,
                  fonte: anuncio.foto,
                  rotulo:
                    (
                      {
                        draft: "Rascunho",
                        active: "Ativo",
                        paused: "Pausado",
                        reserved: "Reservado",
                        sold: "Vendido",
                        closed: "Encerrado",
                      } as Record<string, string>
                    )[anuncio.status] ?? anuncio.status,
                  preco: anuncio.precoCents === null ? null : anuncio.precoCents / 100,
                  meta: anuncio.bairro ?? anuncio.cidade ?? "",
                }}
                aoAbrir={() => void navegacao.irPara("anuncio", { parametros: { id: anuncio.id } })}
              />
              <Botao
                tom="texto"
                data-acao="gerenciar-anuncio"
                data-valor={anuncio.id}
                onClick={() => setGerenciando(anuncio)}
              >
                Gerenciar
              </Botao>
            </div>
          ))}
        </Grade>
      )}
      {gerenciando === null ? null : (
        <GerenciarAnuncio
          key={gerenciando.id}
          anuncio={gerenciando}
          aberto
          aoFechar={() => setGerenciando(null)}
          aoGravar={() => setRodada((atual) => atual + 1)}
        />
      )}
      {erroMais && <p role="alert">Não foi possível carregar mais anúncios. Tente de novo.</p>}
      {dados?.proximo && (
        <Botao tom="contornado" disabled={carregandoMais} onClick={() => void carregarMais()}>
          {carregandoMais ? "Carregando…" : erroMais ? "Tentar de novo" : "Ver mais anúncios"}
        </Botao>
      )}
    </section>
  )
}
