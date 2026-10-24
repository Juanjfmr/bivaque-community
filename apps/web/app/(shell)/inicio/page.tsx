"use client"

import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import { createBrowserClient } from "../../../lib/supabase/client"
import { CreatePostModal } from "../../components/bivaque/feed-post"
import { IntentLauncher } from "../../components/bivaque/intent-launcher"
import { InicioGreeting } from "./greeting"
import { createRequestGuard, loadPrimaryCommunity, type PrimaryCommunity } from "./home-loaders"
import { HubShortcuts } from "./hub-shortcuts"
import { discoverySettled, hubNovelty, hubVisibility, newLabel } from "./hub-view"
import { MarketStrip, PropertyStrip } from "./market-strip"
import { orderByNovelty } from "./novelty"
import { GuideNews, OpenQuestions } from "./questions-guide"
import { ReturnStrip } from "./return-strip"
import { InicioRightRail, MovingCard } from "./right-rail"
import { type SectionLink, SectionNav } from "./section-nav"
import { useHubData } from "./use-hub-data"
import { useNoveltyWindow } from "./use-last-visit"
import { WeekEventsCarousel } from "./week-events"

// O Início como "grande atalho" do Bivaque (25/09/2026). Referências: Grab e
// Careem (atalhos das verticais), Meetup e Fixtured (seções curtas com "Ver
// tudo"), Jobber e Airwallex (botão flutuante de criação), Apple News e Hulu
// (barra de seções fixa ao rolar), HoneyBook (o resumo do dia em números).
//
// Ordem de relevância: o que é seu (retornos) → o que tem data (esta semana) →
// a descoberta (Mercado, perguntas, Guia, Imóveis).
//
// O Início NÃO tem feed (lote 5, tarefa N2 — ADR-20261023-comunidade-do-prototipo):
// na cidade a conversa é de perguntas e respostas, e publicar existe só dentro
// de um grupo, no compositor que o atalho abre. As versões anteriores desta
// página mostraram uma prévia da vila e, depois, um feed da cidade; as duas
// saíram, e a leitura nova `feed_locality` que as serviria nem chegou ao banco.
//
// Três regras de hub (25/09/2026, segunda rodada):
// - Seção pronta e vazia não aparece; quem não tem comunidade recebe no topo o
//   convite a entrar, não uma prévia vazia.
// - A descoberta se ordena pelo que chegou desde a última visita (novelty.ts),
//   só depois que toda ela carregou: nada pula enquanto a página monta. Sem
//   visita anterior, vale a ordem padrão abaixo.
// - Seção com novidade leva o selo "N novos"; o atalho, o ponto.
//
// A comunidade primária — a mais antiga entre as aprovadas, mesma resolução
// da rota /community — é lida uma vez aqui e serve à saudação e ao convite a
// entrar. As verticais são lidas uma vez pelo useHubData e servidas aos
// atalhos (contadores), ao trilho e às seções.

const WEEK: SectionLink = { id: "secao-semana", label: "Esta semana" }
const MARKET: SectionLink = { id: "secao-mercado", label: "Mercado" }
const QUESTIONS: SectionLink = { id: "secao-perguntas", label: "Perguntas" }
const GUIDE: SectionLink = { id: "secao-guia", label: "Guia" }
const PROPERTIES: SectionLink = { id: "secao-imoveis", label: "Imóveis" }

interface DiscoveryBlock {
  key: string
  novelty: number
  links: SectionLink[]
  node: ReactNode
}

function badge(count: number, gender: "m" | "f"): string | null {
  return count > 0 ? newLabel(count, gender) : null
}

export default function InicioPage() {
  const { current } = useLocalityContext()
  const { communities } = useMemberContext()
  const [primary, setPrimary] = useState<PrimaryCommunity>({ status: "loading" })
  const [showCreateModal, setShowCreateModal] = useState(false)
  // Dica da ENTRADA, não formato escolhido: "Fazer uma pergunta" abre sem
  // anexo (o lançador passa "text") e o `post_type` é derivado do anexo real no
  // compositor. Nada aqui decide o formato por conta própria.
  const [entryAttachment, setEntryAttachment] = useState<string | undefined>(undefined)
  const supabase = createBrowserClient()
  const guardRef = useRef(createRequestGuard())
  const shortcutsRef = useRef<HTMLElement>(null)
  const communityIds = useMemo(() => communities.map((community) => community.id), [communities])
  const hub = useHubData(current.id, communityIds)
  const novelty = useNoveltyWindow()
  // O contador da semana só aparece depois que os encontros chegam (no
  // cliente), então este relógio nunca entra no HTML hidratado.
  const [now] = useState(() => new Date())

  const loadPrimary = useCallback(() => {
    const isCurrent = guardRef.current.begin()
    setPrimary({ status: "loading" })
    // O loader nunca rejeita: o then sem catch não solta rejection no console.
    void loadPrimaryCommunity(supabase).then((state) => {
      if (isCurrent()) setPrimary(state)
    })
  }, [supabase])

  useEffect(() => {
    loadPrimary()
  }, [loadPrimary])

  // `handleOpenModal` mantém o nome: tests/unit/ui/intent-launcher.test.ts
  // afirma a chamada `handleOpenModal("text")` do lançador verbatim.
  const handleOpenModal = useCallback((attachment?: string) => {
    setEntryAttachment(attachment)
    setShowCreateModal(true)
  }, [])

  const handleCreated = useCallback(() => {
    // Publicar não muda nada na tela: o Início não tem feed (lote 5, N2) e a
    // publicação vai para um grupo, que tem feed próprio. A saudação e o
    // convite leem a comunidade primária, que não depende da publicação.
  }, [])

  const counts = hubNovelty(hub.data, novelty)
  const visible = hubVisibility(hub.data)

  // Perguntas e Guia andam juntos (lado a lado no desktop largo); Mercado e
  // Imóveis são faixas próprias.
  const lists = orderByNovelty([
    {
      novelty: counts.questions,
      link: QUESTIONS,
      visible: visible.questions,
      node: (
        <OpenQuestions
          key="perguntas"
          state={hub.data.questions}
          onRetry={hub.reload}
          badge={badge(counts.questions, "f")}
        />
      ),
    },
    {
      novelty: counts.guide,
      link: GUIDE,
      visible: visible.guide,
      node: (
        <GuideNews
          key="guia"
          state={hub.data.guide}
          onRetry={hub.reload}
          badge={badge(counts.guide, "m")}
        />
      ),
    },
  ]).filter((item) => item.visible)

  const blocks: DiscoveryBlock[] = [
    {
      key: "mercado",
      novelty: counts.market,
      links: visible.market ? [MARKET] : [],
      node: visible.market ? (
        <MarketStrip
          state={hub.data.market}
          onRetry={hub.reload}
          badge={badge(counts.market, "m")}
        />
      ) : null,
    },
    {
      key: "listas",
      novelty: counts.questions + counts.guide,
      links: lists.map((item) => item.link),
      node:
        lists.length === 0 ? null : (
          <div
            className={`grid items-start gap-5 sm:gap-6 ${lists.length === 2 ? "xl:grid-cols-2" : ""}`}
          >
            {lists.map((item) => item.node)}
          </div>
        ),
    },
    {
      key: "imoveis",
      novelty: counts.properties,
      links: visible.properties ? [PROPERTIES] : [],
      node: visible.properties ? (
        <PropertyStrip
          state={hub.data.properties}
          onRetry={hub.reload}
          badge={badge(counts.properties, "m")}
        />
      ) : null,
    },
  ]
  const discovery = novelty && discoverySettled(hub.data) ? orderByNovelty(blocks) : blocks

  const sections: SectionLink[] = [
    ...(visible.events ? [WEEK] : []),
    ...discovery.flatMap((block) => block.links),
  ]

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[72rem] flex-1 gap-8 px-4 pt-4 pb-8 sm:pt-6 md:pb-10 lg:px-8">
        <div className="min-w-0 flex-1 space-y-5 sm:space-y-6">
          <InicioGreeting communityName={primary.status === "ready" ? primary.name : null} />

          <HubShortcuts
            ref={shortcutsRef}
            data={hub.data}
            now={now}
            novelty={counts}
            hasVisit={Boolean(novelty)}
          />
          <SectionNav sections={sections} triggerRef={shortcutsRef} />

          {/* O retorno relevante vem antes de tudo o que é descoberta. A pilha
              só existe com notificação não-lida real (devolve null sem linha
              legível), então quem não tem retorno não ganha bloco vazio. */}
          <ReturnStrip />

          {/* No telefone quem publica é o botão flutuante do shell; do tablet
              para cima, a linha de publicação continua à mão. Ela abre o
              compositor, que desde o lote 5 N2 publica SÓ dentro de um grupo —
              a pessoa escolhe o grupo ali mesmo. */}
          <div className="hidden md:block">
            <IntentLauncher onAskQuestion={() => handleOpenModal("text")} />
          </div>

          {visible.events ? (
            <div className="lg:hidden">
              <WeekEventsCarousel state={hub.data.events} onRetry={hub.reload} />
            </div>
          ) : null}

          {discovery.map((block) =>
            block.node === null ? null : <div key={block.key}>{block.node}</div>,
          )}

          <div className="lg:hidden">
            <MovingCard />
          </div>
        </div>

        <InicioRightRail events={hub.data.events} onRetry={hub.reload} />
      </div>

      {showCreateModal && (
        <CreatePostModal
          localityId={current.id}
          initialAttachment={entryAttachment}
          onCreated={handleCreated}
          onClose={() => {
            setShowCreateModal(false)
            setEntryAttachment(undefined)
          }}
        />
      )}
    </div>
  )
}
