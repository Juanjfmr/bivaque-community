"use client"

import { Button, Tabs } from "@heroui/react"
import { Bookmark, Search, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  filterSavedItems,
  loadSavedItems,
  removeSavedItem,
  SAVED_KIND_LABELS,
  type SavedItem,
} from "../../../lib/saves/saved-items"
import { createBrowserClient } from "../../../lib/supabase/client"
import { Card } from "../../components/bivaque/card"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { Skeleton } from "../../components/bivaque/skeleton"
import { showToast } from "../../components/bivaque/toast"

// Prancha 54-web-retorno, painel direito: H1 "Salvos", abas por tipo, campo
// "Buscar nos salvos" e grade de cartões com marcador, chip de tipo e Remover.
// As abas Guia/Mercado/Imóveis da prancha esperam o backend de salvamento de
// cada origem (card RECON-032); uma aba sem produtor seria destino vazio — o
// gate G1 do spec e tests/unit/ui/empty-promises.test.ts vedam isso. A aba
// "Indicações" existe porque `recommendation_saves` existe e o botão Salvar da
// origem grava nela.

const TYPE_TABS = [
  { key: "tudo", label: "Tudo" },
  { key: "indicacao", label: SAVED_KIND_LABELS.indicacao },
] as const

type TabKey = (typeof TYPE_TABS)[number]["key"]

function formatSavedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const CATEGORY_LABELS: Record<string, string> = {
  servicos_locais: "Serviços locais",
  saude_bem_estar: "Saúde & bem-estar",
  educacao: "Educação",
  esporte_lazer: "Esporte & lazer",
  alimentacao: "Alimentação",
  transporte: "Transporte",
  moradia: "Moradia",
  outros: "Outros",
}

export default function SalvosPage() {
  const supabase = useMemo(() => createBrowserClient(), [])
  const router = useRouter()
  const [items, setItems] = useState<SavedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [activeTab, setActiveTab] = useState<TabKey>("tudo")
  const [query, setQuery] = useState("")
  const [removingId, setRemovingId] = useState<string | null>(null)
  const initialLoadDone = useRef(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSessionExpired(true)
      setLoading(false)
      return
    }
    try {
      setItems(await loadSavedItems(supabase))
    } catch {
      // Falha de leitura nao e lista vazia: o erro aparece com retry real.
      setError("Não foi possível carregar seus itens salvos. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true
      void load()
    }
  }, [load])

  const handleRemove = useCallback(
    async (item: SavedItem) => {
      setRemovingId(item.id)
      const removed = await removeSavedItem(supabase, item.id)
      setRemovingId(null)
      if (removed) {
        setItems((prev) => prev.filter((i) => i.id !== item.id))
        showToast({ title: "Removido dos salvos.", variant: "success" })
      } else {
        showToast({
          title: "Não foi possível remover agora. Tente novamente.",
          variant: "danger",
        })
      }
    },
    [supabase],
  )

  const visible = useMemo(() => {
    const byType = activeTab === "tudo" ? items : items.filter((i) => i.kind === activeTab)
    return filterSavedItems(byType, query)
  }, [items, activeTab, query])

  if (sessionExpired) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-10">
        <h1 className="text-lg font-semibold tracking-tight">Salvos</h1>
        <div className="mt-6">
          <ErrorState message="Sessão expirada. Faça login novamente." />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">
        <div className="flex items-center gap-2">
          <Bookmark
            size={20}
            className="text-[var(--semantic-action-primary)]"
            aria-hidden="true"
          />
          <h1 className="text-lg font-semibold tracking-tight">Salvos</h1>
        </div>

        <Tabs
          aria-label="Filtrar salvos por tipo"
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as TabKey)}
          className="mt-4"
        >
          <Tabs.ListContainer>
            <Tabs.List>
              {TYPE_TABS.map((tab) => (
                <Tabs.Tab key={tab.key} id={tab.key}>
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        <search
          className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-[var(--semantic-surface)] px-3"
          onSubmit={(event) => event.preventDefault()}
        >
          <Search size={18} className="shrink-0 text-muted" aria-hidden="true" />
          <label htmlFor="salvos-busca" className="sr-only">
            Buscar nos salvos
          </label>
          <input
            id="salvos-busca"
            type="search"
            name="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar nos salvos"
            className="min-h-11 w-full bg-transparent text-sm transition-colors duration-[var(--semantic-motion-duration-instant)]"
          />
        </search>

        {loading && (
          <div
            className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            aria-busy="true"
          >
            {[1, 2, 3].map((n) => (
              <Card key={n} className="p-0">
                <Skeleton className="h-40 w-full rounded-none" />
                <div className="space-y-2 p-4">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </Card>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="mt-6">
            <ErrorState message={error} onRetry={() => void load()} />
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="mt-6">
            <EmptyState
              title="Nada salvo ainda"
              description="Toque no marcador de um pedido de indicação para encontrá-lo aqui depois."
              action={
                <Button
                  variant="primary"
                  className="min-h-11"
                  onPress={() => {
                    router.push("/recommendations")
                  }}
                >
                  Ver pedidos de indicação
                </Button>
              }
            />
          </div>
        )}

        {!loading && !error && items.length > 0 && visible.length === 0 && (
          <p className="mt-6 text-sm text-muted" role="status">
            Nenhum item salvo corresponde à busca.
          </p>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <SavedCard
                key={item.id}
                item={item}
                removing={removingId === item.id}
                onRemove={() => void handleRemove(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SavedCard({
  item,
  removing,
  onRemove,
}: {
  item: SavedItem
  removing: boolean
  onRemove: () => void
}) {
  return (
    <Card className="flex flex-col p-0">
      <div
        className={`flex h-24 items-center justify-center rounded-t-lg ${
          item.available ? "bg-[var(--semantic-selected)]" : "bg-[var(--semantic-surface-sunken)]"
        }`}
      >
        <Bookmark
          size={28}
          aria-hidden="true"
          className={item.available ? "text-[var(--semantic-action-primary)]" : "text-muted"}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        {item.available ? (
          <>
            <span className="w-fit rounded-full bg-[var(--semantic-selected)] px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-[var(--semantic-action-primary)]">
              {CATEGORY_LABELS[item.category ?? ""] ?? SAVED_KIND_LABELS[item.kind]}
            </span>
            {item.href ? (
              <a
                href={item.href}
                className="flex min-h-11 items-center text-sm font-semibold leading-snug text-foreground transition-colors duration-[var(--semantic-motion-duration-instant)] hover:text-[var(--semantic-action-primary)]"
              >
                {item.title}
              </a>
            ) : (
              <p className="flex min-h-11 items-center text-sm font-semibold leading-snug">
                {item.title}
              </p>
            )}
            <p className="text-xs text-muted">Salvo em {formatSavedDate(item.savedAt)}</p>
          </>
        ) : (
          <>
            <span className="w-fit rounded-full bg-[var(--semantic-surface-sunken)] px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted">
              Indisponível
            </span>
            <p className="text-sm font-medium">Conteúdo indisponível</p>
            <p className="text-xs text-muted">
              Este conteúdo não está mais acessível. O que ele dizia não fica guardado aqui.
            </p>
          </>
        )}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <Button
            size="sm"
            variant="tertiary"
            className="min-h-11"
            isDisabled={removing}
            onPress={onRemove}
            aria-label={`Remover dos salvos${item.title ? `: ${item.title}` : ""}`}
          >
            <Trash2 size={16} aria-hidden="true" />
            {removing ? "Removendo…" : "Remover"}
          </Button>
        </div>
      </div>
    </Card>
  )
}
