"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoDeErro, EstadoVazio } from "@/components/bivaque/estado-vazio"
import { Secao } from "@/components/bivaque/secao"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { FalhaDaApi } from "@/lib/api/cliente"
import { lerPerfilDeMembro, type PerfilDeMembro as Perfil } from "@/lib/dados/perfil"
import { rotuloDeData } from "@/lib/formato"
import { useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { iniciais } from "@/lib/texto"
import { EstadoDeSessaoVencida } from "@/src/eventos/EstadosDeAcesso"
import { sessaoVencida } from "@/src/eventos/formulario"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * O perfil de outra pessoa (F10), pela rota `/app/perfil/<id>`.
 *
 * Mostra só o que o servidor devolveu: nome, apresentação, publicações e
 * eventos que o LEITOR pode ver. Afiliação, cidade, contadores e selos do alvo
 * não existem aqui — BLOCK-AFFILIATION e o contrato do perfil da web. Alvo
 * invisível chega como 404 e a tela responde "página indisponível", nunca
 * "sem acesso": a existência da pessoa também é privada.
 */
export function PerfilDeMembro() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "ausente" | null>(null)
  const [rodada, setRodada] = useState(0)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setPerfil(null)
    setErro(null)
    void lerPerfilDeMembro(id, { signal: controle.signal })
      .then((lido) => {
        if (!controle.signal.aborted) setPerfil(lido)
      })
      .catch((falha: unknown) => {
        if (controle.signal.aborted) return
        setErro(
          sessaoVencida(falha)
            ? "sessao"
            : falha instanceof FalhaDaApi && falha.status === 404
              ? "ausente"
              : "falhou",
        )
      })
    return () => controle.abort()
  }, [id, rodada])

  const validacao = validarParametros("perfil", { id })
  if (!validacao.ok) return <TelaIndisponivel motivo={validacao.motivo} />
  if (erro === "ausente") return <TelaIndisponivel />

  if (erro === "sessao") {
    return (
      <section data-tela="perfil" className="grid gap-2">
        <EstadoDeSessaoVencida />
      </section>
    )
  }
  if (erro === "falhou") {
    return (
      <section data-tela="perfil" className="grid gap-2">
        <EstadoDeErro aoTentar={() => setRodada((atual) => atual + 1)} />
      </section>
    )
  }
  if (perfil === null) {
    return (
      <section data-tela="perfil" className="grid gap-2">
        <EsqueletoDeLista linhas={3} />
      </section>
    )
  }

  const nome = perfil.nome.trim() === "" ? "Membro da comunidade" : perfil.nome
  return (
    <section data-tela="perfil" className="grid gap-2">
      <header className="flex items-center gap-3 px-1 py-2">
        <Avatar size="lg" className="size-14 shrink-0" aria-hidden="true">
          <AvatarFallback className="bg-(--secondary-container) text-lg font-semibold">
            {iniciais(nome)}
          </AvatarFallback>
        </Avatar>
        <span className="grid min-w-0 grow gap-0.5">
          <h1
            id="titulo-da-tela"
            data-titulo-da-tela
            tabIndex={-1}
            className="truncate text-[22px] leading-7"
          >
            {nome}
          </h1>
          <small className="text-(--on-surface-variant)">Membro da comunidade</small>
        </span>
      </header>

      {perfil.bio.trim() === "" ? null : (
        <p className="px-1 text-[15px] leading-6 whitespace-pre-line">{perfil.bio}</p>
      )}

      <Secao titulo="Publicações">
        {perfil.publicacoes.length === 0 ? (
          <EstadoVazio
            titulo="Nenhuma publicação visível"
            texto="O que vocês dois podem ver aparece aqui."
            icone="forum"
          />
        ) : (
          <ul className="grid gap-3">
            {perfil.publicacoes.map((publicacao) => (
              <li
                key={publicacao.id}
                className="rounded-2xl bg-(--surface-lowest) p-4 ring-1 ring-(--outline-variant)"
              >
                <p className="text-[15px] leading-6 whitespace-pre-line">{publicacao.texto}</p>
                <small className="text-(--on-surface-variant)">
                  {rotuloDeData(publicacao.criadaEm.slice(0, 10))}
                </small>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao titulo="Eventos">
        {perfil.eventos.length === 0 ? (
          <EstadoVazio
            titulo="Nenhum evento visível"
            texto="Os encontros que essa pessoa organiza aparecem aqui."
            icone="event"
          />
        ) : (
          <ul className="grid gap-2">
            {perfil.eventos.map((evento) => (
              <li
                key={evento.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)"
              >
                <b className="text-[15px]">{evento.titulo}</b>
                <small className="shrink-0 text-(--on-surface-variant)">
                  {rotuloDeData(evento.comecaEm.slice(0, 10))}
                </small>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </section>
  )
}
