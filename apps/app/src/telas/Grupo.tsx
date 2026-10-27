"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useMemo, useState } from "react"

import { CabecaDePagina } from "@/components/bivaque/cabeca-de-pagina"
import { Capa } from "@/components/bivaque/capa"
import {
  CartaoDePublicacao,
  type TipoDePublicacao,
} from "@/components/bivaque/cartao-de-publicacao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Etiqueta } from "@/components/bivaque/etiqueta"
import { Icone } from "@/components/bivaque/icone"
import { InteracoesDoGrupo } from "@/components/bivaque/interacoes-grupo"
import { type DadosDaCidade, dadosDoApp } from "@/lib/dados"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { useCasca } from "@/src/contexto/casca"
import { contagemDeComentarios, numero, quandoDe, registro, texto } from "@/src/telas/comum"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * O grupo da onda 4 (protótipo: features/groups/views.js), com dados de
 * demonstração.
 *
 * V1: nome, membros, privacidade, aviso fixado e as publicações do grupo no
 * cartão completo. Ficam para o refino: pedidos de entrada, moderação, menu do
 * autor, escrever no grupo, encerrado/só leitura e o "motivo" do grupo.
 */

const TIPOS: readonly TipoDePublicacao[] = ["pergunta", "evento", "enquete", "oferta", "publicacao"]

function tipoDe(valor: unknown): TipoDePublicacao {
  return typeof valor === "string" && (TIPOS as readonly string[]).includes(valor)
    ? (valor as TipoDePublicacao)
    : "publicacao"
}

export function Grupo() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const casca = useCasca()
  const navegacao = useNavegacao()
  const [dados, setDados] = useState<DadosDaCidade | null>(null)
  const [erro, setErro] = useState(false)
  const [rodada, setRodada] = useState(0)
  const [uteis, setUteis] = useState<ReadonlySet<string>>(() => new Set())
  const [ordem, setOrdem] = useState<"recentes" | "discutidas">("recentes")

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

  const validacao = validarParametros("grupo", { id })
  const grupo = useMemo(
    () => (dados === null ? null : (dados.grupos.find((item) => item.id === id) ?? null)),
    [dados, id],
  )
  const apresentacao = registro(grupo?.apresentacao)
  const comentarios = useMemo(() => contagemDeComentarios(dados), [dados])
  const publicacoes = useMemo(() => {
    if (dados === null) return []
    return dados.publicacoes
      .filter((item) => item.group_id === id)
      .sort((a, b) =>
        ordem === "discutidas"
          ? (comentarios.get(b.id) ?? 0) - (comentarios.get(a.id) ?? 0)
          : numero(registro(b.apresentacao)["at"]) - numero(registro(a.apresentacao)["at"]),
      )
  }, [dados, id, ordem, comentarios])

  const alternarUtil = (chave: string) => {
    setUteis((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(chave)) proximo.delete(chave)
      else proximo.add(chave)
      return proximo
    })
  }

  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />

  if (erro) {
    return (
      <section data-tela="grupo" className="grid gap-2">
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }

  if (dados === null) {
    return (
      <section data-tela="grupo" className="grid gap-2">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  }

  if (grupo === null) return <TelaIndisponivel />

  const membros = numero(apresentacao["members"])
  const privacidade = texto(apresentacao["privacy"], "aberto")
  const fixado = texto(apresentacao["pinned"])
  const pedidos = Array.isArray(apresentacao["requests"])
    ? apresentacao["requests"].map((valor) => {
        const item = registro(valor)
        return { nome: texto(item["name"], "Membro"), nota: texto(item["note"]) }
      })
    : []

  return (
    <section data-tela="grupo" className="grid gap-2">
      {texto(apresentacao["img"]) === "" ? null : (
        <Capa
          fonte={texto(apresentacao["img"])}
          alt={`Capa do grupo ${grupo.name}`}
          className="rounded-2xl"
        />
      )}
      <CabecaDePagina
        titulo={texto(apresentacao["t"], grupo.name)}
        subtitulo={`${membros > 0 ? `${membros} membros` : "Grupo novo"} · ${privacidade === "fechado" ? "Fechado" : "Aberto"}`}
        acao={privacidade === "fechado" ? <Etiqueta tom="neutro">Fechado</Etiqueta> : undefined}
      />

      <InteracoesDoGrupo
        id={id}
        cidade={casca.cidade}
        fechado={privacidade === "fechado"}
        membro={apresentacao["on"] === true}
        pendente={apresentacao["pending"] === true}
        admin={apresentacao["role"] === "admin"}
        sobre={texto(apresentacao["about"], grupo.description ?? "")}
        regras={texto(
          apresentacao["rules"],
          "Respeite todos os membros e mantenha as conversas pertinentes.",
        )}
        pedidos={pedidos}
      >
        {fixado === "" ? null : (
          <p className="flex items-center gap-2 rounded-2xl bg-(--secondary-container) px-4 py-3 text-sm">
            <Icone nome="pin" className="size-5 shrink-0" />
            {fixado}
          </p>
        )}

        <fieldset
          data-ordenacao-grupo="sim"
          aria-label="Ordenar publicações"
          className="flex min-w-0 gap-2 overflow-x-auto pb-1"
        >
          {(
            [
              ["recentes", "Recentes"],
              ["discutidas", "Mais discutidas"],
            ] as const
          ).map(([chave, rotulo]) => (
            <button
              key={chave}
              type="button"
              aria-pressed={ordem === chave}
              className={
                ordem === chave
                  ? "min-h-11 shrink-0 rounded-full bg-(--secondary-container) px-4 text-sm font-semibold"
                  : "min-h-11 shrink-0 rounded-full border border-(--outline-variant) px-4 text-sm"
              }
              onClick={() => setOrdem(chave)}
            >
              {rotulo}
            </button>
          ))}
        </fieldset>
        {publicacoes.length === 0 ? (
          <EstadoVazio
            titulo="Ainda sem publicações"
            texto="Quando alguém escrever no grupo, o que importa aparece aqui."
            icone="forum"
          />
        ) : (
          <div className="grid gap-3">
            {publicacoes.map((item) => {
              const dadosDaPublicacao = registro(item.apresentacao)
              const encontro = registro(dadosDaPublicacao["event"])
              return (
                <CartaoDePublicacao
                  key={item.id}
                  publicacao={{
                    id: item.id,
                    tipo: tipoDe(dadosDaPublicacao["tipo"]),
                    autor: texto(dadosDaPublicacao["author"], "Membro do grupo"),
                    quando: quandoDe(dadosDaPublicacao["at"]),
                    texto: texto(dadosDaPublicacao["text"], item.content),
                    resolvida: dadosDaPublicacao["resolved"] === true,
                    comentarios: comentarios.get(item.id) ?? 0,
                    uteis: numero(dadosDaPublicacao["useful"]),
                    util: dadosDaPublicacao["liked"] === true || uteis.has(item.id),
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
                  aoMarcarUtil={() => alternarUtil(item.id)}
                  aoComentar={() =>
                    void navegacao.irPara("publicacao", { parametros: { id: item.id } })
                  }
                />
              )
            })}
          </div>
        )}
      </InteracoesDoGrupo>
    </section>
  )
}
