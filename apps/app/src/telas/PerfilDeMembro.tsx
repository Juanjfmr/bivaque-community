"use client"

import { useParams } from "@tanstack/react-router"
import { useEffect, useState } from "react"

import { Botao } from "@/components/bivaque/botao"
import { Confirmacao } from "@/components/bivaque/confirmacao"
import { EsqueletoDeLista } from "@/components/bivaque/esqueleto"
import { EstadoVazio } from "@/components/bivaque/estado-vazio"
import { ItemDoMenu, MenuDaLinha } from "@/components/bivaque/menu-de-linha"
import { Secao } from "@/components/bivaque/secao"
import { FalhaDaApi } from "@/lib/api/cliente"
import { lerPerfilDeMembro, type PerfilDeMembro as Perfil } from "@/lib/dados/perfil"
import { bloquear } from "@/lib/dados/voce"
import { rotuloDeData } from "@/lib/formato"
import { useNavegacao, useRolagemEFoco } from "@/lib/navegacao/react"
import { CARGA_CONCLUIDA } from "@/lib/navegacao/restauracao"
import { validarParametros } from "@/lib/navegacao/rotas"
import { EstadoDeSessaoVencida } from "@/src/eventos/EstadosDeAcesso"
import { sessaoVencida } from "@/src/eventos/formulario"
import { Avatar, Ilustracao } from "@/src/pecas/pecas"
import { TelaIndisponivel } from "@/src/telas/TelaIndisponivel"

/**
 * O perfil de outra pessoa (F10), pela rota `/app/perfil/<id>`.
 *
 * Mostra só o que o servidor devolveu: nome, apresentação, publicações e
 * eventos que o LEITOR pode ver. Afiliação, cidade, contadores e selos do alvo
 * não existem aqui — BLOCK-AFFILIATION e o contrato do perfil da web. Alvo
 * invisível chega como 404 e a tela responde "página indisponível", nunca
 * "sem acesso": a existência da pessoa também é privada.
 *
 * A saída é o menu ⋯ (Mobbin f23df80d): Bloquear, pela porta existente
 * `/api/app/voce/bloqueados`, com confirmação. "Mandar mensagem" e "Denunciar
 * a pessoa" não têm rota no produto e ficam de fora (REGUA-002).
 */
export function PerfilDeMembro() {
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const id = parametros["id"] ?? ""
  const navegacao = useNavegacao()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [erro, setErro] = useState<"falhou" | "sessao" | "ausente" | null>(null)
  const [rodada, setRodada] = useState(0)
  const [bloqueado, setBloqueado] = useState(false)
  const [bloqueando, setBloqueando] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)

  useRolagemEFoco(CARGA_CONCLUIDA)

  // biome-ignore lint/correctness/useExhaustiveDependencies: rodada é o "tentar de novo"
  useEffect(() => {
    const controle = new AbortController()
    setPerfil(null)
    setErro(null)
    setBloqueado(false)
    setMensagem(null)
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
      <section data-tela="perfil" className="grid gap-2 pt-4 lg:mx-auto lg:max-w-[720px]">
        <EstadoDeSessaoVencida />
      </section>
    )
  }

  const bloquearPessoa = () => {
    if (bloqueando || perfil === null) return
    setBloqueando(true)
    setMensagem(null)
    void bloquear(perfil.id)
      .then(() => setBloqueado(true))
      .catch(() => setMensagem("Não foi possível bloquear agora. Tente de novo."))
      .finally(() => setBloqueando(false))
  }

  const nome =
    perfil === null ? "" : perfil.nome.trim() === "" ? "Membro da comunidade" : perfil.nome

  return (
    <section data-tela="perfil" className="grid gap-2 pt-4 lg:mx-auto lg:max-w-[720px]">
      {erro === "falhou" ? (
        <div
          data-aviso="perfil"
          className="flex items-center justify-between gap-2 rounded-2xl bg-(--surface-lowest) px-4 py-3 ring-1 ring-(--outline-variant)"
        >
          <p role="alert" className="text-sm text-(--destructive)">
            Não foi possível carregar este perfil agora.
          </p>
          <Botao tom="texto" className="shrink-0" onClick={() => setRodada((atual) => atual + 1)}>
            Tentar de novo
          </Botao>
        </div>
      ) : null}

      {perfil === null && erro === null ? <EsqueletoDeLista linhas={3} /> : null}

      {perfil === null ? null : (
        <>
          {/* A capa do vizinho (Mobbin 041fb7de): ilustrada, sem foto de
              pessoa que não a enviou. O escopo `.pc` traz o raio da peça. */}
          <div className="pc pc-embutido overflow-hidden rounded-2xl">
            <Ilustracao nome="cidade" proporcao="21 / 9" />
          </div>

          <header className="-mt-7 flex items-end gap-3 px-1">
            <span className="rounded-full ring-4 ring-(--background)">
              <Avatar nome={nome} tamanho={56} />
            </span>
            <span className="grid min-w-0 grow gap-0.5 pb-1">
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
            {bloqueado ? null : (
              <MenuDaLinha rotulo={`Opções do perfil de ${nome}`} className="ml-auto shrink-0 pb-1">
                {/*
                  A confirmação SUBSTITUI o menu na mesma entrada. Deixar o Radix
                  fechar o menu (Voltar da entrada) fecharia a confirmação junto,
                  porque cada entrada tem uma sobreposição só — o molde da
                  Conversa (RUN-165).
                */}
                <ItemDoMenu
                  perigo
                  onSelect={(evento) => evento.preventDefault()}
                  onClick={() =>
                    void navegacao.atualizarCom((atual) => ({
                      ...atual,
                      sobreposicao: "confirmacao",
                    }))
                  }
                >
                  Bloquear {nome}
                </ItemDoMenu>
              </MenuDaLinha>
            )}
          </header>

          {perfil.bio.trim() === "" ? null : (
            <p className="px-1 text-[15px] leading-6 whitespace-pre-line">{perfil.bio}</p>
          )}

          {bloqueado ? (
            <p
              role="status"
              className="rounded-2xl bg-(--surface-lowest) px-4 py-3 text-sm ring-1 ring-(--outline-variant)"
            >
              Você bloqueou {nome}. A conversa com esta pessoa fica fechada nos dois sentidos; o
              histórico continua visível para vocês; a pessoa não é avisada. Para voltar a
              conversar, desbloqueie em Pessoas bloqueadas, na área Você.
            </p>
          ) : null}

          {mensagem === null ? null : (
            <p role="alert" className="text-sm text-(--destructive)">
              {mensagem}
            </p>
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
        </>
      )}

      <Confirmacao
        titulo={`Bloquear ${nome}?`}
        texto="A conversa fica fechada nos dois sentidos; o histórico continua visível para vocês; a pessoa não é avisada. Você pode desfazer em Pessoas bloqueadas, na área Você."
        confirmar="Bloquear"
        perigo
        aoConfirmar={() => bloquearPessoa()}
      />
    </section>
  )
}
