"use client"

import { Button, Tabs } from "@heroui/react"
import { CalendarDays, ChevronRight, ShieldCheck, UserX } from "lucide-react"
import type { Route } from "next"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../../components/bivaque/avatar"
import { Card } from "../../components/bivaque/card"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { NotificationsIllustration } from "../../components/bivaque/illustrations"
import { NotificationItemSkeleton } from "../../components/bivaque/skeleton"
import { showToast } from "../../components/bivaque/toast"
import {
  formatNotificationLabel,
  type NotificationRow,
  type ReportTarget,
  rendersWithActor,
  resolveNotificationHref,
} from "./deep-links"

// RECON-006 (prancha 54-web-retorno): central de retorno. A prancha define a
// composição — abas Todas/Não lidas, agrupamento temporal, linha com avatar,
// frase da notificação e hora, trilho de Preferências. A metade "Salvos" da
// prancha NÃO pertence a esta tela (a tela de salvos não existe).
//
// Nada aqui é decorativo quanto a dados: nome do ator vem de `profiles`,
// assunto vem da tabela do alvo real (post, grupo, evento, pedido). Consulta
// que falha ou linha que a RLS não mostra simplesmente não renderiza — nunca
// texto inventado no lugar.

const FILTER_TABS = [
  { key: "todas", label: "Todas" },
  { key: "nao-lidas", label: "Não lidas" },
] as const

type FilterKey = (typeof FILTER_TABS)[number]["key"]

type TimeGroup = "hoje" | "ontem" | "esta-semana" | "anteriores"

const GROUP_LABELS: Record<TimeGroup, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "esta-semana": "Esta semana",
  anteriores: "Anteriores",
}

const GROUP_ORDER: TimeGroup[] = ["hoje", "ontem", "esta-semana", "anteriores"]

// ── temporal helpers ────────────────────────────────────────────────────────

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

// Semana começa na segunda — "Esta semana" só contém dias desta semana
// calendário; o resto é "Anteriores". Rótulo honesto com o bucket.
function startOfWeek(date: Date): Date {
  const copy = startOfDay(date)
  const weekday = copy.getDay() === 0 ? 7 : copy.getDay()
  copy.setDate(copy.getDate() - (weekday - 1))
  return copy
}

function getTimeGroup(dateStr: string): TimeGroup {
  const then = startOfDay(new Date(dateStr))
  const today = startOfDay(new Date())
  const dayMs = 24 * 60 * 60 * 1000
  const daysBack = Math.floor((today.getTime() - then.getTime()) / dayMs)

  if (daysBack <= 0) return "hoje"
  if (daysBack === 1) return "ontem"
  if (then.getTime() >= startOfWeek(new Date()).getTime()) return "esta-semana"
  return "anteriores"
}

function timeOfDay(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

// Prancha 54: "Hoje, 10:24" · "Ontem, 18:47" · "Terça, 14:32".
function formatNotificationTime(dateStr: string): string {
  const date = new Date(dateStr)
  const group = getTimeGroup(dateStr)
  if (group === "hoje") return `Hoje, ${timeOfDay(date)}`
  if (group === "ontem") return `Ontem, ${timeOfDay(date)}`
  if (group === "esta-semana") {
    const weekday = date.toLocaleDateString("pt-BR", { weekday: "long" }).replace("-feira", "")
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${timeOfDay(date)}`
  }
  return date.toLocaleDateString("pt-BR")
}

function firstNameOf(displayName: string | null): string | null {
  if (!displayName) return null
  const trimmed = displayName.trim()
  if (!trimmed) return null
  return trimmed.split(/\s+/)[0] ?? null
}

function excerpt(text: string | null, max = 72): string | null {
  if (!text) return null
  const oneLine = text.replace(/\s+/g, " ").trim()
  if (!oneLine) return null
  return oneLine.length > max ? `${oneLine.slice(0, max - 1).trimEnd()}…` : oneLine
}

// ── enrichment (nomes e assuntos reais) ─────────────────────────────────────

type Enrichment = {
  actorNames: Map<string, string>
  subjects: Map<string, string>
}

// Assunto por tipo: o alvo da notificação existe e é legível pela RLS do
// próprio membro. Tabela sem linha correspondente (conteúdo removido, fora da
// localidade) → linha renderiza sem assunto; nenhum texto entra no lugar.
async function loadEnrichment(
  supabase: ReturnType<typeof createBrowserClient>,
  notifications: NotificationRow[],
): Promise<Enrichment> {
  const enrichment: Enrichment = { actorNames: new Map(), subjects: new Map() }

  const actorIds = [
    ...new Set(
      notifications
        .filter((n) => rendersWithActor(n) && n.actor_user_id)
        .map((n) => n.actor_user_id as string),
    ),
  ]
  const postIds = notifications.filter((n) => n.type === "comment").map((n) => n.target_id)
  const groupIds = notifications.filter((n) => n.type === "group_admission").map((n) => n.target_id)
  const eventIds = notifications
    .filter(
      (n) => n.type === "event_rsvp" || n.type === "event_change" || n.type === "event_reminder",
    )
    .map((n) => n.target_id)
  const requestIds = notifications
    .filter((n) => n.type === "recommendation_reply")
    .map((n) => n.target_id)

  const [actors, posts, groups, events, requests] = await Promise.all([
    actorIds.length > 0
      ? supabase.from("profiles").select("user_id, display_name").in("user_id", actorIds)
      : Promise.resolve({ data: null }),
    postIds.length > 0
      ? supabase.from("posts").select("id, content").in("id", postIds)
      : Promise.resolve({ data: null }),
    groupIds.length > 0
      ? supabase.from("groups").select("id, name").in("id", groupIds)
      : Promise.resolve({ data: null }),
    eventIds.length > 0
      ? supabase.from("events").select("id, title").in("id", eventIds)
      : Promise.resolve({ data: null }),
    requestIds.length > 0
      ? supabase.from("recommendation_requests").select("id, title").in("id", requestIds)
      : Promise.resolve({ data: null }),
  ])

  // Falha de enriquecimento não derruba a caixa: o erro continua sendo LIDO
  // (a lista funciona sem adornos), e o padrão é o da tira de retorno em
  // /inicio — sem linha legível, nada é renderizado no lugar.
  for (const row of (actors.data as { user_id: string; display_name: string }[] | null) ?? []) {
    const name = firstNameOf(row.display_name)
    if (name) enrichment.actorNames.set(row.user_id, name)
  }
  const subjectByTarget = new Map<string, string>()
  for (const row of (posts.data as { id: string; content: string }[] | null) ?? []) {
    const text = excerpt(row.content)
    if (text) subjectByTarget.set(`post:${row.id}`, `Re: ${text}`)
  }
  for (const row of (groups.data as { id: string; name: string }[] | null) ?? []) {
    subjectByTarget.set(`group:${row.id}`, row.name)
  }
  for (const row of (events.data as { id: string; title: string }[] | null) ?? []) {
    subjectByTarget.set(`event:${row.id}`, row.title)
  }
  for (const row of (requests.data as { id: string; title: string }[] | null) ?? []) {
    subjectByTarget.set(`request:${row.id}`, row.title)
  }

  for (const n of notifications) {
    const key =
      n.type === "comment"
        ? `post:${n.target_id}`
        : n.type === "group_admission"
          ? `group:${n.target_id}`
          : n.type === "event_rsvp" || n.type === "event_change" || n.type === "event_reminder"
            ? `event:${n.target_id}`
            : n.type === "recommendation_reply"
              ? `request:${n.target_id}`
              : null
    const subject = key ? subjectByTarget.get(key) : undefined
    if (subject) enrichment.subjects.set(n.id, subject)
  }

  return enrichment
}

// report_resolved aponta para a linha de `reports`, não para o conteúdo
// (20260821000034_resolve_report_rpc.sql:88). A RLS reports_select_reporter_only
// deixa o denunciante ler o PRÓPRIO report; sem linha legível, não há destino.
async function resolveReportTarget(
  supabase: ReturnType<typeof createBrowserClient>,
  reportId: string,
): Promise<ReportTarget | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("target_type, target_id")
    .eq("id", reportId)
    .maybeSingle()
  if (error || !data) return null

  const report = data as { target_type: string; target_id: string }
  if (report.target_type === "comment") {
    const { data: comment } = await supabase
      .from("comments")
      .select("post_id")
      .eq("id", report.target_id)
      .maybeSingle()
    const postId = (comment as { post_id: string } | null)?.post_id
    return postId ? { target_type: "post", target_id: postId } : null
  }
  if (report.target_type === "recommendation_reply") {
    const { data: reply } = await supabase
      .from("recommendation_replies")
      .select("request_id")
      .eq("id", report.target_id)
      .maybeSingle()
    const requestId = (reply as { request_id: string } | null)?.request_id
    return requestId ? { target_type: "recommendation_request", target_id: requestId } : null
  }
  return report
}

// ── page ────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [markingRead, setMarkingRead] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<FilterKey>("todas")
  // O badge vem da MESMA contagem que a sidebar recebe em (shell)/layout.tsx
  // (head count por recipient + read_at null), nunca das ≤50 linhas listadas —
  // de outro modo as duas contagens divergem assim que a caixa passa de 50.
  const [unreadCount, setUnreadCount] = useState(0)
  // Id resolvido no carregamento: a contagem e o "marcar todas" filtram por
  // ele; chamar auth.getUser() de novo em cada mutação só abriu caminho para
  // um filtro vazio se a sessão expirasse entre os cliques.
  const [userId, setUserId] = useState<string | null>(null)
  const [enrichment, setEnrichment] = useState<Enrichment>({
    actorNames: new Map(),
    subjects: new Map(),
  })
  const supabase = createBrowserClient()

  const loadUnreadCount = useCallback(
    async (forUserId: string) => {
      const { count, error: countError } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", forUserId)
        .is("read_at", null)
      if (!countError) setUnreadCount(count ?? 0)
    },
    [supabase],
  )

  const loadNotifications = useCallback(async () => {
    setLoading(true)
    setError("")

    // H-Task 8 pendencia: a query saia antes do cookie hidratar, e a RLS
    // devolvia zero linhas. getUser() bloqueia ate a sessao estar pronta;
    // se user for null, a query NAO e chamada (em vez de sair anonima
    // e mostrar lista vazia) — o usuario ve o erro, nao o silencio.
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("Sessao nao disponivel. Recarregue a pagina.")
      setLoading(false)
      return
    }

    setUserId(user.id)

    const [{ data, error: fetchError }, countResult] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_user_id", user.id)
        .is("read_at", null),
    ])

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    const rows = (data as unknown as NotificationRow[] | null) ?? []
    setNotifications(rows)
    setUnreadCount(countResult.error ? 0 : (countResult.count ?? 0))
    setLoading(false)

    const result = await loadEnrichment(supabase, rows)
    setEnrichment(result)
  }, [supabase])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // Marcar lida persiste no servidor (read_at) e o badge é recalculado pela
  // mesma contagem da sidebar; router.refresh() re-renderiza o layout de
  // servidor para que o número da sidebar bata imediatamente com o da tela.
  const markAsRead = useCallback(
    async (id: string) => {
      setMarkingRead((prev) => new Set(prev).add(id))

      const { error: updateError } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id)
        .is("read_at", null)

      if (updateError) {
        showToast({ title: "Não foi possível marcar como lida.", variant: "danger" })
      } else {
        const now = new Date().toISOString()
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: now } : n)))
        if (userId) await loadUnreadCount(userId)
        router.refresh()
      }

      setMarkingRead((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    },
    [supabase, userId, loadUnreadCount, router],
  )

  const markAllAsRead = useCallback(async () => {
    if (!userId) return
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id)
    if (unreadIds.length === 0) return

    for (const id of unreadIds) {
      setMarkingRead((prev) => new Set(prev).add(id))
    }

    const now = new Date().toISOString()
    // A RLS notifications_update_recipient já restringe a linha à do
    // destinatário autenticado; o filtro por userId é defesa em profundidade.
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_user_id", userId)
      .is("read_at", null)

    if (updateError) {
      showToast({ title: "Não foi possível marcar todas como lidas.", variant: "danger" })
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? now })))
      await loadUnreadCount(userId)
      router.refresh()
    }

    setMarkingRead(new Set())
  }, [supabase, userId, notifications, loadUnreadCount, router])

  const openNotification = useCallback(
    async (notification: NotificationRow) => {
      const reportTarget =
        notification.type === "report_resolved"
          ? await resolveReportTarget(supabase, notification.target_id)
          : null
      const href = resolveNotificationHref(notification, reportTarget)

      if (!notification.read_at) {
        markAsRead(notification.id)
      }
      if (href) {
        // O destino vem de deep-links.ts como string montada a partir de ids
        // reais; typedRoutes exige o cast no uso — o mesmo ponto único onde a
        // prancha 54 decide para onde cada tipo navega.
        router.push(href as Route)
      }
    },
    [supabase, markAsRead, router],
  )

  // ── derived state ──────────────────────────────────────────────────────

  const filtered = useMemo(
    () => (activeTab === "nao-lidas" ? notifications.filter((n) => !n.read_at) : notifications),
    [notifications, activeTab],
  )

  const grouped = useMemo(() => {
    const map = new Map<TimeGroup, NotificationRow[]>()
    for (const item of filtered) {
      const group = getTimeGroup(item.created_at)
      const bucket = map.get(group)
      if (bucket) {
        bucket.push(item)
      } else {
        map.set(group, [item])
      }
    }
    return GROUP_ORDER.filter((group) => map.has(group)).map((group) => ({
      group,
      items: map.get(group) ?? [],
    }))
  }, [filtered])

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-1 flex-col">
      {/* ── sticky header: título + badge (contagem do servidor) + marcar todas ── */}
      <div className="sticky top-12 z-30 border-b border-border bg-[var(--surface)] px-4 pt-3">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
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
              className="min-h-11"
            >
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* ── abas Todas / Não lidas (prancha 54) ── */}
        <Tabs
          aria-label="Filtro de notificações"
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as FilterKey)}
          className="mx-auto mt-2 w-full max-w-4xl"
        >
          <Tabs.ListContainer>
            <Tabs.List>
              {FILTER_TABS.map((tab) => (
                <Tabs.Tab key={tab.key} id={tab.key}>
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      {/* ── content: coluna de leitura + trilho de Preferências ── */}
      <div className="mx-auto flex w-full max-w-4xl gap-6 px-4 py-4">
        <div className="min-w-0 flex-1">
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
              title={activeTab === "nao-lidas" ? "Nada por ler" : "Nenhuma notificação"}
              description={
                activeTab === "nao-lidas"
                  ? "Você está em dia — não há notificações não lidas."
                  : "As novidades da sua comunidade aparecerão aqui."
              }
              illustration={<NotificationsIllustration />}
            />
          )}

          {!loading && !error && filtered.length > 0 && (
            // Plain semantic markup, not HeroUI's ListBox: react-aria-components'
            // static-children Collection (ListBox.Section wrapping a JSX
            // .map() of ListBox.Item) silently rendered an empty <section
            // role="group"> whenever the list transitioned from unmounted/
            // empty to populated — exactly what happens switching tabs or on
            // first load with unread items. Confirmed live closing onda F
            // Task 5; the constraint holds for the Todas/Não lidas filter.
            <div className="space-y-4">
              {grouped.map(({ group, items }) => (
                <section key={group} className="space-y-1">
                  <header className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted">
                    {GROUP_LABELS[group]}
                  </header>
                  <ul className="space-y-1">
                    {items.map((notification) => {
                      const withActor = rendersWithActor(notification)
                      const actorName = notification.actor_user_id
                        ? (enrichment.actorNames.get(notification.actor_user_id) ?? null)
                        : null
                      const subject = enrichment.subjects.get(notification.id) ?? null
                      const label = formatNotificationLabel(notification)
                      return (
                        <li key={notification.id}>
                          {/* A <div role="button">, not a native <button>: the
                              per-row "Lida" action below is itself a real
                              button, and buttons cannot nest inside buttons. */}
                          {/* biome-ignore lint/a11y/useSemanticElements: cannot be a real <button> — it wraps another real <button> ("Lida"), and buttons cannot nest */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              openNotification(notification)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault()
                                openNotification(notification)
                              }
                            }}
                            className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-[var(--duration-instant)] hover:bg-[var(--surface-subtle)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] focus-visible:ring-offset-2 ${
                              notification.read_at ? "" : "bg-[var(--accent-soft)]"
                            }`}
                          >
                            {withActor && notification.actor_user_id ? (
                              <MemberAvatar
                                name={actorName}
                                src={`/api/avatar/${notification.actor_user_id}`}
                                className="h-10 w-10 shrink-0"
                              />
                            ) : (
                              <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sunken)]"
                                aria-hidden="true"
                              >
                                {notification.type === "report_resolved" ? (
                                  <ShieldCheck size={18} />
                                ) : notification.type === "admission_rejected" ? (
                                  <UserX size={18} />
                                ) : (
                                  <CalendarDays size={18} />
                                )}
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold leading-snug">
                                {withActor ? (
                                  <>
                                    <span>{actorName ?? "Alguém"}</span> {label}
                                  </>
                                ) : (
                                  label
                                )}
                              </p>
                              {subject && (
                                <p className="mt-0.5 truncate text-sm text-muted">{subject}</p>
                              )}
                              <p className="mt-0.5 text-xs text-muted">
                                {formatNotificationTime(notification.created_at)}
                              </p>
                            </div>
                            {!notification.read_at && (
                              <Button
                                size="sm"
                                variant="tertiary"
                                onClick={(e) => e.stopPropagation()}
                                onPress={() => markAsRead(notification.id)}
                                isDisabled={markingRead.has(notification.id)}
                                className="min-h-11 shrink-0"
                              >
                                Lida
                              </Button>
                            )}
                            <ChevronRight size={16} className="shrink-0 text-muted" aria-hidden />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        {/* Trilho de atalho da prancha — desktop; em telas estreitas o acesso
            às preferências continua pelo próprio /profile, sem duplicar UI. */}
        <aside className="hidden w-64 shrink-0 xl:block" aria-label="Atalhos">
          <Card className="p-4">
            <h2 className="text-sm font-semibold">Preferências</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Gerencie como e quando você recebe notificações.
            </p>
            <Button
              className="mt-3 min-h-11 w-full"
              onPress={() => {
                router.push("/profile")
              }}
            >
              Abrir preferências
            </Button>
          </Card>
        </aside>
      </div>
    </div>
  )
}
