import { scrubReportReason } from "@bivaque/domain"
import { Chip } from "@heroui/react"
import type { Route } from "next"
import Link from "next/link"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import { SUPPORT_SLA_HOURS } from "../../../lib/support"
import { EmptyState } from "../../components/bivaque/empty-state"
import { QueryError } from "../admissions/query-error"
import {
  applyFilters,
  countLabel,
  formatDate,
  isOverSla,
  type Ordem,
  pageWindow,
  paginateRows,
  parseQueueParams,
  type ReportRow,
  resolveTargets,
  SEM_COMUNIDADE,
  shortLabel,
  TARGET_LABELS,
  type Tab,
  truncateReason,
} from "./targets"

// The operator panel reads through `service_role` behind `is_current_user_operator`
// and has no possible static form. Without this, `next build` prerenders it and
// throws on the missing NEXT_PUBLIC_* credentials before any request exists.
export const dynamic = "force-dynamic"

interface QueueHrefParams {
  tab: Tab
  tipo: string | null
  comunidade: string | null
  motivo: string
  ordem: Ordem
  pagina?: number | undefined
}

function queueHref(params: QueueHrefParams): Route {
  const search = new URLSearchParams()
  if (params.tab !== "em-analise") search.set("aba", params.tab)
  if (params.tipo !== null) search.set("tipo", params.tipo)
  if (params.comunidade !== null) search.set("comunidade", params.comunidade)
  if (params.motivo.length > 0) search.set("motivo", params.motivo)
  if (params.ordem !== "antigas") search.set("ordem", params.ordem)
  if (params.pagina !== undefined && params.pagina > 1) search.set("pagina", String(params.pagina))
  const qs = search.toString()
  return (qs.length > 0 ? `/reports?${qs}` : "/reports") as Route
}

function StatusChip({ status }: { status: ReportRow["status"] }) {
  return (
    <Chip size="sm" variant="soft" color={status === "open" ? "warning" : "default"}>
      {status === "open" ? "Em análise" : "Concluída"}
    </Chip>
  )
}

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const filters = parseQueueParams(await searchParams)
  const serviceClient = createServiceClient()

  // As duas abas vêm de consulta real: a fila aberta pelo RPC que já existe e
  // o encerrado pela tabela de denúncias. Contagem de aba é o total SEM filtro.
  const [{ data: openRows, error: openError }, { data: resolvedRows, error: resolvedError }] =
    await Promise.all([
      serviceClient.rpc("list_open_reports"),
      serviceClient
        .from("reports")
        .select(
          "id, target_type, target_id, reason, created_at, status, operator_note, resolved_at",
        )
        .eq("status", "resolved")
        .order("created_at", { ascending: false }),
    ])

  // Ler o error de toda consulta: falha de infraestrutura renderizada como
  // fila vazia faria o operador concluir que não há casos — o bug que a casa
  // já registrou. O estado de erro tem nova tentativa explícita.
  if (openError || resolvedError) {
    return (
      <section
        className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12"
        aria-labelledby="reports-heading"
      >
        <h1 id="reports-heading" className="text-2xl font-semibold tracking-tight">
          Fila de denúncias
        </h1>
        <QueryError message="Não foi possível carregar a fila de denúncias agora." />
      </section>
    )
  }

  const openCount = openRows?.length ?? 0
  const resolvedCount = resolvedRows?.length ?? 0

  const openList: ReportRow[] = (openRows ?? []).map((row) => ({
    id: row.id,
    target_type: row.target_type,
    target_id: row.target_id,
    reason: row.reason,
    created_at: row.created_at,
    status: "open",
    resolved_at: null,
    operator_note: null,
    excerpt: row.target_excerpt,
    authorName: row.target_author_name,
    communityName: null,
    contentCreatedAt: null,
    openReportsOnTarget: row.open_reports_on_target,
  }))
  const resolvedList: ReportRow[] = (resolvedRows ?? []).map((row) => ({
    id: row.id,
    target_type: row.target_type,
    target_id: row.target_id,
    reason: row.reason,
    created_at: row.created_at,
    status: "resolved",
    resolved_at: row.resolved_at,
    operator_note: row.operator_note,
    excerpt: null,
    authorName: null,
    communityName: null,
    contentCreatedAt: null,
    openReportsOnTarget: 0,
  }))

  const rows = filters.tab === "em-analise" ? openList : resolvedList
  const targets = await resolveTargets(
    serviceClient,
    rows.map((row) => ({ target_type: row.target_type, target_id: row.target_id })),
  )
  for (const row of rows) {
    const info = targets.get(row.target_id)
    if (!info) continue
    row.communityName = info.communityName
    if (row.status === "resolved") {
      row.excerpt = info.content
      row.authorName = info.authorName
      row.contentCreatedAt = info.contentCreatedAt
    }
  }

  const filtered = applyFilters(rows, filters)
  const paged = paginateRows(filtered, filters.pagina)
  const hasFilters =
    filters.tipo !== null || filters.comunidade !== null || filters.motivo.length > 0

  // Opções de filtro derivadas dos dados reais da aba: nada de categoria
  // inventada — o motivo é texto livre, então ele entra como busca, não como
  // lista fixa.
  const tipoOptions = [...new Set(rows.map((row) => row.target_type))]
  const comunidadeNames = [
    ...new Set(rows.map((row) => row.communityName).filter((n): n is string => n !== null)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"))
  const temSemComunidade = rows.some((row) => row.communityName === null)

  const now = Date.now()
  const clearHref = queueHref({
    tab: filters.tab,
    tipo: null,
    comunidade: null,
    motivo: "",
    ordem: filters.ordem,
  })
  const sortNext: Ordem = filters.ordem === "antigas" ? "recentes" : "antigas"

  return (
    <section
      className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12"
      aria-labelledby="reports-heading"
    >
      <h1 id="reports-heading" className="text-2xl font-semibold tracking-tight">
        Fila de denúncias
      </h1>

      <nav aria-label="Situação das denúncias">
        <ul className="flex gap-6 border-b border-border text-sm">
          <li>
            <Link
              href={queueHref({ ...filters, tab: "em-analise", pagina: undefined })}
              aria-current={filters.tab === "em-analise" ? "page" : undefined}
              className={`-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-1 font-medium transition-colors ${
                filters.tab === "em-analise"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Em análise
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-muted">
                {openCount}
              </span>
            </Link>
          </li>
          <li>
            <Link
              href={queueHref({ ...filters, tab: "concluidas", pagina: undefined })}
              aria-current={filters.tab === "concluidas" ? "page" : undefined}
              className={`-mb-px inline-flex min-h-11 items-center gap-2 border-b-2 px-1 font-medium transition-colors ${
                filters.tab === "concluidas"
                  ? "border-accent text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              }`}
            >
              Concluídas
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs text-muted">
                {resolvedCount}
              </span>
            </Link>
          </li>
        </ul>
      </nav>

      <search>
        <form
          method="get"
          action="/reports"
          aria-label="Filtros da fila de denúncias"
          className="flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="aba" value={filters.tab} />
          <input type="hidden" name="ordem" value={filters.ordem} />
          <div className="flex min-w-40 flex-col gap-1">
            <label htmlFor="filtro-tipo" className="text-xs text-muted">
              Tipo
            </label>
            <select
              id="filtro-tipo"
              name="tipo"
              defaultValue={filters.tipo ?? ""}
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm transition-colors"
            >
              <option value="">Todos</option>
              {tipoOptions.map((type) => (
                <option key={type} value={type}>
                  {TARGET_LABELS[type] ?? type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-40 flex-col gap-1">
            <label htmlFor="filtro-comunidade" className="text-xs text-muted">
              Comunidade
            </label>
            <select
              id="filtro-comunidade"
              name="comunidade"
              defaultValue={filters.comunidade ?? ""}
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm transition-colors"
            >
              <option value="">Todas</option>
              {comunidadeNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
              {temSemComunidade && <option value={SEM_COMUNIDADE}>Sem comunidade</option>}
            </select>
          </div>
          <div className="flex min-w-40 flex-1 flex-col gap-1">
            <label htmlFor="filtro-motivo" className="text-xs text-muted">
              Motivo da denúncia
            </label>
            <input
              id="filtro-motivo"
              type="search"
              name="motivo"
              defaultValue={filters.motivo}
              className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-sm transition-colors"
            />
          </div>
          <button
            type="submit"
            className="min-h-11 rounded-lg border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-surface-sunken)]"
          >
            Filtrar
          </button>
          <Link
            href={clearHref}
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-[var(--semantic-surface-sunken)]"
          >
            Limpar filtros
          </Link>
        </form>
      </search>

      {paged.total === 0 ? (
        hasFilters ? (
          <EmptyState
            title="Nenhum resultado para os filtros"
            description="Nenhuma denúncia nesta aba corresponde aos filtros aplicados."
            action={
              <Link
                href={clearHref}
                className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium"
              >
                Limpar filtros
              </Link>
            }
          />
        ) : filters.tab === "em-analise" ? (
          <EmptyState
            title="Nenhuma denúncia em análise"
            description="A fila está limpa. Denúncias enviadas por membros aparecem aqui para decisão."
          />
        ) : (
          <EmptyState
            title="Nenhuma denúncia concluída"
            description="Denúncias encerradas por um operador aparecem aqui, com a data de recebimento e o registro da decisão."
          />
        )
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Denúncias {filters.tab === "em-analise" ? "em análise" : "concluídas"}
            </caption>
            <thead>
              <tr className="border-b border-border text-muted">
                <th scope="col" className="px-4 py-3 font-medium">
                  Conteúdo
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                  Tipo
                </th>
                <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">
                  Motivo da denúncia
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Situação
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 font-medium"
                  aria-sort={filters.ordem === "antigas" ? "ascending" : "descending"}
                >
                  <Link
                    href={queueHref({ ...filters, ordem: sortNext, pagina: undefined })}
                    className="inline-flex min-h-11 items-center gap-1 transition-colors hover:text-foreground"
                  >
                    Recebido em
                    <span aria-hidden="true">{filters.ordem === "antigas" ? "↑" : "↓"}</span>
                  </Link>
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  <span className="sr-only md:hidden">Ações</span>
                  <span className="hidden md:inline">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.rows.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0">
                  <td className="max-w-64 px-4 py-3">
                    <p className="font-medium">
                      {shortLabel(row.excerpt) ||
                        "conteúdo não encontrado — pode já ter sido removido"}
                    </p>
                    {row.openReportsOnTarget > 1 && (
                      <p className="mt-0.5 text-xs font-medium text-danger">
                        {row.openReportsOnTarget} denúncias abertas neste alvo
                      </p>
                    )}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {TARGET_LABELS[row.target_type] ?? row.target_type}
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {/* Varre ANTES de truncar: truncar primeiro pode partir um CPF
                        ao meio e o detector deixa passar o pedaco. A pagina de
                        analise faz o mesmo — a fila nao pode ser a porta larga. */}
                    {truncateReason(scrubReportReason(row.reason))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1">
                      <StatusChip status={row.status} />
                      {row.status === "open" &&
                        isOverSla(row.created_at, now, SUPPORT_SLA_HOURS) && (
                          <span className="rounded-sm bg-danger px-1.5 py-0.5 text-xs font-medium text-danger-foreground">
                            +{SUPPORT_SLA_HOURS}h
                          </span>
                        )}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-muted md:table-cell">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/reports/${row.id}` as Route}
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
        <p>{countLabel(paged)}</p>
        {paged.totalPages > 1 && (
          <nav aria-label="Paginação da fila" className="flex items-center gap-1">
            {paged.page > 1 && (
              <Link
                href={queueHref({ ...filters, pagina: paged.page - 1 })}
                aria-label="Página anterior"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface px-2 transition-colors"
              >
                <span aria-hidden="true">‹</span>
              </Link>
            )}
            {pageWindow(paged.page, paged.totalPages).map((number) => (
              <Link
                key={number}
                href={queueHref({ ...filters, pagina: number })}
                aria-current={number === paged.page ? "page" : undefined}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-2 transition-colors ${
                  number === paged.page
                    ? "border-accent font-medium text-foreground"
                    : "border-border bg-surface text-muted hover:text-foreground"
                }`}
              >
                {number}
              </Link>
            ))}
            {paged.page < paged.totalPages && (
              <Link
                href={queueHref({ ...filters, pagina: paged.page + 1 })}
                aria-label="Próxima página"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface px-2 transition-colors"
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
