import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import { ArrowRight, MessageSquareText } from "lucide-react"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import {
  formatSentLine,
  formatUpdatedLine,
  REQUEST_STATUS_FILTERS,
  REQUEST_STATUS_LABELS,
  type RequestStatusFilter,
  requestTitle,
  type ServiceRequestStatus,
  statusMatchesFilter,
} from "../../../lib/service-requests/tracking"
import { EmptyState } from "../../components/bivaque/empty-state"

// RECON-023 — `/pedidos` (R43, prancha 17): o solicitante acompanha os PROPRIOS
// pedidos por situacao, com ultima atualizacao e link para o detalhe.
//
// A leitura e do cliente autenticado: a RLS de `service_requests` so devolve as
// linhas em que a sessao e solicitante ou destinatario. A pagina nao filtra no
// cliente por seguranca — o filtro de sessao vai na consulta; a aba e so visao.

type RequestListRow = {
  id: string
  description: string
  when_text: string | null
  status: ServiceRequestStatus
  created_at: string
  updated_at: string
  provider_profiles: { display_name: string; category: ProviderCategory } | null
}

const STATUS_CHIP: Record<ServiceRequestStatus, string> = {
  open: "bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]",
  in_conversation: "bg-[var(--semantic-info-surface)] text-[var(--semantic-info-text)]",
  closed: "bg-[var(--semantic-surface-sunken)] text-[var(--semantic-text-secondary)]",
  cancelled: "bg-[var(--semantic-surface-sunken)] text-[var(--semantic-text-secondary)]",
}

function parseFilter(raw: string | undefined): RequestStatusFilter {
  if (raw === "open" || raw === "in_conversation" || raw === "closed") return raw
  return "all"
}

export default async function PedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: rawStatus } = await searchParams
  const filter = parseFilter(rawStatus)

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const client = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Server component, sem escrita de cookie.
      },
    },
  })

  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) {
    redirect("/login")
  }

  const { data, error } = await client
    .from("service_requests")
    .select(
      "id, description, when_text, status, created_at, updated_at, provider_profiles(display_name, category)",
    )
    .eq("requester_user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    throw new Error(`Falha ao carregar os pedidos: ${error.message}`)
  }

  const requests = (data as unknown as RequestListRow[] | null) ?? []
  const visible = requests.filter((request) => statusMatchesFilter(request.status, filter))

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Meus pedidos</h1>
          <p className="text-sm text-muted">
            Acompanhe o que você pediu e a resposta de quem atende.
          </p>
        </header>
        <Link
          href={"/explorar/servicos" as Route}
          className="motion-press inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-action-on-strong)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:opacity-90"
        >
          Pedir um serviço
        </Link>
      </div>

      <nav aria-label="Filtrar pedidos por situação" className="mt-5 border-b border-border">
        <ul className="flex flex-wrap gap-1">
          {REQUEST_STATUS_FILTERS.map((option) => {
            const active = option.id === filter
            const href = (
              option.id === "all" ? "/pedidos" : `/pedidos?status=${option.id}`
            ) as Route
            return (
              <li key={option.id}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`motion-press inline-flex min-h-11 items-center rounded-t-lg px-3 text-sm font-medium transition-colors duration-[var(--semantic-motion-duration-instant)] ${
                    active
                      ? "border-b-2 border-[var(--semantic-action-primary)] text-[var(--semantic-action-primary)]"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {option.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <section className="mt-4" aria-label="Lista de pedidos">
        {requests.length === 0 ? (
          <EmptyState
            title="Você ainda não fez nenhum pedido"
            description="Encontre um prestador, descreva o que você precisa e acompanhe a resposta por aqui."
            illustration={<MessageSquareText size={40} aria-hidden="true" />}
            action={
              <Link
                href={"/explorar/servicos" as Route}
                className="motion-press inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-action-on-strong)] transition-colors duration-[var(--semantic-motion-duration-instant)] hover:opacity-90"
              >
                Buscar serviços
              </Link>
            }
          />
        ) : visible.length === 0 ? (
          <p role="status" className="py-8 text-center text-sm text-muted">
            Nenhum pedido nesta situação.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((request) => {
              const providerName = request.provider_profiles?.display_name ?? "Prestador"
              const category = request.provider_profiles?.category
              const categoryLabel = category
                ? (PROVIDER_CATEGORY_LABELS[category] ?? category)
                : "Serviço"
              return (
                <li key={request.id}>
                  <Link
                    href={`/pedidos/${request.id}` as Route}
                    className="motion-press flex min-h-11 flex-col gap-2 rounded-2xl border border-border bg-[var(--semantic-surface)] px-4 py-3 transition-colors duration-[var(--semantic-motion-duration-instant)] hover:bg-[var(--semantic-surface-sunken)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-semibold">{providerName}</span>
                      <span
                        className={`inline-flex min-h-7 items-center rounded-full px-2.5 text-xs font-medium ${STATUS_CHIP[request.status]}`}
                      >
                        {REQUEST_STATUS_LABELS[request.status]}
                      </span>
                    </div>
                    <p className="text-base font-medium">
                      {requestTitle(request.description, categoryLabel)}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                      <span>
                        {formatSentLine(request.created_at)}
                        {request.when_text ? ` · ${request.when_text}` : ""}
                      </span>
                      <span className="flex items-center gap-1 text-[var(--semantic-action-primary)]">
                        {formatUpdatedLine(request.updated_at)}
                        <ArrowRight size={14} aria-hidden="true" />
                      </span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
