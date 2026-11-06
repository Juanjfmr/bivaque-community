"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { Botao } from "@/components/bivaque/botao"
import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { CartaoDePublicacao } from "@/components/bivaque/cartao-de-publicacao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { buscarGrupo, type DetalheDoGrupo, type OrdemDoGrupo } from "@/lib/dados/grupos"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { useCasca } from "@/src/contexto/casca"
import { useAcoesDaPublicacao } from "@/src/grupos/AcoesDaPublicacao"
import { Escrever } from "@/src/grupos/Escrever"
import { EstadoDaLeitura } from "@/src/grupos/EstadoDaLeitura"
import { Participacao } from "@/src/grupos/Participacao"
import { Pedidos } from "@/src/grupos/Pedidos"
import { quandoDe } from "@/src/telas/comum"

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
  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada repete a leitura
  useEffect(() => {
    const pedido = new AbortController()
    setDados(null)
    setErro(null)
    void buscarGrupo(id, { ordem, signal: pedido.signal })
      .then((lidos) => {
        if (!pedido.signal.aborted) setDados(lidos)
      })
      .catch((falha: unknown) => {
        if (!pedido.signal.aborted) setErro(falha)
      })
    return () => pedido.abort()
  }, [id, ordem, rodada])
  async function carregarMais() {
    if (!dados?.proximo || mais) return
    setMais(true)
    setErroMais(false)
    try {
      const pagina = await buscarGrupo(id, {
        ordem,
        depois: dados.proximo,
        signal: controle.signal,
      })
      if (!controle.signal.aborted)
        setDados({ ...pagina, publicacoes: [...dados.publicacoes, ...pagina.publicacoes] })
    } catch {
      if (!controle.signal.aborted) setErroMais(true)
    } finally {
      if (!controle.signal.aborted) setMais(false)
    }
  }
  if (erro) return <EstadoDaLeitura erro={erro} aoTentar={() => setRodada((r) => r + 1)} />
  if (!dados)
    return (
      <section data-tela="grupo">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  const { grupo, publicacoes } = dados
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
          if (salvo.membro && !grupo.membro)
            void buscarGrupo(id, { ordem, signal: controle.signal })
              .then(setDados)
              .catch((falha: unknown) => {
                if (!controle.signal.aborted) setErro(falha)
              })
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
      {grupo.membro ? <Escrever key={grupo.id} grupo={grupo} cidade={casca.cidade} /> : null}
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
            publicacoes.map((p) => (
              <div key={p.id} className="grid gap-2">
                {grupo.fixada === p.id ? (
                  <Etiqueta tom="neutro" icone="pin">
                    Publicação fixada
                  </Etiqueta>
                ) : null}
                <CartaoDePublicacao
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
