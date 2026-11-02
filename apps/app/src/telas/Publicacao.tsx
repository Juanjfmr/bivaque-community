"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Campo } from "@/components/bivaque/campos"
import {
  CartaoDePublicacao,
  type TipoDePublicacao,
} from "@/components/bivaque/cartao-de-publicacao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Secao } from "@/components/bivaque/secao"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { iniciais } from "@/lib/texto"
import { useCasca } from "@/src/contexto/casca"
import { contagemDeComentarios, numero, quandoDe, registro, texto } from "@/src/telas/comum"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * A publicação da onda 4: o cartão completo e os comentários. O comentário
 * novo entra só nesta sessão (sem backend). Ficam para o refino: respostas com
 * negócio de origem, "ajudou a resolver", denúncia e moderação.
 */

const TIPOS: readonly TipoDePublicacao[] = ["pergunta", "evento", "enquete", "oferta", "publicacao"]

function tipoDe(valor: unknown): TipoDePublicacao {
  return typeof valor === "string" && (TIPOS as readonly string[]).includes(valor)
    ? (valor as TipoDePublicacao)
    : "publicacao"
}

export function Publicacao() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [uteis, setUteis] = useState<ReadonlySet<string>>(() => new Set())
  const [comentario, setComentario] = useState("")
  const [novos, setNovos] = useState<readonly string[]>([])

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

  const validacao = validarParametros("publicacao", { id })
  const publicacao = useMemo(
    () => (dados === null ? null : (dados.publicacoes.find((item) => item.id === id) ?? null)),
    [dados, id],
  )
  const apresentacao = registro(publicacao?.apresentacao)
  const comentarios = useMemo(() => contagemDeComentarios(dados), [dados])
  const lista = useMemo(() => {
    if (dados === null) return []
    return dados.comentarios.filter((item) => item.post_id === id)
  }, [dados, id])

  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro) {
    return (
      <section data-tela="publicacao" className="grid gap-2">
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }

  if (dados === null) {
    return (
      <section data-tela="publicacao" className="grid gap-2">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  }

  if (publicacao === null) return <TelaIndisponivel />

  const encontro = registro(apresentacao["event"])

  return (
    <section data-tela="publicacao" className="grid gap-2">
      <h1
        id="titulo-da-tela"
        data-titulo-da-tela
        tabIndex={-1}
        className="px-1 text-[22px] leading-7"
      >
        Publicação
      </h1>

      <CartaoDePublicacao
        publicacao={{
          id: publicacao.id,
          tipo: tipoDe(apresentacao["tipo"]),
          autor: texto(apresentacao["author"], "Membro da comunidade"),
          quando: quandoDe(apresentacao["at"]),
          texto: texto(apresentacao["text"], publicacao.content),
          resolvida: apresentacao["resolved"] === true,
          comentarios: comentarios.get(publicacao.id) ?? 0,
          uteis: numero(apresentacao["useful"]),
          util: apresentacao["liked"] === true || uteis.has(publicacao.id),
          ...(Object.keys(encontro).length === 0
            ? {}
            : {
                encontro: {
                  data: `${texto(encontro["date"])} ${texto(encontro["time"])}`.trim(),
                  local: texto(encontro["place"]),
                  confirmado: encontro["on"] === true,
                },
              }),
        }}
        aoMarcarUtil={() =>
          setUteis((atual) => {
            const proximo = new Set(atual)
            if (proximo.has(publicacao.id)) proximo.delete(publicacao.id)
            else proximo.add(publicacao.id)
            return proximo
          })
        }
      />

      <Secao titulo="Comentários">
        {lista.length === 0 && novos.length === 0 ? (
          <EstadoVazio
            titulo="Ainda sem comentários"
            texto="Comente para ajudar quem escreveu a chegar mais longe."
            icone="forum"
          />
        ) : (
          <div className="grid gap-3">
            {lista.map((item) => {
              const dadosDoComentario = registro(item.apresentacao)
              return (
                <article
                  key={item.id}
                  className="flex items-start gap-3 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--muted) text-sm font-semibold">
                    {iniciais(texto(dadosDoComentario["author"], "Membro"))}
                  </span>
                  <span className="grid gap-0.5">
                    <b className="text-sm">
                      {texto(dadosDoComentario["author"], "Membro da comunidade")}
                    </b>
                    <small className="text-[12px] text-(--on-surface-variant)">
                      {quandoDe(dadosDoComentario["at"])}
                    </small>
                    <p className="mt-1 text-[15px] leading-6">
                      {texto(dadosDoComentario["text"], item.content)}
                    </p>
                  </span>
                </article>
              )
            })}
            {novos.map((item) => (
              <article
                key={item}
                className="flex items-start gap-3 rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-(--secondary-container) text-sm font-semibold">
                  {iniciais("Você")}
                </span>
                <span className="grid gap-0.5">
                  <b className="text-sm">Você</b>
                  <small className="text-[12px] text-(--on-surface-variant)">agora</small>
                  <p className="mt-1 text-[15px] leading-6">{item}</p>
                </span>
              </article>
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Comente">
        <Campo
          id="comentario-da-publicacao"
          rotulo="Seu comentário"
          valor={comentario}
          aoMudar={setComentario}
          area
          nota="O comentário entra só nesta sessão de demonstração."
        />
        <div className="flex justify-end">
          <Botao
            icone="send"
            disabled={comentario.trim() === ""}
            onClick={() => {
              setNovos((atual) => [...atual, comentario.trim()])
              setComentario("")
            }}
          >
            Comentar
          </Botao>
        </div>
      </Secao>
    </section>
  )
}
