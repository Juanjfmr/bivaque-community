import type { Route } from "next"
import { revalidatePath } from "next/cache"
import Link from "next/link"
import type { ReactNode } from "react"
import { createServerClient } from "../../../../lib/supabase/server"
import { EmptyState } from "../../../components/bivaque/empty-state"
import { decideDocumentAction, rejectPendingUserAction, reprocessUserAction } from "../actions"
import { QueryError } from "../query-error"
import { DecisionForms, type DecisionState } from "./decision-forms"

// O painel lê por `service_role` atrás de `is_current_user_operator`; não há
// forma estática de prerrenderizar esta rota no build.
export const dynamic = "force-dynamic"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STATUS_LABELS: Record<string, string> = {
  pending: "Em análise",
  temporary_error: "Falha temporária",
  rejected: "Rejeitada",
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? "data indisponível"
    : date.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
}

// Mapeia o resultado da action (que já confirmou operador antes da chamada
// privilegiada) em estado visual. O motivo interno do banco não é ecoado —
// só as mensagens que o operador precisa para reagir.
function decisionResult(r: { ok: boolean; error?: string }, okMessage: string): DecisionState {
  if (r.ok) return { status: "ok", message: okMessage }
  if (r.error === "forbidden") return { status: "forbidden", message: "" }
  if (r.error === "rejection requires a reason") {
    return { status: "error", message: "Informe o motivo para registrar a recusa." }
  }
  return {
    status: "error",
    message: "Não foi possível registrar agora. Confira o estado da solicitação e tente novamente.",
  }
}

function BackToQueue() {
  return (
    <Link
      href="/admissions"
      className="inline-flex min-h-11 items-center gap-1 text-sm text-muted hover:text-foreground"
    >
      <span aria-hidden="true">←</span> Voltar para a fila
    </Link>
  )
}

function Card({
  headingId,
  title,
  children,
}: {
  headingId: string
  title: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-border bg-surface p-5">
      <h2 id={headingId} className="text-base font-semibold">
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

export default async function AdmissionAnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: userId } = await params

  if (!UUID_RE.test(userId)) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
        <BackToQueue />
        <h1 className="text-2xl font-semibold tracking-tight">Solicitação não encontrada</h1>
        <p className="text-sm text-muted">
          O endereço informado não corresponde a uma solicitação.
        </p>
      </section>
    )
  }

  const serviceClient = createServerClient()
  const [{ data: queueRows, error: queueError }, { data: documentRows, error: documentsError }] =
    await Promise.all([
      serviceClient.rpc("list_verification_queue"),
      serviceClient.rpc("list_verification_documents"),
    ])

  if (queueError || documentsError) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
        <BackToQueue />
        <h1 className="text-2xl font-semibold tracking-tight">Análise de solicitação</h1>
        <QueryError message="Não foi possível carregar esta solicitação agora." />
      </section>
    )
  }

  const entry = (queueRows ?? []).find((row) => row.user_id === userId) ?? null
  const document = (documentRows ?? []).find((row) => row.user_id === userId) ?? null
  const documentId = document?.document_id ?? null

  if (!entry && !document) {
    return (
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
        <BackToQueue />
        <h1 className="text-2xl font-semibold tracking-tight">Solicitação não encontrada</h1>
        <EmptyState
          title="Nada para analisar aqui"
          description="A solicitação pode já ter sido concluída — casos verificados saem da fila — ou o endereço está incorreto."
          action={
            <Link
              href="/admissions"
              className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium"
            >
              Ver a fila completa
            </Link>
          }
        />
      </section>
    )
  }

  const { data: authUser, error: authError } = await serviceClient.auth.admin.getUserById(userId)
  const email = authError ? null : (authUser.user?.email ?? null)

  const status = entry?.status ?? null
  const caseClosed = status === "rejected"
  const canReprocess = status !== null && status !== "rejected" && documentId === null
  const canRejectPending = status !== null && status !== "rejected"

  async function approveDocumentAction(
    _prev: DecisionState,
    _formData: FormData,
  ): Promise<DecisionState> {
    "use server"
    if (documentId === null) {
      return { status: "error", message: "Nenhum documento aguardando decisão." }
    }
    const r = await decideDocumentAction(documentId, "approved", "")
    if (r.ok) revalidatePath(`/admissions/${userId}`)
    return decisionResult(r, "Documento aprovado. A decisão foi registrada.")
  }

  async function rejectDocumentAction(
    _prev: DecisionState,
    formData: FormData,
  ): Promise<DecisionState> {
    "use server"
    if (documentId === null) {
      return { status: "error", message: "Nenhum documento aguardando decisão." }
    }
    const reason = String(formData.get("reason") ?? "")
    const r = await decideDocumentAction(documentId, "rejected", reason)
    if (r.ok) revalidatePath(`/admissions/${userId}`)
    return decisionResult(r, "Documento rejeitado. O motivo ficou no registro da decisão.")
  }

  async function reprocessAction(
    _prev: DecisionState,
    _formData: FormData,
  ): Promise<DecisionState> {
    "use server"
    const r = await reprocessUserAction(userId)
    if (r.ok) revalidatePath(`/admissions/${userId}`)
    return decisionResult(r, "Etapa de reconciliação executada para esta verificação.")
  }

  async function rejectPendingAction(
    _prev: DecisionState,
    formData: FormData,
  ): Promise<DecisionState> {
    "use server"
    const reason = String(formData.get("reason") ?? "")
    const r = await rejectPendingUserAction(userId, reason)
    if (r.ok) revalidatePath(`/admissions/${userId}`)
    return decisionResult(r, "Caso encerrado. A pessoa verá a situação no próprio status.")
  }

  const requestReference = `REF-${userId.slice(0, 8).toUpperCase()}`

  const timeline: { label: string; at: string | null }[] = []
  if (entry) timeline.push({ label: "Solicitação recebida", at: entry.created_at })
  if (document) timeline.push({ label: "Documento enviado", at: document.uploaded_at })
  timeline.push({ label: caseClosed ? "Caso encerrado" : "Em análise", at: null })

  const nextStep = document
    ? "Abra o documento, confira o resumo e registre a decisão."
    : caseClosed
      ? "Caso encerrado. Nada mais é esperado nesta tela."
      : status === "temporary_error"
        ? "A reconciliação automática tenta novamente em ciclo próprio; encerre com motivo se decidir assim."
        : "Aguarde o próximo ciclo de verificação ou encerre o caso com motivo."

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <BackToQueue />

      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {entry?.display_name || "Sem perfil ainda"}
        </h1>
        <p className="text-sm text-muted">
          Solicitação {requestReference}
          {email ? ` · ${email}` : " · e-mail indisponível no momento"}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6">
          <Card headingId="admission-summary-heading" title="Resumo da verificação">
            <ul className="flex flex-col gap-3 text-sm">
              <li className="flex items-baseline justify-between gap-3">
                <span>Verificação por CPF</span>
                <span className="text-muted">
                  {status ? (STATUS_LABELS[status] ?? status) : "Fora da fila de verificação"}
                </span>
              </li>
              <li className="flex items-baseline justify-between gap-3">
                <span>Documento de identidade</span>
                <span className="text-muted">
                  {document ? `Recebido em ${formatDate(document.uploaded_at)}` : "Não enviado"}
                </span>
              </li>
              {(document || status === "temporary_error") && (
                <li className="flex items-baseline gap-2 font-medium text-warning">
                  <span aria-hidden="true">⚠</span> Revisão necessária
                </li>
              )}
              {document && (
                <li className="text-xs text-muted">
                  O documento expira em {formatDate(document.expires_at)}; depois disso não há
                  decisão possível.
                </li>
              )}
            </ul>
          </Card>

          <DecisionForms
            documentId={documentId}
            documentHref={
              documentId === null ? null : (`/admissions/document/${documentId}` as Route)
            }
            canReprocess={canReprocess}
            canRejectPending={canRejectPending}
            caseClosed={caseClosed}
            approveAction={approveDocumentAction}
            rejectDocumentAction={rejectDocumentAction}
            reprocessAction={reprocessAction}
            rejectPendingAction={rejectPendingAction}
          />
        </div>

        <aside className="flex flex-col gap-6">
          <Card headingId="admission-timeline-heading" title="Linha do tempo">
            <ol className="flex flex-col gap-4">
              {timeline.map((item) => (
                <li key={item.label} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border border-accent"
                  />
                  <div className="flex flex-col">
                    <span className="text-sm">{item.label}</span>
                    {item.at && <time className="text-xs text-muted">{formatDate(item.at)}</time>}
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card headingId="admission-nextstep-heading" title="Próximo passo">
            <p className="text-sm">{nextStep}</p>
          </Card>
        </aside>
      </div>
    </section>
  )
}
