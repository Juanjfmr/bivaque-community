"use client"

import { Button } from "@heroui/react"
import { useCallback, useEffect, useState } from "react"
import { createBrowserClient } from "../../lib/supabase/client"
import { EmptyState } from "../components/bivaque/empty-state"

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

function formatNotificationLabel(notification: NotificationRow): string {
  const type = notification.type
  switch (type) {
    case "comment":
      return "comentou na sua publicacao"
    case "group_admission":
      return "aprovou sua entrada no grupo"
    case "invitation_accepted":
      return "aceitou seu convite de familia"
    case "event_rsvp":
      return "confirmou presenca no seu evento"
    case "event_change":
      return "atualizou um evento com sua presenca"
    case "direct_message":
      return "enviou uma mensagem direta"
    default:
      return "nova notificacao"
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set())
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

  const unreadCount = notifications.filter((n) => !n.read_at).length

  return (
    <div className="flex flex-1 flex-col">
      <div className="sticky top-12 z-30 border-b border-border bg-[var(--surface)] px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold tracking-tight">Notificacoes</h1>
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
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-4">
        {error && (
          <div className="mb-4 rounded-md border border-[var(--danger-soft)] bg-[var(--danger-soft)] p-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-2 py-4" aria-busy="true">
            <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-sunken)]" />
            <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-sunken)]" />
            <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-sunken)]" />
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <EmptyState title="Nenhuma notificacao ainda" />
        )}

        {!loading && notifications.length > 0 && (
          <div className="space-y-1">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors duration-[var(--duration-instant)] ${
                  notification.read_at ? "" : "bg-[var(--accent-soft)]"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">
                    <span className="text-muted">Alguem </span>
                    {formatNotificationLabel(notification)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">{timeAgo(notification.created_at)}</p>
                </div>
                {!notification.read_at && (
                  <Button
                    size="sm"
                    variant="tertiary"
                    onPress={() => markAsRead(notification.id)}
                    isDisabled={markingRead.has(notification.id)}
                    className="shrink-0"
                  >
                    Lida
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
