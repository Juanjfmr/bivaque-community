"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import { CartaoDePublicacao } from "@/components/bivaque/cartao-de-publicacao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Secao } from "@/components/bivaque/secao"
import { FalhaDaApi } from "@/lib/api/cliente"
import {
  buscarPublicacao,
  type ComentarioReal,
  comentarPublicacao,
  type DetalheDaPublicacao,
  marcarComentarioUtil,
} from "@/lib/dados/grupos"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { iniciais } from "@/lib/texto"
import { useAcoesDaPublicacao } from "@/src/grupos/AcoesDaPublicacao"
import { EstadoDaLeitura } from "@/src/grupos/EstadoDaLeitura"
import { quandoDe } from "@/src/telas/comum"

export function Publicacao() {
  const { id = "" } = useParams({ strict: false }) as { id?: string }
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DetalheDaPublicacao | null>(null)
  const [erro, setErro] = useState<unknown>(null)
  const [rodada, setRodada] = useState(0)
  const [texto, setTexto] = useState("")
  const [alvo, setAlvo] = useState<ComentarioReal | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [erroEnvio, setErroEnvio] = useState("")
  const [mais, setMais] = useState(false)
  const [erroMais, setErroMais] = useState(false)
  const [comentarioOcupado, setComentarioOcupado] = useState(false)
  const compositor = useRef<HTMLDivElement>(null)
  const [controle] = useState(() => new AbortController())
  const acoes = useAcoesDaPublicacao({
    admin: dados?.grupo.admin ?? false,
    fixada: dados?.grupo.fixada ?? null,
    aoMudar: ({ publicacao, fixada }) =>
      setDados((atual) =>
        atual ? { ...atual, publicacao, grupo: { ...atual.grupo, fixada } } : atual,
      ),
  })
  useRolagemEFoco(CARGA_CONCLUIDA)
  useEffect(() => () => controle.abort(), [controle])
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada repete a leitura
  useEffect(() => {
    const pedido = new AbortController()
    setDados(null)
    setErro(null)
    setAlvo(null)
    void buscarPublicacao(id, { signal: pedido.signal })
      .then((lidos) => {
        if (!pedido.signal.aborted) setDados(lidos)
      })
      .catch((falha: unknown) => {
        if (!pedido.signal.aborted) setErro(falha)
      })
    return () => pedido.abort()
  }, [id, rodada])
  async function carregarMais() {
    if (!dados?.proximo || mais) return
    setMais(true)
    setErroMais(false)
    try {
      const pagina = await buscarPublicacao(id, { depois: dados.proximo, signal: controle.signal })
      if (!controle.signal.aborted)
        setDados({
          ...pagina,
          comentarios: [
            ...dados.comentarios,
            ...pagina.comentarios.filter(
              (c) => !dados.comentarios.some((existente) => existente.id === c.id),
            ),
          ],
        })
    } catch {
      if (!controle.signal.aborted) setErroMais(true)
    } finally {
      if (!controle.signal.aborted) setMais(false)
    }
  }
  async function comentar() {
    if (!dados || enviando) return
    setEnviando(true)
    setErroEnvio("")
    try {
      const comentario = await comentarPublicacao(id, texto, alvo?.id ?? null, {
        signal: controle.signal,
      })
      if (controle.signal.aborted) return
      setDados((atual) =>
        atual
          ? {
              ...atual,
              comentarios: [
                ...atual.comentarios,
                { ...comentario, para: alvo?.propria ? "Você" : (alvo?.autor ?? "") },
              ],
              publicacao: { ...atual.publicacao, comentarios: atual.publicacao.comentarios + 1 },
            }
          : atual,
      )
      setTexto("")
      setAlvo(null)
    } catch (falha: unknown) {
      if (!controle.signal.aborted)
        setErroEnvio(
          falha instanceof FalhaDaApi && falha.mensagem
            ? falha.mensagem
            : "Não foi possível enviar o comentário. Seu texto foi mantido. Tente de novo.",
        )
    } finally {
      if (!controle.signal.aborted) setEnviando(false)
    }
  }
  function responder(comentario: ComentarioReal) {
    setAlvo(comentario)
    compositor.current?.querySelector("textarea")?.focus()
  }
  async function utilNoComentario(c: ComentarioReal) {
    if (comentarioOcupado) return
    setComentarioOcupado(true)
    setErroEnvio("")
    try {
      const salvo = await marcarComentarioUtil(id, c.id, !c.util, { signal: controle.signal })
      if (!controle.signal.aborted)
        setDados((atual) =>
          atual
            ? {
                ...atual,
                comentarios: atual.comentarios.map((linha) =>
                  linha.id === salvo.id ? { ...linha, ...salvo } : linha,
                ),
              }
            : atual,
        )
    } catch {
      if (!controle.signal.aborted) setErroEnvio("Não foi possível atualizar Útil. Tente de novo.")
    } finally {
      if (!controle.signal.aborted) setComentarioOcupado(false)
    }
  }
  if (erro) return <EstadoDaLeitura erro={erro} aoTentar={() => setRodada((r) => r + 1)} />
  if (!dados)
    return (
      <section data-tela="publicacao">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  const { publicacao: p, comentarios, grupo } = dados
  const ids = new Set(comentarios.map((c) => c.id))
  const raizes = comentarios.filter((c) => c.parentId === null || !ids.has(c.parentId))
  function bolha(c: ComentarioReal, resposta: boolean) {
    return (
      <article
        key={c.id}
        data-comentario={c.id}
        data-resposta={resposta ? "sim" : "nao"}
        className={`flex items-start gap-3 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant) ${resposta ? "ml-4" : ""}`}
      >
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-(--muted) text-sm font-semibold"
        >
          {iniciais(c.propria ? "Você" : c.autor || "Membro")}
        </span>
        <div className="grid min-w-0 grow gap-1">
          <b className="text-sm">{c.propria ? "Você" : c.autor || "Membro do grupo"}</b>
          <small className="text-(--on-surface-variant)">{quandoDe(c.criadaEm)}</small>
          {c.respondeA ? (
            <small className="text-(--on-surface-variant)">
              Em resposta a {c.para || "um comentário"}
            </small>
          ) : null}
          <p className="whitespace-pre-wrap break-words text-[15px] leading-6">{c.texto}</p>
          {grupo.membro ? (
            <div className="flex flex-wrap gap-2">
              <Botao tom="texto" className="justify-self-start" onClick={() => responder(c)}>
                Responder
              </Botao>
              <Botao
                tom="texto"
                disabled={comentarioOcupado}
                aria-pressed={c.util}
                onClick={() => void utilNoComentario(c)}
              >
                Útil ({c.uteis})
              </Botao>
            </div>
          ) : null}
        </div>
      </article>
    )
  }
  return (
    <section data-tela="publicacao" className="grid gap-3">
      <h1
        id="titulo-da-tela"
        data-titulo-da-tela
        tabIndex={-1}
        className="px-1 text-[22px] leading-7"
      >
        Publicação
      </h1>
      <Botao
        tom="texto"
        className="justify-self-start"
        onClick={() => void navegacao.irPara("grupo", { parametros: { id: grupo.id } })}
      >
        {grupo.nome}
      </Botao>
      <CartaoDePublicacao
        publicacao={{
          ...p,
          tipo: "publicacao",
          autor: p.propria ? "Você" : p.autor || "Membro do grupo",
          quando: quandoDe(p.criadaEm),
          menu: grupo.membro ? acoes.menu(p) : undefined,
        }}
        {...(grupo.membro ? { aoMarcarUtil: () => acoes.util(p) } : {})}
        aoComentar={() => compositor.current?.querySelector("textarea")?.focus()}
      />
      {acoes.retorno}
      {p.oculta ? <p role="status">Esta publicação está oculta para você no grupo.</p> : null}
      {p.fotos.map((foto) => (
        <img key={foto} src={foto} alt="Foto da publicação" className="w-full rounded-2xl" />
      ))}
      <Secao titulo="Comentários">
        {comentarios.length === 0 ? (
          <EstadoVazio
            titulo="Ainda sem comentários"
            texto="Comente para ajudar quem escreveu a chegar mais longe."
            icone="forum"
          />
        ) : (
          <div className="grid gap-3">
            {raizes.map((raiz) => (
              <div key={raiz.id} className="grid gap-3">
                {bolha(raiz, raiz.parentId !== null)}
                {comentarios.filter((c) => c.parentId === raiz.id).map((c) => bolha(c, true))}
              </div>
            ))}
          </div>
        )}
        {erroMais ? (
          <p role="alert">Não foi possível carregar mais comentários. Tente de novo.</p>
        ) : null}
        {dados.proximo ? (
          <Botao tom="tonal" disabled={mais} onClick={() => void carregarMais()}>
            {mais ? "Carregando…" : "Ver mais comentários"}
          </Botao>
        ) : null}
      </Secao>
      {grupo.membro ? (
        <div
          ref={compositor}
          data-compositor-publicacao="sim"
          className="sticky bottom-0 z-10 grid gap-2 rounded-2xl bg-(--surface-lowest) p-3 ring-1 ring-(--outline-variant)"
        >
          {alvo ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm">
                Respondendo a {alvo.propria ? "você" : alvo.autor || "um membro"}
              </span>
              <Botao tom="texto" onClick={() => setAlvo(null)}>
                Cancelar resposta
              </Botao>
            </div>
          ) : null}
          <Campo
            id="comentario-da-publicacao"
            rotulo="Seu comentário"
            valor={texto}
            aoMudar={setTexto}
            area
            nota={`${texto.length}/1000 caracteres`}
          />
          {erroEnvio ? (
            <p role="alert" className="text-sm text-(--destructive)">
              {erroEnvio}
            </p>
          ) : null}
          <Botao
            icone="send"
            disabled={enviando || texto.trim().length < 1 || texto.trim().length > 1000}
            onClick={() => void comentar()}
          >
            {enviando ? "Enviando…" : alvo ? "Enviar resposta" : "Comentar"}
          </Botao>
        </div>
      ) : (
        <p>Entre no grupo para comentar.</p>
      )}
    </section>
  )
}
