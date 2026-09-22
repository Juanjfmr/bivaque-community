"use client"

import { detectCep, detectCpf } from "@bivaque/domain"
import { Button, Chip, Input, ListBox, Select, Tabs, TextArea } from "@heroui/react"
import { Info, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { useLocalityContext } from "../../../lib/locality-context"
import { useMemberContext } from "../../../lib/member-context"
import { resolveRecommendationTab } from "../../../lib/recommendations/request-tab"
import { readFailure, writeFailure } from "../../../lib/recommendations/write-failure-copy"
import { createBrowserClient } from "../../../lib/supabase/client"
import { MemberAvatar } from "../../components/bivaque/avatar"
import { Card } from "../../components/bivaque/card"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"
import { FeedbackAlert } from "../../components/bivaque/feedback-alert"
import { GuideFirstRequest } from "../../components/bivaque/guide-first-request"
import RecommendationRequests from "../../components/bivaque/recommendation-requests"
import { Skeleton } from "../../components/bivaque/skeleton"

// ── local types (matching migration shapes, no generated-types import needed) ──

type GroupRow = {
  id: string
  name: string
  description: string | null
  visibility: "public" | "private"
  locality_id: string
  created_at: string
}

type EventRow = {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  venue: string | null
  status: "upcoming" | "cancelled"
  locality_id: string
  group_id: string | null
  created_at: string
}

type SavedRequestRow = {
  id: string
  title: string
  body: string
  category: string
  created_at: string
  author_id: string
}

// ── form fields kept for "Pedir indicação" tab ──────────────────────────────

const CATEGORIES = [
  { id: "servicos_locais", label: "Serviços Locais" },
  { id: "saude_bem_estar", label: "Saúde & Bem-estar" },
  { id: "educacao", label: "Educação" },
  { id: "esporte_lazer", label: "Esporte & Lazer" },
  { id: "alimentacao", label: "Alimentação" },
  { id: "transporte", label: "Transporte" },
  { id: "moradia", label: "Moradia" },
  { id: "outros", label: "Outros" },
] as const

type RecommendationCategory = (typeof CATEGORIES)[number]["id"]

// ── helpers ─────────────────────────────────────────────────────────────────

function formatEventDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  })
}

function formatEventTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

// ── skeletons ───────────────────────────────────────────────────────────────

function GroupCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando grupos"
      className="flex flex-col gap-3 rounded-[var(--semantic-radius-card)] border border-border bg-[var(--surface-raised)] p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-8 w-20 rounded-[var(--semantic-radius-control)]" />
      </div>
      <Skeleton className="h-3 w-1/3" />
    </div>
  )
}

function EventCardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Carregando eventos"
      className="flex flex-col gap-2 rounded-[var(--semantic-radius-card)] border border-border bg-[var(--surface-raised)] p-4"
    >
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  )
}

// ── page ────────────────────────────────────────────────────────────────────

export default function RecommendationsPage() {
  const supabase = createBrowserClient()
  // DS-006: o alcance "cidade" do pedido mostra o nome real da localidade do
  // membro. "Manaus" chumbado mentia para quem está em outra cidade.
  const { current } = useLocalityContext()

  // data
  const [discoverGroups, setDiscoverGroups] = useState<GroupRow[]>([])
  const [groupMemberCounts, setGroupMemberCounts] = useState<Record<string, number>>({})
  const [upcomingEvents, setUpcomingEvents] = useState<EventRow[]>([])

  // ui
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null)
  const [joinFeedback, setJoinFeedback] = useState("")
  // F1: entrar no grupo falhava mostrando a mensagem crua do servidor dentro do
  // alerta VERDE de sucesso — dois defeitos no mesmo estado. Sucesso e falha
  // ficam em estados separados porque o FeedbackAlert muda de papel com o
  // variant (`status` polido × `alert` assertivo), não só de cor.
  const [joinError, setJoinError] = useState("")

  // request form
  const [requestCategory, setRequestCategory] = useState<RecommendationCategory | "">("")
  const [requestScope, setRequestScope] = useState<"locality" | string>("locality")
  const [requestTitle, setRequestTitle] = useState("")
  const [requestDescription, setRequestDescription] = useState("")
  const [requestFeedback, setRequestFeedback] = useState("")
  const [requestError, setRequestError] = useState("")
  // Prancha 45 painel 3: além do alerta, o campo em destaque tem mensagem
  // inline própria. Guarda o PRIMEIRO campo inválido — destacar todos ao mesmo
  // tempo transforma o formulário num muro de vermelho.
  const [requestFieldError, setRequestFieldError] = useState<{
    field: "category" | "title" | "description"
    message: string
  } | null>(null)
  const [requestSubmitting, setRequestSubmitting] = useState(false)
  const [piiWarning, setPiiWarning] = useState(false)
  const [myGroups, setMyGroups] = useState<GroupRow[]>([])

  // saved tab
  const [savedRequests, setSavedRequests] = useState<SavedRequestRow[]>([])
  // Prancha 80: a aba "Pedidos (2)" conta os pedidos visíveis para quem lê —
  // a mesma RLS que o painel usa. null enquanto não se sabe: "(0)" seria mentira
  // durante o carregamento.
  const [requestsCount, setRequestsCount] = useState<number | null>(null)
  const [savesLoading, setSavesLoading] = useState(false)
  const [savesError, setSavesError] = useState("")
  const [unsavingId, setUnsavingId] = useState<string | null>(null)

  // F6 Step 2: a saved request link focuses it on the Pedidos tab. The
  // request card carries id="req-<id>" so the browser scrolls to the hash.
  const searchParams = useSearchParams()

  // tabs
  // DS-006: a aba também chega pela URL (`?aba=request`), como em /salvos
  // (`?aba=guia`). É o destino real da intenção `Pedir uma indicação` da Home:
  // sem isso o link prometeria o painel do Guia e aterrissaria em "Explorar".
  const [selectedTab, setSelectedTab] = useState(() =>
    resolveRecommendationTab(searchParams.get("aba")),
  )

  // DS-006 (prancha 45): o pedido de indicação começa no Guia. O formulário
  // comunitário é a saída declarada do fallback, não a primeira coisa da tela.
  const [requestStage, setRequestStage] = useState<"guide" | "community">("guide")
  const [guideTerm, setGuideTerm] = useState("")

  // ── data loading ──────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    setJoinFeedback("")
    setJoinError("")

    try {
      // 1. auth
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("Você precisa entrar para ver recomendações.")
        setLoading(false)
        return
      }

      // 2. membership → locality (P0 Task 3: locality lives in the membership)
      const { data: membershipData } = await supabase
        .from("locality_memberships")
        .select("locality_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle()

      if (!membershipData) {
        setError("Você ainda não pertence a uma localidade.")
        setLoading(false)
        return
      }
      const locId = membershipData.locality_id

      // 3. all groups in locality
      const { data: groupsData, error: groupsError } = await supabase
        .from("groups")
        .select("*")
        .eq("locality_id", locId)
        .order("created_at", { ascending: false })

      if (groupsError) throw new Error(groupsError.message)

      const allGroups = (groupsData as GroupRow[] | null) ?? []

      // 4. my memberships (group IDs only)
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("group_memberships")
        .select("group_id, status")
        .eq("user_id", user.id)

      if (membershipsError) throw new Error(membershipsError.message)

      const myGroupIds = new Set(
        (membershipsData as { group_id: string; status: string }[] | null)
          ?.filter((membership) => membership.status === "approved")
          .map((membership) => membership.group_id) ?? [],
      )
      setMyGroups(allGroups.filter((group) => myGroupIds.has(group.id)))

      // 5. upcoming events in locality
      const { data: eventsData, error: eventsError } = await supabase
        .from("events")
        .select("*")
        .eq("locality_id", locId)
        .eq("status", "upcoming")
        .order("starts_at", { ascending: true })
        .limit(4)

      if (eventsError) throw new Error(eventsError.message)

      const events = (eventsData as EventRow[] | null) ?? []
      setUpcomingEvents(events)

      // 6. groups I haven't joined — limit 6
      const unjoined = allGroups.filter((g) => !myGroupIds.has(g.id)).slice(0, 6)
      setDiscoverGroups(unjoined)

      // 6b. quantos pedidos de indicação esta pessoa vê (prancha 80)
      const { count: requestsTotal } = await supabase
        .from("recommendation_requests")
        .select("*", { count: "exact", head: true })
      setRequestsCount(requestsTotal ?? 0)

      // 7. member counts for public unjoined groups
      const counts: Record<string, number> = {}
      for (const g of unjoined) {
        if (g.visibility === "public") {
          const { count } = await supabase
            .from("group_memberships")
            .select("*", { count: "exact", head: true })
            .eq("group_id", g.id)
          counts[g.id] = count ?? 0
        }
      }
      setGroupMemberCounts(counts)
    } catch (err) {
      // ErrorState proíbe explicitamente texto cru do servidor: a causa vai para
      // o log do projeto, a tela recebe a frase de produto.
      setError(
        readFailure("carregar_recomendacoes", err instanceof Error ? err.message : String(err)),
      )
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadData()
  }, [loadData])

  // F6 Step 2: when the saved tab links to ?focus=<id>, switch to the Pedidos
  // tab. The browser scrolls to #req-<id> on the hash; no client-side
  // scrollIntoView needed.
  useEffect(() => {
    const focus = searchParams.get("focus")
    if (focus) {
      setSelectedTab("requests")
    }
  }, [searchParams])

  // DS-006: o parâmetro `aba` também vale quando a navegação acontece com a
  // página já montada — clicar em "Pedir uma indicação" na Home não pode
  // aterrissar em "Explorar".
  useEffect(() => {
    const aba = searchParams.get("aba")
    if (aba) setSelectedTab(resolveRecommendationTab(aba))
  }, [searchParams])

  // O fallback da prancha 45 leva ao formulário comunitário levando o texto
  // digitado junto: o título nasce com o que a pessoa procurou (a menos que ela
  // já tenha escrito um título próprio).
  const handleAskCommunity = useCallback((term: string) => {
    setGuideTerm(term)
    if (term) {
      setRequestTitle((previous) => (previous.trim().length > 0 ? previous : term))
    }
    setRequestError("")
    setRequestStage("community")
  }, [])

  // ── join group ────────────────────────────────────────────────────────────

  const handleJoin = useCallback(
    async (groupId: string) => {
      setJoiningGroupId(groupId)
      setJoinFeedback("")
      setJoinError("")
      setError("")

      const { error: rpcError } = await supabase.rpc("join_group", {
        p_group_id: groupId,
      })

      if (rpcError) {
        setJoinError(writeFailure("entrar_no_grupo", rpcError.message))
        setJoiningGroupId(null)
        return
      }

      // Optimistic removal from discover list + reload in background
      setDiscoverGroups((prev) => prev.filter((g) => g.id !== groupId))
      setJoiningGroupId(null)
      setJoinFeedback("Você entrou no grupo!")

      // silence setTimeout with a stable pattern
      const timer = setTimeout(() => setJoinFeedback(""), 3000)
      // Reload data to keep counts and events fresh
      loadData()
      return () => clearTimeout(timer)
    },
    [supabase, loadData],
  )

  // ── request form ──────────────────────────────────────────────────────────

  const handleSubmitRequest = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setRequestFeedback("")
      setRequestError("")

      // Validação do produto, em português e campo a campo. O `<form>` tem
      // `noValidate` justamente para esta mensagem existir: sem ela o navegador
      // barrava o envio com a bolha nativa e nada do produto aparecia.
      if (!requestCategory) {
        setRequestFieldError({ field: "category", message: "Escolha uma categoria." })
        setRequestError(
          "Revise os campos em destaque para publicar seu pedido. Seus dados foram mantidos.",
        )
        return
      }
      if (!requestTitle.trim()) {
        setRequestFieldError({ field: "title", message: "Informe o que você procura." })
        setRequestError(
          "Revise os campos em destaque para publicar seu pedido. Seus dados foram mantidos.",
        )
        return
      }
      if (!requestDescription.trim()) {
        setRequestFieldError({ field: "description", message: "Conte o que você precisa." })
        setRequestError(
          "Revise os campos em destaque para publicar seu pedido. Seus dados foram mantidos.",
        )
        return
      }
      setRequestFieldError(null)

      const piiText = `${requestTitle.trim()} ${requestDescription.trim()}`
      if (!piiWarning && (detectCpf(piiText) || detectCep(piiText))) {
        setPiiWarning(true)
        return
      }

      setRequestSubmitting(true)

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          setRequestError("Você precisa estar logado.")
          setRequestSubmitting(false)
          return
        }

        // P0 Task 3: locality lives in the membership, not the profile
        const { data: membershipData } = await supabase
          .from("locality_memberships")
          .select("locality_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle()

        const locId = (membershipData as { locality_id: string } | null)?.locality_id
        if (!locId) {
          setRequestError("Perfil sem localidade associada.")
          setRequestSubmitting(false)
          return
        }

        const scopeIsGroup = requestScope !== "locality"
        const { error: insertError } = await supabase.from("recommendation_requests").insert({
          author_id: user.id,
          locality_id: scopeIsGroup ? null : locId,
          group_id: scopeIsGroup ? requestScope : null,
          title: requestTitle.trim(),
          body: requestDescription.trim(),
          category: requestCategory,
        })

        if (insertError) throw new Error(insertError.message)

        // Success
        setRequestCategory("")
        setRequestScope("locality")
        setRequestTitle("")
        setRequestDescription("")
        setPiiWarning(false)
        setRequestFieldError(null)
        setRequestFeedback("Pedido publicado!")
        setRequestSubmitting(false)

        setTimeout(() => setRequestFeedback(""), 4000)
      } catch (err) {
        // F1 (auditoria de produção): o alerta de perigo mostrava o texto cru do
        // PostgREST — `column "x_interno_auditoria" does not exist` — e nada era
        // registrado. Aqui a tela recebe a frase de produto e o log do projeto
        // recebe a operação e a mensagem do servidor.
        setRequestError(
          writeFailure("publicar_pedido", err instanceof Error ? err.message : String(err)),
        )
        setRequestSubmitting(false)
      }
    },
    [supabase, requestCategory, requestScope, requestTitle, requestDescription, piiWarning],
  )

  // ── saved tab ──────────────────────────────────────────────────────────────

  const loadSavedRequests = useCallback(async () => {
    setSavesLoading(true)
    setSavesError("")

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setSavesError("Você precisa estar logado.")
        setSavesLoading(false)
        return
      }

      // First get saved request IDs
      const { data: savesData, error: savesError } = await supabase
        .from("recommendation_saves")
        .select("request_id")
        .eq("user_id", user.id)

      if (savesError) throw new Error(savesError.message)

      const requestIds =
        (savesData as { request_id: string }[] | null)?.map((s) => s.request_id) ?? []

      if (requestIds.length === 0) {
        setSavedRequests([])
        setSavesLoading(false)
        return
      }

      // Then fetch the full requests
      const { data: requestsData, error: requestsError } = await supabase
        .from("recommendation_requests")
        .select("id, title, body, category, created_at, author_id")
        .in("id", requestIds)
        .order("created_at", { ascending: false })

      if (requestsError) throw new Error(requestsError.message)

      setSavedRequests((requestsData as SavedRequestRow[] | null) ?? [])
    } catch (err) {
      setSavesError(
        readFailure("carregar_salvos", err instanceof Error ? err.message : String(err)),
      )
    } finally {
      setSavesLoading(false)
    }
  }, [supabase])

  const handleUnsave = useCallback(
    async (requestId: string) => {
      setUnsavingId(requestId)
      setSavesError("")

      const { error } = await supabase
        .from("recommendation_saves")
        .delete()
        .eq("request_id", requestId)

      if (error) {
        setSavesError(writeFailure("remover_pedido_salvo", error.message))
        setUnsavingId(null)
        return
      }

      setSavedRequests((prev) => prev.filter((r) => r.id !== requestId))
      setUnsavingId(null)
    },
    [supabase],
  )

  useEffect(() => {
    if (selectedTab === "saved") {
      loadSavedRequests()
    }
  }, [selectedTab, loadSavedRequests])

  const hasGroups = discoverGroups.length > 0
  const hasEvents = upcomingEvents.length > 0
  const hasContent = hasGroups || hasEvents

  return (
    // A1 (parecer R2): a rota era uma coluna única de 1152 px a 1440 — busca de
    // 1100, textarea de 1120 e parágrafos de 1152 a 14 px (~130 caracteres por
    // linha). Aqui a tela passa a ter UMA medida, a mesma que a Home já usa
    // (`max-w-[56rem]` = 896 px): é ela que dá 552 px de coluna de leitura ao
    // lado do trilho de 288 px quando o formulário comunitário compõe duas
    // colunas. DESIGN_SYSTEM §8.2: leitura longa entre 45 e 72 caracteres por
    // linha e formulário com largura limitada, nunca esticado para preencher.
    <div className="mx-auto flex w-full max-w-[56rem] flex-1 flex-col gap-6 px-4 py-6 [--field-radius:var(--semantic-radius-control)]">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Indicações</h1>
        <p className="measure-reading text-sm text-muted">
          Descubra grupos e eventos da sua comunidade. Este é um espaço de utilidade comunitária,
          não um marketplace.
        </p>
      </div>

      {/* RECON-043: mesma marcacao de aba que /salvos (variant secondary +
          a classe que o build fixado aplica) e /mercado. O ListContainer e o
          ScrollShadow interno que impede a fileira de virar rolagem horizontal
          da pagina inteira em 375. */}
      <Tabs
        aria-label="Seções de indicações"
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(resolveRecommendationTab(String(key)))}
        variant="secondary"
        className="tabs--secondary"
      >
        <Tabs.ListContainer>
          <Tabs.List>
            <Tabs.Tab key="browse" id="browse">
              Explorar
            </Tabs.Tab>
            <Tabs.Tab key="request" id="request">
              Pedir indicação
            </Tabs.Tab>
            <Tabs.Tab key="requests" id="requests">
              {requestsCount === null ? "Pedidos" : `Pedidos (${requestsCount})`}
            </Tabs.Tab>
            <Tabs.Tab key="saved" id="saved">
              Salvas
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.ListContainer>

        {/* ═══ Explorar ═══════════════════════════════════════════════════════ */}
        <div key="browse" role="tabpanel" hidden={selectedTab !== "browse"}>
          {/* feedback banner */}
          {joinFeedback && (
            <div className="mb-4">
              <FeedbackAlert variant="success" description={joinFeedback} />
            </div>
          )}

          {/* falha ao entrar no grupo: alerta de perigo próprio, não o verde de
              sucesso — a mensagem crua do servidor aparecia num alerta verde */}
          {joinError && (
            <div className="mb-4">
              <FeedbackAlert variant="danger" description={joinError} />
            </div>
          )}

          {/* error */}
          {error && <ErrorState message={error} onRetry={() => loadData()} />}

          {/* loading */}
          {loading && !error && (
            <div className="flex flex-col gap-6" aria-busy="true">
              <div className="flex flex-col gap-2">
                <Skeleton className="mb-2 h-5 w-40" />
                <div className="flex flex-col gap-3">
                  <GroupCardSkeleton />
                  <GroupCardSkeleton />
                  <GroupCardSkeleton />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Skeleton className="mb-2 h-5 w-36" />
                <div className="flex flex-col gap-3">
                  <EventCardSkeleton />
                  <EventCardSkeleton />
                </div>
              </div>
            </div>
          )}

          {/* loaded: empty */}
          {!loading && !error && !hasContent && (
            <EmptyState
              title="Nada por aqui ainda"
              description="Quando houver grupos ou eventos na sua comunidade, eles aparecerão aqui. Que tal explorar os grupos?"
              action={
                // O Button DENTRO do Link é conteúdo interativo aninhado (HTML
                // inválido) e a régua mede o <a>: 97x19 de alvo. O link assume o
                // papel de botão, como no /auth/callback-error.
                <Link
                  href="/groups"
                  className="inline-flex min-h-11 items-center justify-center rounded-[var(--semantic-radius-control)] bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-white transition-colors duration-[var(--duration-instant)] hover:bg-[var(--semantic-action-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                >
                  Ver grupos
                </Link>
              }
            />
          )}

          {/* loaded: content */}
          {!loading && !error && hasContent && (
            <div className="flex flex-col gap-8">
              {/* ── Grupos para descobrir ── */}
              {hasGroups && (
                <section aria-labelledby="discover-groups-heading">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 id="discover-groups-heading" className="text-base font-semibold">
                      Grupos para descobrir
                    </h2>
                    <Link
                      href="/groups"
                      className="transition-colors duration-[var(--duration-instant)]"
                    >
                      <Button
                        variant="tertiary"
                        size="sm"
                        className="rounded-[var(--semantic-radius-control)] text-xs"
                      >
                        Ver todos
                      </Button>
                    </Link>
                  </div>

                  <div className="flex flex-col gap-3">
                    {discoverGroups.map((group) => {
                      const memberCount = groupMemberCounts[group.id]
                      const isJoining = joiningGroupId === group.id

                      return (
                        <Card key={group.id} className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <div className="flex items-center gap-2">
                                {/* F5 Step 3: the group card links to its detail, not
                                    the generic list. */}
                                <Link
                                  href={`/groups/${group.id}`}
                                  className="inline-flex min-h-11 items-center truncate text-sm font-semibold transition-colors hover:underline"
                                >
                                  {group.name}
                                </Link>
                                <Chip size="sm" variant="soft">
                                  {group.visibility === "public" ? "Público" : "Privado"}
                                </Chip>
                              </div>

                              {group.description && (
                                <p className="line-clamp-2 text-xs text-muted">
                                  {group.description}
                                </p>
                              )}

                              <p className="text-xs text-muted">
                                {group.visibility === "private"
                                  ? "Grupo privado"
                                  : memberCount !== undefined
                                    ? `${memberCount} ${memberCount === 1 ? "membro" : "membros"}`
                                    : "Carregando..."}
                              </p>
                            </div>

                            <Button
                              variant={group.visibility === "public" ? "secondary" : "tertiary"}
                              size="sm"
                              className="rounded-[var(--semantic-radius-control)] shrink-0"
                              onPress={() => handleJoin(group.id)}
                              isDisabled={isJoining}
                            >
                              {isJoining
                                ? "Entrando..."
                                : group.visibility === "public"
                                  ? "Entrar"
                                  : "Solicitar"}
                            </Button>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* ── Próximos eventos ── */}
              {hasEvents && (
                <section aria-labelledby="upcoming-events-heading">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 id="upcoming-events-heading" className="text-base font-semibold">
                      Próximos eventos
                    </h2>
                    <Link
                      href="/events"
                      className="transition-colors duration-[var(--duration-instant)]"
                    >
                      <Button
                        variant="tertiary"
                        size="sm"
                        className="rounded-[var(--semantic-radius-control)] text-xs"
                      >
                        Ver todos
                      </Button>
                    </Link>
                  </div>

                  <div className="flex flex-col gap-3">
                    {upcomingEvents.map((event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="transition-colors duration-[var(--duration-instant)]"
                      >
                        <Card className="p-4">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-semibold">{event.title}</h3>
                              <Chip size="sm" variant="soft">
                                {event.group_id ? "Grupo" : "Comunidade"}
                              </Chip>
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted">
                              <span>{formatEventDate(event.starts_at)}</span>
                              <span>{formatEventTime(event.starts_at)}</span>
                              {event.venue && <span className="truncate">{event.venue}</span>}
                            </div>

                            {event.description && (
                              <p className="line-clamp-2 text-xs text-muted">{event.description}</p>
                            )}
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* ═══ Pedir indicação ════════════════════════════════════════════════ */}
        <div key="request" role="tabpanel" hidden={selectedTab !== "request"}>
          {requestStage === "guide" ? (
            <GuideFirstRequest initialTerm={guideTerm} onAskCommunity={handleAskCommunity} />
          ) : (
            // A1 + A2 (parecer R2, prancha 45 painéis 2 e 3): o formulário
            // comunitário compõe DUAS colunas a 1440 — a coluna de leitura do
            // formulário e o trilho "Como seu pedido será publicado". A grade só
            // existe a partir de `lg`: abaixo disso o trilho desce e a coluna
            // usa a largura inteira, sem espremer campo nenhum. O trilho é a
            // metade direita do painel 2 da prancha, não um terceiro painel.
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
              <div className="flex min-w-0 flex-col gap-4">
                {/* Prancha 45 painel 3: o formulário comunitário sabe de onde veio
                  e devolve a pessoa aos resultados do Guia com o termo dela. */}
                <button
                  type="button"
                  onClick={() => setRequestStage("guide")}
                  className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-[var(--semantic-radius-control)] text-sm font-medium text-[var(--semantic-link)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--semantic-focus)]"
                >
                  ← Voltar aos resultados do Guia
                </button>

                {/* Título e promessa da tela (prancha 45 painel 3). O h1 da rota
                  continua "Indicações"; este é o título da etapa. */}
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    Perguntar à comunidade
                  </h2>
                  <p className="measure-reading text-sm text-muted">
                    Não encontrou o que procurava? Pergunte aos seus vizinhos.
                  </p>
                </div>

                {/* feedback banner */}
                {requestFeedback && (
                  <FeedbackAlert variant="success" description={requestFeedback} />
                )}

                {/* error banner */}
                {requestError && (
                  <FeedbackAlert
                    variant="danger"
                    title="Não foi possível publicar"
                    description={requestError}
                  />
                )}

                {/* `noValidate`: a validação é do produto, em português, com
                  mensagem inline no campo em destaque. Sem isso o navegador
                  bloqueia o envio com a bolha nativa e o texto sai no idioma do
                  browser ("Please fill out this field.") — nada do produto
                  aparecia e a pessoa não sabia qual campo revisar. */}
                <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmitRequest}>
                  {/* A PERGUNTA ABRE O FORMULÁRIO (prancha 45 painel 2). A
                      prancha desenha "O que você procura?" como primeiro campo,
                      com "Categoria" e "Para qual comunidade você está
                      perguntando?" descendo para DEPOIS dele, na mesma linha.
                      O código fazia o inverso: liderava por Categoria e Alcance
                      — dois Selects de decisão SOBRE o pedido — antes de a
                      pessoa ter dito o que procura. Ordem medida a 375 em
                      19/09/2026: "Categoria", "Para qual comunidade você está
                      perguntando?", e só então "O que você procura?".
                      Categoria e alcance continuam irmãos dividindo uma linha de
                      grade (A4 do parecer R2); o que muda é a POSIÇÃO do par. */}
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pedido-titulo" className="text-sm font-medium">
                      O que você procura?
                    </label>
                    <Input
                      id="pedido-titulo"
                      required
                      aria-label="Título"
                      aria-invalid={requestFieldError?.field === "title"}
                      {...(requestFieldError?.field === "title"
                        ? { "aria-describedby": "pedido-titulo-erro" }
                        : {})}
                      placeholder="Ex.: transportadora cuidadosa para mudança"
                      value={requestTitle}
                      onChange={(e) => {
                        setRequestTitle((e.target as HTMLInputElement).value)
                        setRequestError("")
                        setRequestFieldError(null)
                        setPiiWarning(false)
                      }}
                    />
                    {requestFieldError?.field === "title" ? (
                      <p
                        id="pedido-titulo-erro"
                        role="alert"
                        className="text-xs font-medium text-[var(--semantic-danger)]"
                      >
                        {requestFieldError.message}
                      </p>
                    ) : null}
                  </div>

                  {/* A4 (parecer R2): o formulário não tinha grade — dois Selects
                      de 320 px flutuavam ao lado de campos de 552 px. Categoria e
                      alcance são decisões irmãs: ficam lado a lado, dividindo a
                      largura de leitura. Abaixo de `sm` elas empilham, na ordem
                      rótulo-controle-mensagem.
                      `grid-rows-subgrid` nas duas células é o que mantém rótulo,
                      controle e mensagem na MESMA linha da grade: sem isso o
                      rótulo longo do alcance quebra em duas linhas e empurra o
                      Select 15 px abaixo do irmão — dois controles irmãos em
                      alturas diferentes. */}
                  <div className="grid gap-4 sm:grid-cols-2 sm:grid-rows-[auto_auto_auto] sm:gap-x-4 sm:gap-y-1.5">
                    <div className="flex flex-col gap-1.5 sm:row-span-3 sm:grid sm:grid-rows-subgrid sm:gap-y-1.5">
                      <span id="pedido-categoria-label" className="text-sm font-medium">
                        Categoria
                      </span>
                      <Select
                        aria-label="Categoria"
                        aria-labelledby="pedido-categoria-label"
                        // A3a: `aria-invalid` cru NÃO chega ao DOM do Select — o
                        // componente do HeroUI ignora o atributo arbitrário e usa a
                        // própria API de invalidez. Como o CSS da biblioteca pinta a
                        // borda de perigo por `.select[data-invalid="true"]`
                        // (ou `[aria-invalid="true"]`), passar o atributo na mão
                        // deixava o campo infrator sem borda nenhuma. `isInvalid` é o
                        // caminho previsto: a marcação chega e o próprio CSS desenha.
                        isInvalid={requestFieldError?.field === "category"}
                        {...(requestFieldError?.field === "category"
                          ? { "aria-describedby": "pedido-categoria-erro" }
                          : {})}
                        selectedKey={requestCategory || null}
                        onSelectionChange={(key) => {
                          if (typeof key === "string") {
                            setRequestCategory(key as RecommendationCategory)
                            setRequestError("")
                            setRequestFieldError(null)
                            // F7 Step 2: when Saúde is picked, force scope to a group
                            // (the locality option is hidden, so the user must pick a
                            // group; auto-select the first group to keep the form valid).
                            if (key === "saude_bem_estar" && requestScope === "locality") {
                              const firstGroup = myGroups[0]
                              if (firstGroup) setRequestScope(firstGroup.id)
                            }
                          }
                        }}
                        isRequired
                        className="w-full"
                      >
                        <Select.Trigger>
                          <Select.Value>Selecione uma categoria</Select.Value>
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {CATEGORIES.map((cat) => (
                              <ListBox.Item key={cat.id} id={cat.id}>
                                {cat.label}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      {requestFieldError?.field === "category" ? (
                        <p
                          id="pedido-categoria-erro"
                          role="alert"
                          className="text-xs font-medium text-[var(--semantic-danger)]"
                        >
                          {requestFieldError.message}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-1.5 sm:row-span-3 sm:grid sm:grid-rows-subgrid sm:gap-y-1.5">
                      <span id="pedido-alcance-label" className="text-sm font-medium">
                        Para qual comunidade você está perguntando?
                      </span>
                      <Select
                        aria-label="Alcance"
                        aria-labelledby="pedido-alcance-label"
                        selectedKey={requestScope}
                        onSelectionChange={(key) => {
                          if (typeof key === "string") {
                            setRequestScope(key)
                            setRequestError("")
                          }
                        }}
                        isRequired
                        className="w-full"
                      >
                        <Select.Trigger>
                          <Select.Value>Escolha o alcance</Select.Value>
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            {/* F7 Step 2: Saúde começa em grupo. The locality option is
                      hidden when the category is health, with an explanatory
                      line above the select. */}
                            {requestCategory !== "saude_bem_estar" ? (
                              <ListBox.Item key="locality" id="locality">
                                {current.cityName}
                              </ListBox.Item>
                            ) : null}
                            {myGroups.map((group) => (
                              <ListBox.Item key={group.id} id={group.id}>
                                {group.name}
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      {requestCategory === "saude_bem_estar" ? (
                        <p className="text-xs text-muted">
                          Pedidos de Saúde começam em grupo — escolha um dos seus grupos como
                          alcance.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="pedido-descricao" className="text-sm font-medium">
                      Conte mais sobre sua dúvida (opcional para quem responde)
                    </label>
                    <TextArea
                      id="pedido-descricao"
                      required
                      aria-label="Descrição"
                      aria-invalid={requestFieldError?.field === "description"}
                      {...(requestFieldError?.field === "description"
                        ? { "aria-describedby": "pedido-descricao-erro" }
                        : {})}
                      placeholder="Descreva o que você está procurando. Evite termos comerciais como preço, pagamento, anúncio ou contato comercial."
                      rows={3}
                      value={requestDescription}
                      onChange={(e) => {
                        setRequestDescription((e.target as HTMLTextAreaElement).value)
                        setRequestError("")
                        setRequestFieldError(null)
                        setPiiWarning(false)
                      }}
                    />
                    {requestFieldError?.field === "description" ? (
                      <p
                        id="pedido-descricao-erro"
                        role="alert"
                        className="text-xs font-medium text-[var(--semantic-danger)]"
                      >
                        {requestFieldError.message}
                      </p>
                    ) : null}
                  </div>

                  <p className="text-xs text-muted">
                    Seu pedido será publicado apenas para membros do Bivaque em {current.cityName}{" "}
                    ou no grupo que você escolher.
                  </p>

                  {piiWarning ? (
                    <div className="rounded-[var(--semantic-radius-card)] border border-border bg-[var(--surface)] p-3">
                      <FeedbackAlert
                        variant="warning"
                        description="Isso parece um CPF ou CEP. Quer mesmo publicar?"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button
                          type="submit"
                          size="sm"
                          variant="primary"
                          className="rounded-[var(--semantic-radius-control)]"
                          isDisabled={requestSubmitting}
                        >
                          Publicar mesmo
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="tertiary"
                          className="rounded-[var(--semantic-radius-control)]"
                          onPress={() => setPiiWarning(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    // A4: a prancha 45 fecha o formulário com o primário na ponta
                    // direita da linha, não sozinho na esquerda de uma linha
                    // larga com ~1000 px vazios à direita.
                    className="rounded-[var(--semantic-radius-control)] self-end"
                    isDisabled={requestSubmitting}
                  >
                    {requestSubmitting ? "Publicando..." : "Publicar pedido"}
                  </Button>
                </form>
              </div>

              {/* Painel 3 da prancha 45. O trilho só existe nesta etapa: é a
                  prévia do que a pessoa acabou de escrever. Nas outras abas ele
                  não aparece — DESIGN_SYSTEM §8.2: o rail é conteúdo acionável
                  ou não existe, nunca espuma visual. */}
              <PublicationPreview
                category={requestCategory}
                title={requestTitle}
                description={requestDescription}
              />
            </div>
          )}
        </div>

        {/* ═══ Pedidos ═════════════════════════════════════════════════════════ */}
        <div key="requests" role="tabpanel" hidden={selectedTab !== "requests"}>
          <RecommendationRequests />
        </div>

        {/* ═══ Salvas ═════════════════════════════════════════════════════════ */}
        <div key="saved" role="tabpanel" hidden={selectedTab !== "saved"}>
          {/* error */}
          {savesError && (
            <div className="mb-4">
              <FeedbackAlert variant="danger" description={savesError} />
            </div>
          )}

          {/* loading */}
          {savesLoading && (
            <div className="flex flex-col gap-3" aria-busy="true">
              <GroupCardSkeleton />
              <GroupCardSkeleton />
            </div>
          )}

          {/* loaded: empty */}
          {!savesLoading && !savesError && savedRequests.length === 0 && (
            <EmptyState
              title="Nenhuma indicação salva"
              description="Você ainda não salvou nenhuma indicação. Quando outros membros publicarem pedidos, você poderá salvá-los aqui para consultar depois."
            />
          )}

          {/* loaded: content */}
          {!savesLoading && !savesError && savedRequests.length > 0 && (
            <div className="flex flex-col gap-3">
              {savedRequests.map((req) => {
                const categoryLabel =
                  CATEGORIES.find((c) => c.id === req.category)?.label ?? req.category
                const isUnsaving = unsavingId === req.id

                return (
                  <Card key={req.id} className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <h3 className="text-sm font-semibold">
                            {/* F6 Step 2: clicking the title focuses the request
                               on the Pedidos tab so the user reads replies. */}
                            <Link
                              href={`/recommendations?focus=${req.id}#req-${req.id}`}
                              className="hover:underline"
                            >
                              {req.title}
                            </Link>
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <Chip size="sm" variant="soft">
                              {categoryLabel}
                            </Chip>
                            <span>
                              {new Date(req.created_at).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="tertiary"
                          size="sm"
                          className="rounded-[var(--semantic-radius-control)] shrink-0 text-xs"
                          onPress={() => handleUnsave(req.id)}
                          isDisabled={isUnsaving}
                        >
                          {isUnsaving ? "Removendo..." : "Remover dos salvos"}
                        </Button>
                      </div>
                      <p className="line-clamp-2 text-xs text-muted">{req.body}</p>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  )
}

// ── A2 (parecer R2, prancha 45 painel 3) ────────────────────────────────────
//
// "Como seu pedido será publicado" não existia em lugar nenhum do produto — a
// metade direita do painel 2 da prancha estava ausente. Este é um trilho de
// PRÉVIA, não um terceiro painel: ele mostra o pedido com os dados que a pessoa
// acabou de digitar (título, descrição), com a identificação real de quem está
// publicando (nome do contexto do membro, cidade da localidade) e com o chip da
// categoria escolhida. Nada aqui é conteúdo fictício: com o campo vazio, o
// trilho diz o que vai aparecer em vez de inventar um exemplo; nenhum controle
// sem operação é desenhado.
function PublicationPreview({
  category,
  title,
  description,
}: Readonly<{
  category: RecommendationCategory | ""
  title: string
  description: string
}>) {
  const { displayName } = useMemberContext()
  const { current } = useLocalityContext()
  const cleanTitle = title.trim()
  const cleanDescription = description.trim()
  const categoryLabel = CATEGORIES.find((entry) => entry.id === category)?.label

  return (
    <aside className="hidden lg:block" aria-label="Como seu pedido será publicado">
      <Card className="p-4">
        <h2 className="text-sm font-semibold">Como seu pedido será publicado</h2>
        <p className="measure-reading mt-1 flex gap-1.5 text-xs text-muted">
          <Info size={14} aria-hidden="true" className="mt-0.5 shrink-0" />
          Esta é uma prévia de como sua publicação aparecerá para a comunidade.
        </p>

        <div className="mt-3 rounded-[var(--semantic-radius-card)] border border-border p-3">
          {/* Ícone de conversa: o pedido é uma pergunta à comunidade, não um
              anúncio. Decorativo — quem tem a informação é o texto ao lado. */}
          <span className="flex h-10 w-10 items-center justify-center rounded-[var(--semantic-radius-control)] bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]">
            <MessageCircle size={20} aria-hidden="true" />
          </span>

          <h3 className="mt-2 text-sm font-semibold">
            {cleanTitle.length > 0 ? (
              cleanTitle
            ) : (
              <span className="font-normal text-muted">O título do seu pedido aparece aqui.</span>
            )}
          </h3>

          <div className="mt-2 flex items-center gap-2">
            <MemberAvatar name={displayName} size="sm" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted">
                {current.cityName}
                {current.stateCode ? `, ${current.stateCode}` : ""}
              </span>
            </span>
          </div>

          <p className="measure-reading mt-2 text-sm leading-relaxed text-muted">
            {cleanDescription.length > 0
              ? cleanDescription
              : "O que você escrever na descrição aparece aqui."}
          </p>

          <div className="mt-3">
            {categoryLabel ? (
              <Chip size="sm" variant="soft">
                {categoryLabel}
              </Chip>
            ) : (
              <span className="text-xs text-muted">A categoria escolhida aparece aqui.</span>
            )}
          </div>
        </div>
      </Card>
    </aside>
  )
}
