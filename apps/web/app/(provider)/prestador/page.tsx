import { PROVIDER_CATEGORY_LABELS, type ProviderCategory } from "@bivaque/domain"
import { createServerClient } from "@supabase/ssr"
import type { Route } from "next"
import { cookies } from "next/headers"
import Link from "next/link"
import { computeFichaCompleteness } from "../../../lib/service-requests/completeness"
import {
  formatReceived,
  QUEUE_TABS,
  type QueueTabId,
  requestBody,
  requestTitle,
  type ServiceRequestStatus,
  tabForStatus,
} from "../../../lib/service-requests/status"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import { EmptyState } from "../../components/bivaque/empty-state"
import { ErrorState } from "../../components/bivaque/error-state"

// RECON-024 — painel do negócio (prancha 23). A fila lê a COLUNA `status` de
// service_requests, nunca a existência de mensagem (ADR-20260909 D1).

interface RequestRow {
  id: string
  conversation_id: string
  description: string
  when_text: string | null
  region: string | null
  category: ProviderCategory
  status: ServiceRequestStatus
  created_at: string
}

interface QueueItem extends RequestRow {
  clientName: string
}

function parseTab(raw: string | undefined): QueueTabId {
  const found = QUEUE_TABS.find((tab) => tab.id === raw)
  return found?.id ?? "novos"
}

export default async function PrestadorHomePage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ tab?: string; q?: string; pedido?: string }>
}>) {
  const params = await searchParams
  const tab = parseTab(params.tab)
  const query = (params.q ?? "").trim().toLowerCase()

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"]
  const anonKey = process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]
  if (!url || !anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required")
  }

  const cookieStore = await cookies()
  const authClient = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll() {
        // Read-only here.
      },
    },
  })

  const {
    data: { user },
  } = await authClient.auth.getUser()
  if (!user) return null

  const serviceClient = createServiceClient()

  const { data: profileRow, error: profileError } = await authClient
    .from("provider_profiles")
    .select("id, display_name, category, bio, contact_phone")
    .eq("owner_user_id", user.id)
    .maybeSingle()
  if (profileError) throw new Error(`Falha ao carregar a ficha: ${profileError.message}`)

  const profile = (profileRow ?? null) as {
    id: string
    display_name: string
    category: ProviderCategory
    bio: string | null
    contact_phone: string | null
  } | null

  const { data: accountRow } = await serviceClient
    .from("provider_accounts")
    .select("locality_id")
    .eq("auth_user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle()
  const localityId = (accountRow as { locality_id: string | null } | null)?.locality_id ?? null

  let cityLabel = ""
  if (localityId) {
    const { data: localityRow } = await serviceClient
      .from("localities")
      .select("city_name, state_code")
      .eq("id", localityId)
      .maybeSingle()
    const locality = localityRow as { city_name: string; state_code: string } | null
    if (locality) cityLabel = `${locality.city_name}, ${locality.state_code}`
  }

  const providerId = profile?.id ?? ""

  const { count: catalogCount } = await authClient
    .from("provider_catalog_items")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", providerId)
  const { count: portfolioCount } = await authClient
    .from("provider_portfolio_photos")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", providerId)
  const { count: reachCount } = await authClient
    .from("provider_reach")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", providerId)
    .eq("active", true)

  const completeness = computeFichaCompleteness({
    bio: profile?.bio ?? null,
    catalogCount: catalogCount ?? 0,
    reachCount: reachCount ?? 0,
    portfolioCount: portfolioCount ?? 0,
    contactPhone: profile?.contact_phone ?? null,
  })

  // A fila é a única parte que depende da migration nova. Um erro aqui vira um
  // ESTADO DE ERRO explícito — nunca uma lista vazia que finge sucesso.
  let queueError: string | null = null
  let rows: RequestRow[] = []
  if (providerId) {
    const { data, error } = await authClient
      .from("service_requests")
      .select("id, conversation_id, description, when_text, region, category, status, created_at")
      .eq("provider_id", providerId)
      .order("created_at", { ascending: false })
      .limit(200)
    if (error) {
      queueError = "Não foi possível carregar seus pedidos agora."
    } else {
      rows = (data ?? []) as RequestRow[]
    }
  }

  const counts: Record<QueueTabId, number> = { novos: 0, em_conversa: 0, encerrados: 0 }
  for (const row of rows) {
    const rowTab = tabForStatus(row.status)
    counts[rowTab] += 1
  }

  const filtered = rows.filter((row) => {
    if (tabForStatus(row.status) !== tab) return false
    if (query.length === 0) return true
    return (
      row.description.toLowerCase().includes(query) ||
      (row.region ?? "").toLowerCase().includes(query) ||
      (row.when_text ?? "").toLowerCase().includes(query)
    )
  })

  const visible = filtered.slice(0, 25)
  const queueItems: QueueItem[] = await Promise.all(
    visible.map(async (row) => {
      const { data: name } = await authClient.rpc("conversation_counterpart_name", {
        p_conversation_id: row.conversation_id,
      })
      return { ...row, clientName: (name as string | null) ?? "Membro" }
    }),
  )

  const selectedId = params.pedido ?? queueItems[0]?.id ?? null
  const selected = queueItems.find((item) => item.id === selectedId) ?? queueItems[0] ?? null

  const activeTab = QUEUE_TABS.find((candidate) => candidate.id === tab)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Pedidos para você</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Organize as conversas e mantenha sua ficha atualizada.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {queueError ? (
            <div className="space-y-3">
              <ErrorState message={queueError} />
              <Link
                href={"/prestador" as Route}
                className="inline-flex min-h-11 items-center text-sm underline transition-colors"
              >
                Tentar novamente
              </Link>
            </div>
          ) : (
            <>
              <div
                role="tablist"
                aria-label="Situação dos pedidos"
                className="flex gap-5 border-b border-border"
              >
                {QUEUE_TABS.map((candidate) => {
                  const isActive = candidate.id === tab
                  const href = `/prestador?tab=${candidate.id}` as Route
                  return (
                    <Link
                      key={candidate.id}
                      href={href}
                      role="tab"
                      aria-selected={isActive}
                      className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-1 text-sm font-medium ${
                        isActive
                          ? "border-[var(--semantic-action-primary)] text-[var(--semantic-action-primary)]"
                          : "border-transparent text-muted"
                      }`}
                    >
                      {candidate.label} ({counts[candidate.id]})
                    </Link>
                  )
                })}
              </div>

              {queueItems.length === 0 ? (
                <EmptyState
                  title={
                    query.length > 0
                      ? "Nenhum pedido encontrado para esta busca."
                      : `Nenhum pedido em ${activeTab?.label ?? "esta aba"}.`
                  }
                  description="Quando um membro pedir um serviço, o pedido aparece aqui."
                />
              ) : (
                <>
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full min-w-[40rem] border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                          <th className="px-4 py-3 font-medium">Cliente</th>
                          <th className="px-4 py-3 font-medium">Serviço solicitado</th>
                          <th className="px-4 py-3 font-medium">Região</th>
                          <th className="px-4 py-3 font-medium">Quando</th>
                          <th className="px-4 py-3 font-medium">Recebido</th>
                          <th className="px-4 py-3 font-medium sr-only">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queueItems.map((item) => (
                          <tr key={item.id} className="border-b border-border last:border-b-0">
                            <td className="px-4 py-3">
                              <span className="flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--semantic-selected)] text-xs font-semibold text-[var(--semantic-action-primary)]"
                                >
                                  {item.clientName.charAt(0).toUpperCase()}
                                </span>
                                <span className="font-medium">{item.clientName}</span>
                              </span>
                            </td>
                            <td className="max-w-[16rem] px-4 py-3">
                              {requestTitle(item.description)}
                            </td>
                            <td className="px-4 py-3 text-muted">{item.region ?? "—"}</td>
                            <td className="px-4 py-3 text-muted">
                              {item.when_text ?? "A combinar"}
                            </td>
                            <td className="px-4 py-3 text-muted">
                              {formatReceived(item.created_at)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link
                                href={`/prestador/pedidos/${item.id}` as Route}
                                className="inline-flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-4 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors"
                              >
                                Responder
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {selected && (
                    <section
                      aria-label="Pedido selecionado"
                      className="rounded-xl border border-border bg-[var(--semantic-surface)] p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="grid h-12 w-12 place-items-center rounded-full bg-[var(--semantic-selected)] text-base font-semibold text-[var(--semantic-action-primary)]"
                          >
                            {selected.clientName.charAt(0).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-semibold">{selected.clientName}</p>
                            <p className="text-sm text-muted">
                              {[selected.region, cityLabel].filter(Boolean).join(" · ") ||
                                "Local não informado"}
                            </p>
                            <p className="text-sm text-muted">
                              {selected.when_text ?? "A combinar"}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted">
                          Recebido {formatReceived(selected.created_at)}
                        </p>
                      </div>

                      <hr className="my-4 border-border" />

                      <h2 className="text-base font-semibold">
                        {requestTitle(selected.description)}
                      </h2>
                      {requestBody(selected.description) && (
                        <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                          {requestBody(selected.description)}
                        </p>
                      )}

                      <span className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--semantic-selected)] px-3 py-1 text-sm text-[var(--semantic-action-primary)]">
                        {PROVIDER_CATEGORY_LABELS[selected.category]}
                      </span>

                      <div className="mt-4">
                        <Link
                          href={`/prestador/pedidos/${selected.id}` as Route}
                          className="inline-flex min-h-11 items-center rounded-lg bg-[var(--semantic-action-primary)] px-5 text-sm font-medium text-[var(--semantic-text-on-strong)] transition-colors"
                        >
                          Ver conversa
                        </Link>
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <div
            aria-hidden="true"
            className="flex h-32 items-center justify-center rounded-xl bg-[var(--semantic-selected)] text-[var(--semantic-action-primary)]"
          >
            <span className="text-4xl font-bold opacity-40">
              {(profile?.display_name ?? "?").charAt(0).toUpperCase()}
            </span>
          </div>

          <section className="rounded-xl border border-border bg-[var(--semantic-surface)] p-4">
            <p className="text-lg font-semibold">{profile?.display_name ?? "Sua ficha"}</p>
            <p className="text-sm text-muted">
              {profile ? PROVIDER_CATEGORY_LABELS[profile.category] : "Sem categoria"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {cityLabel ? `Atende ${cityLabel}` : "Área de atendimento não definida"}
            </p>
            <Link
              href={"/prestador/ficha" as Route}
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-medium transition-colors"
            >
              Ver minha ficha
            </Link>
          </section>

          <section className="rounded-xl border border-border bg-[var(--semantic-surface)] p-4">
            <h2 className="text-base font-semibold">Complete sua ficha</h2>
            <p className="mt-1 text-sm text-muted">
              Quanto mais completa, mais confiança e pedidos qualificados você recebe.
            </p>

            {completeness.pending && (
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-[var(--semantic-selected)] px-3 py-2">
                <span className="text-sm text-[var(--semantic-action-primary)]">
                  {completeness.pending.text}
                </span>
                <Link
                  href={completeness.pending.actionHref as Route}
                  className="inline-flex min-h-11 items-center rounded-lg border border-border bg-[var(--semantic-surface)] px-3 text-sm font-medium transition-colors"
                >
                  Editar ficha
                </Link>
              </div>
            )}

            <ul className="mt-3 space-y-1">
              {completeness.items.map((item) => (
                <li
                  key={item.key}
                  className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-b-0"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs ${
                        item.done
                          ? "bg-[var(--semantic-action-primary)] text-[var(--semantic-text-on-strong)]"
                          : "border border-border text-muted"
                      }`}
                    >
                      {item.done ? "✓" : ""}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted">{item.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
