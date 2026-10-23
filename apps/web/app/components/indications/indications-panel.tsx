"use client"

import { Button, Tabs } from "@heroui/react"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  INDICATION_CATEGORIES,
  INDICATION_PAGE_SIZE,
  type IndicationCategory,
  type IndicationRow,
} from "../../../lib/indications/indications"
import { log } from "../../../lib/logger"
import { readFailure } from "../../../lib/recommendations/write-failure-copy"
import { createBrowserClient } from "../../../lib/supabase/client"
import { EmptyState } from "../bivaque/empty-state"
import { ErrorState } from "../bivaque/error-state"
import { Skeleton } from "../bivaque/skeleton"
import { AskIndication } from "./ask-indication"
import { IndicationItem } from "./indication-item"

// A memória da cidade (ADR-20260925-memoria-de-indicacoes; lote 5, ADR-20261023
// seção 2): pedir no topo, depois o que já foi pedido. Os filtros são os do
// protótipo — Para ajudar (padrão, pergunta aberta de outra pessoa), Resolvidas e
// Minhas — e a autoria é filtrada no servidor (`p_mine`). Mesma peça na rota
// /indicacoes e na vista Indicações da Comunidade.

const FILTERS = [
  { key: "ajudar", label: "Para ajudar", resolved: false, mine: false },
  { key: "resolvidas", label: "Resolvidas", resolved: true, mine: null },
  { key: "minhas", label: "Minhas", resolved: null, mine: true },
] as const

type FilterKey = (typeof FILTERS)[number]["key"]

type ListState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; rows: IndicationRow[]; hasMore: boolean }

export function IndicationsPanel({
  localityId,
  cityName,
  autoFocusAsk = false,
  initialQuery = "",
}: {
  localityId: string
  cityName: string
  autoFocusAsk?: boolean
  initialQuery?: string
}) {
  const [filter, setFilter] = useState<FilterKey>("ajudar")
  const [category, setCategory] = useState<IndicationCategory | null>(null)
  const [list, setList] = useState<ListState>({ kind: "loading" })
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreFailed, setLoadMoreFailed] = useState(false)
  const [now] = useState(() => new Date())
  // Troca de filtro no meio de uma carga: a resposta antiga não pode pintar a
  // lista nova.
  const generation = useRef(0)

  const fetchPage = useCallback(
    async (offset: number) => {
      const active = FILTERS.find((item) => item.key === filter) ?? FILTERS[0]
      const supabase = createBrowserClient()
      return supabase.rpc("list_indications", {
        p_locality_id: localityId,
        ...(category ? { p_category: category } : {}),
        ...(active.resolved === null ? {} : { p_resolved: active.resolved }),
        ...(active.mine === null ? {} : { p_mine: active.mine }),
        p_limit: INDICATION_PAGE_SIZE,
        p_offset: offset,
      })
    },
    [localityId, filter, category],
  )

  const loadFirst = useCallback(async () => {
    const mine = ++generation.current
    setList({ kind: "loading" })
    setLoadMoreFailed(false)
    const { data, error } = await fetchPage(0)
    if (mine !== generation.current) return
    if (error) {
      setList({ kind: "error", message: readFailure("carregar_pedidos", error.message) })
      return
    }
    const rows = data ?? []
    setList({ kind: "done", rows, hasMore: rows.length === INDICATION_PAGE_SIZE })
  }, [fetchPage])

  useEffect(() => {
    void loadFirst()
  }, [loadFirst])

  async function loadMore() {
    if (list.kind !== "done") return
    const mine = generation.current
    setLoadingMore(true)
    setLoadMoreFailed(false)
    const { data, error } = await fetchPage(list.rows.length)
    setLoadingMore(false)
    if (mine !== generation.current) return
    if (error) {
      log.error("indication_list_failed", { serverMessage: error.message })
      setLoadMoreFailed(true)
      return
    }
    const next = data ?? []
    const known = new Set(list.rows.map((row) => row.id))
    setList({
      kind: "done",
      rows: [...list.rows, ...next.filter((row) => !known.has(row.id))],
      hasMore: next.length === INDICATION_PAGE_SIZE,
    })
  }

  const emptyCopy =
    filter === "ajudar"
      ? {
          title: "Ninguém esperando resposta",
          description: "Você pode buscar uma indicação ou iniciar uma nova pergunta.",
        }
      : filter === "resolvidas"
        ? {
            title: "Nenhuma pergunta resolvida ainda",
            description: "Quando alguém marcar a resposta que resolveu, ela fica guardada aqui.",
          }
        : {
            title: "Você ainda não perguntou nada",
            description: `Pergunte em uma frase para a comunidade de ${cityName}.`,
          }

  return (
    <div className="space-y-4">
      <AskIndication
        localityId={localityId}
        cityName={cityName}
        autoFocus={autoFocusAsk}
        initialQuery={initialQuery}
      />

      <div className="space-y-3">
        <Tabs
          aria-label="Filtrar pedidos"
          selectedKey={filter}
          onSelectionChange={(key) => setFilter(key as FilterKey)}
          className="tabs--secondary"
        >
          <Tabs.ListContainer>
            <Tabs.List>
              {FILTERS.map((item) => (
                <Tabs.Tab key={item.key} id={item.key}>
                  {item.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        <fieldset className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0">
          <legend className="sr-only">Assunto</legend>
          <CategoryChip active={category === null} onPress={() => setCategory(null)}>
            Todos
          </CategoryChip>
          {INDICATION_CATEGORIES.map((item) => (
            <CategoryChip
              key={item.id}
              active={category === item.id}
              onPress={() => setCategory(category === item.id ? null : item.id)}
            >
              {item.label}
            </CategoryChip>
          ))}
        </fieldset>
      </div>

      {list.kind === "loading" ? (
        <div className="space-y-3" aria-busy="true">
          <Skeleton className="h-28 w-full rounded-ui-lg" />
          <Skeleton className="h-28 w-full rounded-ui-lg" />
          <Skeleton className="h-28 w-full rounded-ui-lg" />
        </div>
      ) : null}

      {list.kind === "error" ? (
        <ErrorState message={list.message} onRetry={() => void loadFirst()} />
      ) : null}

      {list.kind === "done" && list.rows.length === 0 ? (
        <EmptyState title={emptyCopy.title} description={emptyCopy.description} />
      ) : null}

      {list.kind === "done" && filter === "ajudar" && list.rows.length > 0 ? (
        <p className="text-sm text-ui-ink-2">
          Perguntas sem resposta aparecem primeiro. Responder leva um minuto.
        </p>
      ) : null}

      {list.kind === "done" && list.rows.length > 0 ? (
        <ul className="space-y-3">
          {list.rows.map((row) => (
            <li key={row.id}>
              <IndicationItem row={row} now={now} />
            </li>
          ))}
        </ul>
      ) : null}

      {list.kind === "done" && (list.hasMore || loadMoreFailed) ? (
        <div className="flex flex-col items-center gap-2 py-2">
          {loadMoreFailed ? (
            <p role="alert" className="text-sm text-ui-danger">
              Não foi possível carregar mais pedidos.
            </p>
          ) : null}
          <Button variant="secondary" onPress={() => void loadMore()} isPending={loadingMore}>
            {loadMoreFailed ? "Tentar de novo" : "Carregar mais"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function CategoryChip({
  active,
  onPress,
  children,
}: {
  active: boolean
  onPress: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onPress}
      className={`min-h-9 shrink-0 rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-brand ${
        active
          ? "bg-ui-ink text-ui-surface"
          : "bg-ui-surface text-ui-ink ring-1 ring-ui-line hover:bg-ui-subtle"
      }`}
    >
      {children}
    </button>
  )
}
