import { Chip } from "@heroui/react"
import type { Route } from "next"
import Link from "next/link"
import { createServerClient } from "../../../lib/supabase/server"
import { EmptyState } from "../../components/bivaque/empty-state"
import { QueryError } from "./query-error"

// The operator panel reads through `service_role` behind `is_current_user_operator`
// and has no possible static form. Without this, `next build` prerenders it and
// throws on the missing NEXT_PUBLIC_* credentials before any request exists.
export const dynamic = "force-dynamic"

const PAGE_SIZE = 10

// "Pendentes" = ainda sem decisão do operador (verificação inicial em curso ou
// em falha temporária). "Concluídas" = caso encerrado com recusa. Quem passou
// na verificação sai da fila — o RPC já filtra os `verified`.
const PENDING_STATUSES = new Set(["pending", "temporary_error"])

const STATUS_LABELS: Record<string, string> = {
  pending: "Em análise",
  temporary_error: "Falha temporária",
  rejected: "Rejeitada",
}

const STATUS_CHIP_COLOR: Record<string, "warning" | "danger" | "default"> = {
  pending: "warning",
  temporary_error: "danger",
  rejected: "default",
}

type Tab = "pendentes" | "concluidas"

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "data indisponível"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

function queueHref(params: { tab: Tab; q: string; page?: number }): Route {
  const search = new URLSearchParams()
  search.set("tab", params.tab)
  if (params.q.length > 0) search.set("q", params.q)
  if (params.page !== undefined && params.page > 1) search.set("page", String(params.page))
  return `/admissions?${search.toString()}` as Route
}

function pageWindow(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = new Set([1, total, current - 1, current, current + 1])
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b)
}

function StatusChip({ status }: { status: string }) {
  return (
    <Chip size="sm" variant="soft" color={STATUS_CHIP_COLOR[status] ?? "default"}>
      {STATUS_LABELS[status] ?? status}
    </Chip>
  )
}

function SearchGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
      className="h-4 w-4"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export default async function AdminAdmissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const tab: Tab = firstParam(params["tab"]) === "concluidas" ? "concluidas" : "pendentes"
  const query = (firstParam(params["q"]) ?? "").trim().slice(0, 120)
  const parsedPage = Number.parseInt(firstParam(params["page"]) ?? "1", 10)
  const requestedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  const serviceClient = createServerClient()
  const [{ data: queueRows, error: queueError }, { data: documentRows, error: documentsError }] =
    await Promise.all([
      serviceClient.rpc("list_verification_queue"),
      serviceClient.rpc("list_verification_documents"),
    ])

  // Ler o error de toda consulta: falha de infraestrutura renderizada como
  // fila vazia faria o operador concluir que não há casos — o bug que a casa
  // já registrou no grupo de leitura de membros.
  if (queueError || documentsError) {
    return (
      <section
        className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12"
        aria-labelledby="admissions-heading"
      >
        <header className="flex flex-col gap-1">
          <h1 id="admissions-heading" className="text-2xl font-semibold tracking-tight">
            Fila de admissões
          </h1>
          <p className="text-sm text-muted">Acompanhe as verificações de acesso ao Bivaque.</p>
        </header>
        <QueryError message="Não foi possível carregar a fila de admissões agora." />
      </section>
    )
  }

  const entries = queueRows ?? []
  const usersWithPendingDocument = new Set((documentRows ?? []).map((doc) => doc.user_id))

  let rows = entries.filter((entry) =>
    tab === "pendentes" ? PENDING_STATUSES.has(entry.status) : entry.status === "rejected",
  )
  if (query.length > 0) {
    const needle = query.toLocaleLowerCase("pt-BR")
    rows = rows.filter((entry) =>
      (entry.display_name ?? "").toLocaleLowerCase("pt-BR").includes(needle),
    )
  }

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(requestedPage, totalPages)
  const visible = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // O e-mail não vem do RPC da fila (ele só entrega id, nome, status e data).
  // Resolve-se pela API de admin, do servidor, somente para as linhas da
  // página visível — nunca para a tabela inteira.
  const emails = await Promise.all(
    visible.map(async (entry) => {
      const { data, error } = await serviceClient.auth.admin.getUserById(entry.user_id)
      return error ? null : (data.user?.email ?? null)
    }),
  )

  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastShown = (page - 1) * PAGE_SIZE + visible.length
  const countLabel =
    totalPages === 1
      ? `Mostrando ${total} de ${total} solicitações`
      : `Mostrando ${firstShown}–${lastShown} de ${total} solicitações`

  return (
    <section
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12"
      aria-labelledby="admissions-heading"
    >
      <header className="flex flex-col gap-1">
        <h1 id="admissions-heading" className="text-2xl font-semibold tracking-tight">
          Fila de admissões
        </h1>
        <p className="text-sm text-muted">Acompanhe as verificações de acesso ao Bivaque.</p>
      </header>

      <nav aria-label="Situação das solicitações">
        <ul className="flex gap-6 border-b border-border text-sm">
          <li>
            <Link
              href={queueHref({ tab: "pendentes", q: query })}
              aria-current={tab === "pendentes" ? "page" : undefined}
              className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-1 font-medium ${
                tab === "pendentes"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Pendentes
            </Link>
          </li>
          <li>
            <Link
              href={queueHref({ tab: "concluidas", q: query })}
              aria-current={tab === "concluidas" ? "page" : undefined}
              className={`-mb-px inline-flex min-h-11 items-center border-b-2 px-1 font-medium ${
                tab === "concluidas"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Concluídas
            </Link>
          </li>
        </ul>
      </nav>

      <search>
        <form method="get" action="/admissions" className="flex items-center gap-2">
          <input type="hidden" name="tab" value={tab} />
          <label className="sr-only" htmlFor="admissions-search">
            Buscar por nome
          </label>
          <input
            id="admissions-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Buscar por nome"
            className="min-h-11 w-full min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-sm"
          />
          <button
            type="submit"
            aria-label="Buscar na fila"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface px-3 text-muted transition-colors hover:text-foreground"
          >
            <SearchGlyph />
          </button>
        </form>
      </search>

      {visible.length === 0 ? (
        query.length > 0 ? (
          <EmptyState
            title="Nenhum resultado para a busca"
            description={`Nenhuma solicitação ${tab === "pendentes" ? "pendente" : "concluída"} corresponde a "${query}".`}
            action={
              <Link
                href={queueHref({ tab, q: "" })}
                className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium"
              >
                Limpar busca
              </Link>
            }
          />
        ) : tab === "pendentes" ? (
          <EmptyState
            title="Nenhuma solicitação pendente"
            description="Quando alguém enviar um documento de identidade ou a verificação inicial travar, a pessoa aparece aqui."
          />
        ) : (
          <EmptyState
            title="Nenhuma solicitação concluída"
            description="Casos encerrados por recusa aparecem aqui, com o registro da decisão."
          />
        )
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Solicitações de admissão {tab === "pendentes" ? "pendentes" : "concluídas"}
            </caption>
            <thead>
              <tr className="border-b border-border text-muted">
                <th scope="col" className="px-4 py-3 font-medium">
                  Nome
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                  E-mail
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                  Data da solicitação
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Situação
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only md:hidden">Ações</span>
                  <span className="hidden md:inline">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry, index) => (
                <tr key={entry.user_id} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium">
                    {entry.display_name || "Sem perfil ainda"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {emails[index] ?? "—"}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {formatDate(entry.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <StatusChip status={entry.status} />
                      {usersWithPendingDocument.has(entry.user_id) && (
                        <Chip size="sm" variant="soft" color="default">
                          Documento para decidir
                        </Chip>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admissions/${entry.user_id}` as Route}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-surface-sunken)]"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <p>{countLabel}</p>
        {totalPages > 1 && (
          <nav aria-label="Paginação da fila" className="flex items-center gap-1">
            {page > 1 && (
              <Link
                href={queueHref({ tab, q: query, page: page - 1 })}
                aria-label="Página anterior"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface px-2"
              >
                <span aria-hidden="true">‹</span>
              </Link>
            )}
            {pageWindow(page, totalPages).map((number) => (
              <Link
                key={number}
                href={queueHref({ tab, q: query, page: number })}
                aria-current={number === page ? "page" : undefined}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-2 ${
                  number === page
                    ? "border-accent font-medium text-foreground"
                    : "border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                {number}
              </Link>
            ))}
            {page < totalPages && (
              <Link
                href={queueHref({ tab, q: query, page: page + 1 })}
                aria-label="Próxima página"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface px-2"
              >
                <span aria-hidden="true">›</span>
              </Link>
            )}
          </nav>
        )}
      </footer>
    </section>
  )
}
