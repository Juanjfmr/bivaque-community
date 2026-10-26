import { useParams } from "@tanstack/react-router"
import { useEffect, useRef } from "react"

import { BotaoDeIcone } from "@/components/bivaque/botao"
import { Icone } from "@/components/bivaque/icone"
import { Marca } from "@/components/bivaque/marca"
import { Button } from "@/components/ui/button"
import { acoesDaBarraDoTopo } from "@/lib/casca"
import { useNavegacao, useRotaAtual } from "@/lib/navegacao/react"
import { useCasca } from "@/src/contexto/casca"

/**
 * A barra do topo (inventário §5.2, com a barra nova do ADR §3.1).
 *
 * O que muda por rota é conta em `lib/casca.ts`; aqui é a montagem: marca ou
 * volta à esquerda, título, e à direita os avisos (só na Início), as conversas
 * com contador, o chip de cidade e a busca. Na rota `busca` a barra vira o
 * campo de busca em tela cheia.
 */
export function BarraDoTopo({
  docada,
  podeSubir,
}: {
  readonly docada: boolean
  readonly podeSubir: boolean
}) {
  const rota = useRotaAtual()
  const parametros = useParams({ strict: false }) as Record<string, string | undefined>
  const navegacao = useNavegacao()
  const casca = useCasca()
  const acoes = acoesDaBarraDoTopo(rota.nome)

  if (!acoes.barra) return null

  return (
    <header
      data-casca="topo"
      data-topo="barra"
      data-rota={rota.nome}
      data-docada={docada ? "sim" : "nao"}
      data-titulo-pode-subir={podeSubir ? "sim" : "nao"}
    >
      {acoes.buscaEmTelaCheia ? (
        <BuscaEmTelaCheia />
      ) : (
        <>
          {acoes.marca ? (
            <Marca className="size-7" />
          ) : (
            <BotaoDeIcone
              rotulo="Voltar"
              nome="arrow_back"
              data-acao="voltar"
              onClick={() => void navegacao.voltar()}
            />
          )}
          <span data-titulo="topo">
            {rota.nome === "conversa" &&
            casca.conversaNoTopo &&
            casca.conversaNoTopo.id === parametros["id"]
              ? casca.conversaNoTopo.nome
              : rota.nome === "guia"
                ? `Guia de ${casca.cidade}`
                : rota.titulo}
          </span>
          <span className="grow" />

          {acoes.avisos ? (
            <BotaoDeIcone
              rotulo="Avisos"
              nome="notifications"
              data-acao="avisos"
              className="relative"
            >
              <Contador quantidade={casca.avisos} nome="avisos" />
            </BotaoDeIcone>
          ) : null}

          {acoes.conversas ? (
            <BotaoDeIcone
              rotulo="Conversas"
              nome="chat_bubble"
              data-acao="conversas-topo"
              className="relative"
              onClick={() => void navegacao.irPara("conversas")}
            >
              <Contador quantidade={casca.conversas} nome="conversas" />
            </BotaoDeIcone>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            data-acao="cidade"
            aria-haspopup="dialog"
            data-cidade-atual={casca.cidade}
            onClick={() => void navegacao.abrir("cidade")}
            className="inline-flex min-h-11 max-w-40 shrink-0 gap-1 rounded-xl px-3 text-sm font-semibold"
          >
            <Icone nome="place" className="size-5" />
            <span className="truncate">{casca.cidade}</span>
            <Icone nome="expand_more" className="size-4" />
          </Button>

          {acoes.busca ? (
            <BotaoDeIcone
              rotulo="Buscar"
              nome="search"
              data-acao="buscar"
              onClick={() => void navegacao.irPara("busca")}
            />
          ) : null}
        </>
      )}
    </header>
  )
}

/** O contador sobre o ícone (protótipo: `.badge` na barra). */
function Contador({ quantidade, nome }: { quantidade: number; nome: "avisos" | "conversas" }) {
  if (quantidade <= 0) return null
  return (
    <span
      data-contador={nome}
      className="absolute -top-0.5 right-0.5 grid min-w-5 place-items-center rounded-full bg-(--brasa) px-1 text-[11px] font-bold text-(--brasa-foreground)"
    >
      {quantidade}
    </span>
  )
}

/** A rota `busca` toma a barra: Voltar, campo e limpar (§5.2). */
function BuscaEmTelaCheia() {
  const navegacao = useNavegacao()
  const { consulta: busca, definirConsulta: setBusca } = useCasca()
  const campo = useRef<HTMLInputElement | null>(null)

  // O foco no campo ao abrir a busca é do protótipo (§5.2), feito no efeito e
  // não pelo atributo `autoFocus` (§5.9): o `autoFocus` global roubava o foco
  // de quem quer que estivesse na página e o Biome o proíbe.
  useEffect(() => {
    campo.current?.focus()
  }, [])

  return (
    <>
      <BotaoDeIcone
        rotulo="Voltar"
        nome="arrow_back"
        data-acao="voltar"
        onClick={() => void navegacao.voltar()}
      />
      <span className="flex min-w-0 grow items-center gap-2">
        <Icone nome="search" className="size-5 shrink-0 text-(--on-surface-variant)" />
        <input
          ref={campo}
          data-campo="busca"
          type="search"
          inputMode="search"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          aria-label="Buscar no Bivaque"
          placeholder="Buscar no Bivaque"
          className="min-h-11 w-full min-w-0 rounded-xl border border-(--input) bg-transparent px-3 text-base outline-none focus-visible:border-(--ring)"
        />
      </span>
      <BotaoDeIcone
        rotulo="Limpar busca"
        nome="close"
        data-acao="limpar-busca"
        onClick={() => {
          setBusca("")
          campo.current?.focus()
        }}
      />
    </>
  )
}
