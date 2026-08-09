"use client"

import { Button, ListBox, Tabs } from "@heroui/react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { NotificationsIllustration } from "../../components/bivaque/illustrations"
import { NotificationItemSkeleton } from "../../components/bivaque/skeleton"

type NotificationRow = {
  id: string
  recipient_user_id: string
  actor_user_id: string | null
  type: string
  action: string
  target_type: string
  target_id: string
  read_at: string | null
  created_at: string
}

const TABS = [
  { key: "vizinhança", label: "Vizinhança" },
  { key: "minha-atividade", label: "Minha atividade" },
  { key: "alertas", label: "Alertas" },
] as const

type TabKey = (typeof TABS)[number]["key"]

const GROUP_LABELS: Record<string, string> = {
  hoje: "Hoje",
  "ultimos-7-dias": "Últimos 7 dias",
  "mais-antigos": "Mais antigos",
} as const

type TimeGroup = keyof typeof GROUP_LABELS

// ── classification heuristic ──────────────────────────────────────────────
//
// Inferred from notification.type — the field already encodes the kind:
//   community-level (group, event)      → Vizinhança
//   personally-directed interactions    → Minha atividade
//   everything else (system, unknown)   → Alertas
//
// No category column exists on the table, so this heuristic is the source of
// truth for tab routing.

function classifyNotification(notification: NotificationRow): TabKey {
  switch (notification.type) {
    case "group_admission":
    case "event_rsvp":
    case "event_change":
      return "vizinhança"
    case "comment":
    case "invitation_accepted":
    case "direct_message":
      return "minha-atividade"
    case "report_resolved":
      return "alertas"
    default:
      return "alertas"
  }
}

// ── temporal grouping ──────────────────────────────────────────────────────

function getTimeGroup(dateStr: string): TimeGroup {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffHours = (now - then) / (1000 * 60 * 60)

  if (diffHours < 24) return "hoje"
  if (diffHours < 24 * 7) return "ultimos-7-dias"
  return "mais-antigos"
}

// ── label formatting ───────────────────────────────────────────────────────

function formatNotificationLabel(notification: NotificationRow): string {
  switch (notification.type) {
    case "comment":
      return "comentou na sua publicação"
    case "group_admission":
      return "aprovou sua entrada no grupo"
    case "invitation_accepted":
      return "aceitou seu convite de família"
    case "event_rsvp":
      return "confirmou presença no seu evento"
    case "event_change":
      return "atualizou um evento com sua presença"
    case "direct_message":
      return "enviou uma mensagem direta"
    case "report_resolved":
      // Confirma a análise, nunca o desfecho aplicado ao conteúdo (runbook §6:
      // "sem revelar a ação tomada").
      return "analisou sua denúncia"
    default:
      return "nova notificação"
  }
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const seconds = Math.floor((now - then) / 1000)

  if (seconds < 60) return "agora"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString("pt-BR")
}

// ── page ───────────────────────────────────────────────────────────────────

function navigateToNotification(
  router: ReturnType<typeof useRouter>,
  notification: NotificationRow,
): void {
  switch (notification.type) {
    case "comment":
      router.push(`/community?post=${notification.target_id}`)
      return
    case "group_admission":
      router.push(`/groups/${notification.target_id}`)
      return
    case "invitation_accepted":
      router.push(`/profile?user=${notification.actor_user_id ?? ""}`)
      return
    case "event_rsvp":
    case "event_change":
      router.push(`/events/${notification.target_id}`)
      return
    case "direct_message":
      router.push(`/messages?conversation=${notification.target_id}`)
      return
    default:
      return
  }
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<TabKey>("vizinhança")
  const supabase = createBrowserClient()

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError("")

    const { data, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)

    if (fetchError) {
      setError(fetchError.message)
    } else if (data) {
      setNotifications(data as unknown as NotificationRow[])
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const markAsRead = useCallback(
    async (id: string) => {
      setMarkingRead((prev) => new Set(prev).add(id))

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)

      if (!updateError) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
        )
      }

      setMarkingRead((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    },
    [supabase],
  )

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id)
    if (unreadIds.length === 0) return

    for (const id of unreadIds) {
      setMarkingRead((prev) => new Set(prev).add(id))
    }

    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .is("read_at", null)

    if (!updateError) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })))
    }

    setMarkingRead(new Set())
  }, [supabase, notifications])

  // ── derived state ──────────────────────────────────────────────────────

  const filtered = useMemo(
    () => notifications.filter((n) => classifyNotification(n) === activeTab),
    [notifications, activeTab],
  )

  const grouped = useMemo(() => {
    const map = new Map<TimeGroup, NotificationRow[]>()
    const order: TimeGroup[] = []

    for (const item of filtered) {
      const group = getTimeGroup(item.created_at)
      let bucket = map.get(group)
      if (!bucket) {
        bucket = []
        map.set(group, bucket)
        order.push(group)
      }
      bucket.push(item)
    }

    return order.map((group) => {
      const items = map.get(group)
      return { group, items: items ?? [] }
    })
  }, [filtered])

  const unreadCount = notifications.filter((n) => !n.read_at).length

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = { vizinhança: 0, "minha-atividade": 0, alertas: 0 }
    for (const n of notifications) {
      counts[classifyNotification(n)]++
    }
    return counts
  }, [notifications])

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col">
      {/* ── sticky header: title + badge + mark-all-read ── */}
      <div className="sticky top-12 z-30 border-b border-border bg-[var(--surface)] px-4 pt-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight">Notificações</h1>
            {unreadCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-xs font-medium text-[var(--accent-foreground)]">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="tertiary"
              onPress={markAllAsRead}
              isDisabled={markingRead.size > 0}
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* ── tab bar ── */}
        <Tabs
          aria-label="Categorias de notificações"
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as TabKey)}
          className="mx-auto mt-2 max-w-2xl"
        >
          <Tabs.ListContainer>
            <Tabs.List>
              {TABS.map((tab) => {
                const count = tabCounts[tab.key]
                return (
                  <Tabs.Tab key={tab.key} id={tab.key}>
                    <span className="flex items-center gap-1.5">
                      {tab.label}
                      {count > 0 && (
                        <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--border)] px-1 text-xs font-semibold leading-none text-muted">
                          {count}
                        </span>
                      )}
                    </span>
                  </Tabs.Tab>
                )
              })}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      {/* ── content ── */}
      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        {error && <ErrorState message={error} onRetry={() => loadNotifications()} />}

        {loading && (
          <div className="space-y-1 py-4" aria-busy="true">
            <NotificationItemSkeleton />
            <NotificationItemSkeleton />
            <NotificationItemSkeleton />
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            title={
              activeTab === "alertas"
                ? "Nenhum alerta"
                : activeTab === "minha-atividade"
                  ? "Nenhuma atividade"
                  : "Nada na vizinhança"
            }
            description={
              activeTab === "alertas"
                ? "Você não tem alertas no momento."
                : activeTab === "minha-atividade"
                  ? "Suas interações aparecerão aqui."
                  : "As novidades da sua comunidade aparecerão aqui."
            }
            illustration={<NotificationsIllustration />}
          />
        )}

        {!loading && !error && filtered.length > 0 && (
          <ListBox aria-label="Notificações" selectionMode="none" className="space-y-2">
            {grouped.map(({ group, items }) => (
              <ListBox.Section key={group} className="space-y-1">
                <header className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                  {GROUP_LABELS[group]}
                </header>
                {items.map((notification) => (
                  <ListBox.Item
                    key={notification.id}
                    id={notification.id}
                    textValue={notification.id}
                    onAction={() => {
                      if (!notification.read_at) {
                        markAsRead(notification.id)
                      }
                      navigateToNotification(router, notification)
                    }}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-[var(--duration-instant)] ${
                      notification.read_at ? "" : "bg-[var(--accent-soft)]"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm leading-snug">
                        <span className="text-muted">Alguém </span>
                        {formatNotificationLabel(notification)}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {timeAgo(notification.created_at)}
                      </p>
                    </div>
                    {!notification.read_at && (
                      <Button
                        size="sm"
                        variant="tertiary"
                        onClick={(e) => e.stopPropagation()}
                        onPress={() => markAsRead(notification.id)}
                        isDisabled={markingRead.has(notification.id)}
                        className="shrink-0"
                      >
                        Lida
                      </Button>
                    )}
                  </ListBox.Item>
                ))}
              </ListBox.Section>
            ))}
          </ListBox>
        )}
      </div>
    </div>
  )
}
