import { scrubReportReason } from "@bivaque/domain"
import { Chip } from "@heroui/react"
import Link from "next/link"
import { createServerClient as createServiceClient } from "../../../../lib/supabase/server"
import { MemberAvatar } from "../../../components/bivaque/avatar"
import { EmptyState } from "../../../components/bivaque/empty-state"
import { parseReportReason } from "../../../components/bivaque/report-reasons"
import { QueryError } from "../../admissions/query-error"
import { resolveListingReport, resolveReport, restoreListing } from "../actions"
import { formatDate, resolveTargets, shortLabel, TARGET_LABELS } from "../targets"
import { DecisionForm, type DecisionState } from "./decision-form"
import { ListingRestoreForm, type RestoreState } from "./listing-restore-form"

// A análise lê pelo service_role atrás do gate do layout; sem dynamic o build
// prerenderiza e quebra antes de existir request.
export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ReportView {
  id: string
  targetType: string
  targetId: string
  reason: string
  receivedAt: string
  status: "open" | "resolved"
  resolvedAt: string | null
  operatorNote: string | null
  openReportsOnTarget: number
}

// Mapeia o resultado da action (que já confirmou operador antes da chamada
// privilegiada) em estado visual. O erro interno do banco não é ecoado — só
// as mensagens que o operador precisa para reagir.
function decisionResult(r: { ok: boolean; error?: string }): DecisionState {
  if (r.ok) {
    return {
      status: "ok",
      message: "Decisão registrada. Quem denunciou foi notificado do encerramento.",
    }
  }
  if (r.error === "forbidden") return { status: "forbidden", message: "" }
  if (r.error === "invalid-decision") {
    return { status: "error", message: "Selecione uma decisão antes de confirmar." }
  }
  if (r.error === "missing-justification") {
    return { status: "error", message: "A justificativa da decisão é obrigatória." }
  }
  if (r.error === "already-resolved") {
    return { status: "error", message: "Esta denúncia já foi encerrada por outra pessoa." }
  }
  return {
    status: "error",
    message: "Não foi possível registrar agora. Confira o estado da fila e tente novamente.",
  }
}

function restoreResult(r: { ok: boolean; changed?: boolean; error?: string }): RestoreState {
  if (r.ok && r.changed) {
    return {
      status: "ok",
      message:
        "O anúncio voltou a aparecer para quem tem acesso a ele. A situação e o público não mudaram.",
    }
  }
  if (r.ok) {
    // Idempotência dita à pessoa: repetir a restauração de um anúncio já visível
    // não é erro nem sucesso novo — nada foi alterado.
    return {
      status: "unchanged",
      message: "O anúncio já estava visível. Nada foi alterado e nenhum evento novo foi gravado.",
    }
  }
  if (r.error === "forbidden") return { status: "forbidden", message: "" }
  if (r.error === "missing-justification") {
    return { status: "error", message: "A justificativa da restauração é obrigatória." }
  }
  if (r.error === "not-found") {
    return { status: "error", message: "Este anúncio não existe mais." }
  }
  return {
    status: "error",
    message: "Não foi possível restaurar agora. Confira o estado da fila e tente novamente.",
  }
}

function BackToQueue() {
  return (
    <Link
      href="/reports"
      className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-foreground"
    >
      <span aria-hidden="true">←</span> Voltar para a fila
    </Link>
  )
}

function LockGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      aria-hidden="true"
      className="mt-0.5 h-4 w-4 shrink-0"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

function NotFoundView() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <BackToQueue />
      <h1 className="text-2xl font-semibold tracking-tight">Denúncia não encontrada</h1>
      <EmptyState
        title="Nada para analisar aqui"
        description="A denúncia pode ter saído do registro ou o endereço está incorreto."
        action={
          <Link
            href="/reports"
            className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium"
          >
            Ver a fila completa
          </Link>
        }
      />
    </section>
  )
}

function LoadErrorView() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <BackToQueue />
      <h1 className="text-2xl font-semibold tracking-tight">Análise da denúncia</h1>
      <QueryError message="Não foi possível carregar esta denúncia agora." />
    </section>
  )
}

export default async function AdminReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: reportId } = await params

  if (!UUID_RE.test(reportId)) {
    return <NotFoundView />
  }

  const serviceClient = createServiceClient()

  // A denúncia aberta vem do RPC que já monta o caso (autor, trecho,
  // reincidência). Se não está na fila aberta, pode já ter sido encerrada —
  // aí a linha vem direto da tabela. Falha de consulta é erro com nova
  // tentativa, nunca "não existe".
  const { data: openRows, error: openError } = await serviceClient.rpc("list_open_reports")
  if (openError) {
    return <LoadErrorView />
  }
  const open = openRows?.find((row) => row.id === reportId) ?? null

  let view: ReportView
  if (open) {
    view = {
      id: open.id,
      targetType: open.target_type,
      targetId: open.target_id,
      reason: open.reason,
      receivedAt: open.created_at,
      status: "open",
      resolvedAt: null,
      operatorNote: null,
      openReportsOnTarget: open.open_reports_on_target,
    }
  } else {
    const { data, error } = await serviceClient
      .from("reports")
      .select("id, target_type, target_id, reason, created_at, status, operator_note, resolved_at")
      .eq("id", reportId)
      .maybeSingle()
    if (error) {
      return <LoadErrorView />
    }
    if (!data) {
      return <NotFoundView />
    }
    view = {
      id: data.id,
      targetType: data.target_type,
      targetId: data.target_id,
      reason: data.reason,
      receivedAt: data.created_at,
      status: data.status === "resolved" ? "resolved" : "open",
      resolvedAt: data.resolved_at,
      operatorNote: data.operator_note,
      openReportsOnTarget: 0,
    }
  }

  // O que se exibe é consulta real do alvo: conteúdo completo, autor e
  // comunidade. Se o alvo sumiu ou a consulta dele falhou, os campos ficam
  // vazios e a tela diz isso — não chuta valor.
  const targets = await resolveTargets(serviceClient, [
    { target_type: view.targetType, target_id: view.targetId },
  ])
  const target = targets.get(view.targetId) ?? {
    content: null,
    authorName: null,
    communityName: null,
    contentCreatedAt: null,
  }

  const isListingTarget = view.targetType === "listing"
  const listingHidden = isListingTarget && target.listingHidden === true

  const contentLabel = shortLabel(target.content)
  const parsedReason = parseReportReason(scrubReportReason(view.reason))
  const metaParts = [
    TARGET_LABELS[view.targetType] ?? view.targetType,
    target.communityName,
    parsedReason.categoryLabel ? `Denúncia por ${parsedReason.categoryLabel}` : null,
    `Recebida em ${formatDate(view.receivedAt)}`,
  ].filter((part): part is string => part !== null && part.length > 0)

  const caseClosed = view.status === "resolved"

  async function decideAction(_prev: DecisionState, formData: FormData): Promise<DecisionState> {
    "use server"
    const decision = String(formData.get("decision") ?? "")
    const justificativa = String(formData.get("justificativa") ?? "")
    // O alvo vem do fechamento desta página (params do servidor); o
    // formulário só entrega a decisão e a justificativa humanas.
    // Para anúncio, "ocultar" NÃO passa pelo resolve_report de service_role: a
    // marca de moderação e a trilha exigem o RPC chamado com o JWT do operador,
    // para que o ator gravado venha de auth.uid() (ADR-20261006).
    const r = isListingTarget
      ? await resolveListingReport(view.id, view.targetId, decision, justificativa)
      : await resolveReport(view.id, decision, justificativa)
    return decisionResult(r)
  }

  async function restoreAction(_prev: RestoreState, formData: FormData): Promise<RestoreState> {
    "use server"
    const justificativa = String(formData.get("justificativa") ?? "")
    return restoreResult(await restoreListing(view.targetId, justificativa))
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <BackToQueue />

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight break-words">
          {contentLabel || "Denúncia sem conteúdo disponível"}
        </h1>
        <p className="text-sm text-muted">{metaParts.join(" · ")}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <section
            aria-labelledby="report-content-heading"
            className="rounded-xl border border-border bg-surface p-5"
          >
            <h2 id="report-content-heading" className="text-base font-semibold">
              Conteúdo denunciado
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <MemberAvatar name={target.authorName} size="sm" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">
                    {target.authorName ?? "autor sem perfil"}
                  </span>
                  <span className="text-xs text-muted">
                    {[
                      target.contentCreatedAt ? formatDate(target.contentCreatedAt) : null,
                      target.communityName,
                    ]
                      .filter((part): part is string => part !== null && part.length > 0)
                      .join(" · ") || "origem indisponível"}
                  </span>
                </div>
              </div>
              {target.content ? (
                <p className="text-sm break-words whitespace-pre-wrap">{target.content}</p>
              ) : (
                <p className="text-sm text-muted">
                  O conteúdo denunciado não está disponível — pode já ter sido removido.
                </p>
              )}
              {!caseClosed && view.openReportsOnTarget > 1 && (
                <p className="text-xs font-medium text-danger">
                  {view.openReportsOnTarget} denúncias abertas neste alvo
                </p>
              )}
            </div>
          </section>

          <section
            aria-labelledby="report-reason-heading"
            className="rounded-xl border border-border bg-surface p-5"
          >
            <h2 id="report-reason-heading" className="text-base font-semibold">
              Motivo da denúncia
            </h2>
            <div className="mt-3 flex flex-col gap-3">
              {parsedReason.categoryLabel ? (
                <>
                  <p className="text-sm font-medium">{parsedReason.categoryLabel}</p>
                  {parsedReason.explanation && (
                    <p className="text-sm break-words whitespace-pre-wrap text-muted">
                      {parsedReason.explanation}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm break-words whitespace-pre-wrap">{parsedReason.raw}</p>
              )}
              <div className="flex items-start gap-2 rounded-lg border border-border bg-[var(--semantic-surface-sunken)] p-3 text-xs text-muted">
                <LockGlyph />
                <p>
                  A identidade de quem denunciou este conteúdo está protegida. Não é exibida ao
                  autor da publicação.
                </p>
              </div>
            </div>
          </section>

          <section
            aria-labelledby="report-actions-heading"
            className="rounded-xl border border-border bg-surface p-5"
          >
            <h2 id="report-actions-heading" className="text-base font-semibold">
              Ações
            </h2>
            <div className="mt-3">
              {caseClosed ? (
                <div className="flex flex-col items-start gap-3">
                  <Chip size="sm" variant="soft" color="default">
                    Concluída
                  </Chip>
                  <p className="text-sm text-muted">
                    Esta denúncia foi encerrada em {formatDate(view.resolvedAt)}.
                    {view.operatorNote !== null && (
                      <> Justificativa registrada: {view.operatorNote}</>
                    )}
                  </p>
                  {isListingTarget ? (
                    // O formulário fica montado depois da restauração, mesmo com
                    // o anúncio já visível: é ele que carrega o retorno da ação.
                    // Se saísse do DOM quando `listingHidden` vira falso, o
                    // `revalidatePath` remontaria a página e o desfecho
                    // desapareceria antes de ser lido — o operador ficaria sem
                    // saber se a decisão entrou. O RPC é idempotente, então
                    // repetir aqui devolve "nada mudou", nunca um falso sucesso.
                    <div className="flex w-full flex-col gap-3">
                      <p className="text-sm text-muted">
                        {listingHidden
                          ? "O anúncio continua oculto pela moderação. Encerrar a denúncia não o devolve: a restauração é uma decisão separada e auditada."
                          : "Este anúncio não está oculto pela moderação no momento. Se voltar a ser ocultado, a restauração aparece aqui de novo."}
                      </p>
                      <ListingRestoreForm action={restoreAction} />
                    </div>
                  ) : null}
                </div>
              ) : (
                <>
                  {isListingTarget ? (
                    <p className="mb-4 text-sm text-muted">
                      {listingHidden
                        ? "Este anúncio já está oculto pela moderação; ocultar de novo resolve a denúncia sem duplicar o evento."
                        : "Ocultar este anúncio deixa de mostrá-lo para terceiros e para quem o salvou, sem mudar a situação nem o público que o anunciante escolheu."}
                    </p>
                  ) : null}
                  <DecisionForm action={decideAction} />
                </>
              )}
            </div>
          </section>
        </div>

        <aside
          aria-labelledby="report-timeline-heading"
          className="flex h-fit flex-col rounded-xl border border-border bg-surface p-5"
        >
          <h2 id="report-timeline-heading" className="text-base font-semibold">
            Linha do tempo
          </h2>
          <ol className="mt-3 flex flex-col gap-4">
            <li className="flex gap-3">
              <span
                aria-hidden="true"
                className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-accent"
              />
              <div className="flex flex-col">
                <span className="text-sm">Denúncia recebida</span>
                <time className="text-xs text-muted">{formatDate(view.receivedAt)}</time>
              </div>
            </li>
            {caseClosed ? (
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-accent"
                />
                <div className="flex flex-col">
                  <span className="text-sm">Decisão registrada</span>
                  {view.resolvedAt !== null && (
                    <time className="text-xs text-muted">{formatDate(view.resolvedAt)}</time>
                  )}
                </div>
              </li>
            ) : (
              <li className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-border"
                />
                <div className="flex flex-col">
                  <span className="text-sm">Aguardando decisão</span>
                  <span className="text-xs text-muted">Um operador precisa decidir.</span>
                </div>
              </li>
            )}
          </ol>
        </aside>
      </div>
    </section>
  )
}
