"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDePublicacao } from "@/components/bivaque/cartao-de-publicacao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import {
  buscarGrupo,
  type DetalheDoGrupo,
  type OrdemDoGrupo,
  type PublicacaoCriada,
} from "@/lib/dados/grupos"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { useAcoesDaPublicacao } from "@/src/grupos/AcoesDaPublicacao"
import { Escrever } from "@/src/grupos/Escrever"
import { EstadoDaLeitura } from "@/src/grupos/EstadoDaLeitura"
import {
  anuncioDaPublicacao,
  colocarNaLista,
  comPublicacaoRecente,
  retemOTopo,
} from "@/src/grupos/lista-do-grupo"
import { Participacao } from "@/src/grupos/Participacao"
import { Pedidos } from "@/src/grupos/Pedidos"
import { semConfirmacao } from "@/src/grupos/publicacao"
import { quandoDe } from "@/src/telas/comum"

/**
 * A primeira página como estava antes da primeira publicação desta visita; é
 * o cursor que a releitura depois de publicar usa. Vira `null` assim que a
 * lista deixa a página de cima, porque dali em diante o cursor não casa mais.
 */
type BaseParaPublicar = Readonly<{ ordem: OrdemDoGrupo; proximo: string | null }>

export function Grupo() {
  const { id = "" } = useParams({ strict: false }) as { id?: string }
  const navegacao = useNavegacao()
  const casca = useCasca()
  const [dados, setDados] = useState<DetalheDoGrupo | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [ordem, setOrdem] = useState<OrdemDoGrupo>("recentes")
  const [mais, setMais] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const [controle] = useState(() => new AbortController())
  const paginaPendente = useRef<AbortController | null>(null)
  const geracaoDoGrupo = useRef(0)
  // A publicação que acabou de entrar: recebe o foco uma vez, depois que a
  // releitura termina. `carimbo` sobe a cada envio e reinicia o anúncio.
  const [recemPublicada, setRecemPublicada] = useState<{ id: string; carimbo: number } | null>(null)
  const [anuncio, setAnuncio] = useState("")
  const baseParaPublicar = useRef<BaseParaPublicar | null>(null)
  const envios = useRef(0)
  const acoes = useAcoesDaPublicacao({
    admin: dados?.grupo.admin ?? false,
    fixada: dados?.grupo.fixada ?? null,
    aoMudar: ({ publicacao, fixada }) =>
      setDados((atual) =>
        atual
          ? {
              ...atual,
              grupo: { ...atual.grupo, fixada },
              publicacoes: atual.publicacoes
                .map((p) => (p.id === publicacao.id ? publicacao : p))
                .filter((p) =>
                  ordem === "ocultadas" ? p.oculta : !p.oculta && (ordem !== "salvas" || p.salva),
                ),
            }
          : atual,
      ),
  })
  useRolagemEFoco(CARGA_CONCLUIDA)
  useEffect(() => () => controle.abort(), [controle])
  useEffect(() => {
    if (recemPublicada === null || dados === null) return
    const alvo = document.getElementById(`publicacao-${recemPublicada.id}`)
    setAnuncio(anuncioDaPublicacao(dados.publicacoes, recemPublicada.id))
    setRecemPublicada(null)
    if (alvo === null) return
    // Rola e foca sem animação: é um deslocamento de contexto, não um gesto.
    alvo.focus({ preventScroll: true })
    alvo.scrollIntoView({ block: "nearest", behavior: "instant" })
  }, [recemPublicada, dados])
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada repete a leitura
  useEffect(() => {
    geracaoDoGrupo.current += 1
    paginaPendente.current?.abort()
    paginaPendente.current = null
    setMais(false)
    setErroMais(false)
    const pedido = new AbortController()
    setDados(null)
    setErro(null)
    void buscarGrupo(id, { ordem, signal: pedido.signal })
      .then((lidos) => {
        if (pedido.signal.aborted) return
        baseParaPublicar.current = { ordem, proximo: lidos.proximo }
        setDados(lidos)
      })
      .catch((falha: unknown) => {
        if (!pedido.signal.aborted) setErro(falha)
      })
    return () => {
      pedido.abort()
      geracaoDoGrupo.current += 1
      paginaPendente.current?.abort()
      paginaPendente.current = null
    }
  }, [id, ordem, rodada])
  async function carregarMais() {
    if (!dados?.proximo || mais || paginaPendente.current !== null) return
    const pedido = new AbortController()
    paginaPendente.current = pedido
    const geracao = geracaoDoGrupo.current
    const cursor = dados.proximo
    setMais(true)
    setErroMais(false)
    try {
      const pagina = await buscarGrupo(id, {
        ordem,
        depois: cursor,
        signal: pedido.signal,
      })
      if (pedido.signal.aborted || geracao !== geracaoDoGrupo.current) return
      setDados((atual) => {
        if (pedido.signal.aborted || geracao !== geracaoDoGrupo.current) return atual
        if (atual === null || atual.proximo !== cursor) return atual
        return { ...pagina, publicacoes: [...atual.publicacoes, ...pagina.publicacoes] }
      })
      // A lista saiu da página de cima: o cursor guardado não faz mais sentido.
      baseParaPublicar.current = null
    } catch {
      if (!pedido.signal.aborted && geracao === geracaoDoGrupo.current) setErroMais(true)
    } finally {
      if (paginaPendente.current === pedido) paginaPendente.current = null
      if (geracao === geracaoDoGrupo.current) setMais(false)
    }
  }
  /**
   * A publicação saiu. A lista é atualizada por inteiro — sem tela de
   * carregamento — para o cartão novo já trazer o nome de quem escreveu e ser
   * o primeiro item; a publicação recebe o foco quando os dados chegam.
   */
  async function aoPublicar(criada: PublicacaoCriada) {
    envios.current += 1
    const envio = envios.current
    const geracao = geracaoDoGrupo.current
    const base = baseParaPublicar.current
    const colocada = await colocarNaLista(id, criada, base, base?.ordem ?? ordem, {
      signal: controle.signal,
    }).catch(() => null)
    if (controle.signal.aborted || geracao !== geracaoDoGrupo.current) return
    if (colocada === null) {
      // Nada foi conferido: o cartão entra no começo e a leitura diz o que houve.
      setDados((atual) =>
        atual === null
          ? atual
          : {
              ...atual,
              publicacoes: comPublicacaoRecente(atual.publicacoes, criada.publicacao, null),
            },
      )
      setAnuncio(semConfirmacao({ primeiros: retemOTopo(ordem) }).frase)
      return
    }
    setDados((atual) => {
      if (atual === null) return atual
      return {
        ...atual,
        publicacoes: comPublicacaoRecente(atual.publicacoes, criada.publicacao, colocada.anterior),
        proximo: colocada.proximo ?? atual.proximo,
      }
    })
    if (colocada.entraNaLista) {
      setRecemPublicada({ id: criada.publicacao.id, carimbo: envio })
      return
    }
    setAnuncio(semConfirmacao({ primeiros: retemOTopo(base?.ordem ?? ordem) }).frase)
  }
  if (erro) return <EstadoDaLeitura erro={erro} aoTentar={() => setRodada((r) => r + 1)} />
  if (!dados)
    return (
      <section data-tela="grupo">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  const { grupo, publicacoes } = dados
  const primeira = recemPublicada !== null && publicacoes[0]?.id === recemPublicada.id
  return (
    <section data-tela="grupo" className="grid gap-3">
      <CabecaDePagina
        titulo={grupo.nome}
        subtitulo={`${grupo.membros === null ? "" : `${grupo.membros} membros · `}${grupo.fechado ? "Fechado" : "Aberto"}`}
        acao={grupo.fechado ? <Etiqueta tom="neutro">Fechado</Etiqueta> : undefined}
      />
      <Participacao
        key={grupo.id}
        grupo={grupo}
        aoMudar={(salvo) => {
          setDados((atual) =>
            atual
              ? {
                  ...atual,
                  grupo: salvo,
                  publicacoes: salvo.fechado && !salvo.membro ? [] : atual.publicacoes,
                  proximo: salvo.fechado && !salvo.membro ? null : atual.proximo,
                }
              : atual,
          )
          if (salvo.membro && !grupo.membro) {
            const geracao = geracaoDoGrupo.current
            void buscarGrupo(id, { ordem, signal: controle.signal })
              .then((lidos) => {
                if (!controle.signal.aborted && geracao === geracaoDoGrupo.current) setDados(lidos)
              })
              .catch((falha: unknown) => {
                if (!controle.signal.aborted && geracao === geracaoDoGrupo.current) setErro(falha)
              })
          }
        }}
      />
      <details
        data-regras-grupo="sim"
        className="rounded-2xl border border-(--outline-variant) bg-(--surface-lowest) p-3"
      >
        <summary className="min-h-11 cursor-pointer text-sm font-semibold">
          Sobre o grupo e regras
        </summary>
        <p className="mt-2 whitespace-pre-wrap text-sm">
          {grupo.regras || "Este grupo ainda não informou regras."}
        </p>
      </details>
      {grupo.admin ? <Pedidos key={grupo.id} id={grupo.id} /> : null}
      {grupo.membro ? (
        <Escrever key={grupo.id} grupo={grupo} cidade={casca.cidade} aoPublicar={aoPublicar} />
      ) : null}
      {/* O foco já leva ao cartão; o anúncio garante que quem usa leitor de
          tela saiba o que houve, inclusive quando a publicação não entrou. */}
      <p role="status" aria-live="polite" data-anuncio-da-publicacao="sim" className="sr-only">
        {anuncio}
      </p>
      {grupo.fechado && !grupo.membro ? (
        <p className="rounded-xl bg-(--surface-low) px-3 py-3 text-sm">
          O conteúdo dos grupos fechados é reservado aos membros.
        </p>
      ) : (
        <>
          <fieldset
            data-ordenacao-grupo="sim"
            aria-label="Ordenar publicações"
            className="flex flex-wrap gap-2"
          >
            {(
              [
                "recentes",
                "discutidas",
                ...(grupo.membro ? (["salvas", "ocultadas"] as const) : []),
              ] as const
            ).map((chave) => (
              <Botao
                key={chave}
                tom={ordem === chave ? "tonal" : "contornado"}
                aria-pressed={ordem === chave}
                onClick={() => setOrdem(chave)}
              >
                {
                  {
                    recentes: "Recentes",
                    discutidas: "Mais discutidas",
                    salvas: "Salvas",
                    ocultadas: "Ocultadas",
                  }[chave]
                }
              </Botao>
            ))}
          </fieldset>
          {publicacoes.length === 0 ? (
            <EstadoVazio
              titulo="Ainda sem publicações"
              texto="Quando alguém escrever no grupo, o que importa aparece aqui."
              icone="forum"
            />
          ) : (
            publicacoes.map((p, indice) => (
              <div
                key={p.id}
                data-publicacao-na-lista="sim"
                data-primeira-da-lista={indice === 0 ? "sim" : undefined}
                className="grid gap-2"
              >
                {grupo.fixada === p.id ? (
                  <Etiqueta tom="neutro" icone="pin">
                    Publicação fixada
                  </Etiqueta>
                ) : null}
                <CartaoDePublicacao
                  alvoDeFoco={primeira && p.id === recemPublicada?.id}
                  publicacao={{
                    ...p,
                    tipo: "publicacao",
                    autor: p.autor || "Membro do grupo",
                    quando: quandoDe(p.criadaEm),
                    menu: grupo.membro ? acoes.menu(p) : undefined,
                  }}
                  {...(grupo.membro ? { aoMarcarUtil: () => acoes.util(p) } : {})}
                  aoComentar={() =>
                    void navegacao.irPara("publicacao", { parametros: { id: p.id } })
                  }
                />
                {p.fotos.map((foto) => (
                  <img
                    key={foto}
                    src={foto}
                    alt="Foto da publicação"
                    className="w-full rounded-2xl"
                  />
                ))}
              </div>
            ))
          )}
          {erroMais ? (
            <p role="alert">Não foi possível carregar mais publicações. Tente de novo.</p>
          ) : null}
          {dados.proximo ? (
            <Botao tom="tonal" disabled={mais} onClick={() => void carregarMais()}>
              {mais ? "Carregando…" : "Ver mais publicações"}
            </Botao>
          ) : null}
        </>
      )}
      {acoes.retorno}
    </section>
  )
}
