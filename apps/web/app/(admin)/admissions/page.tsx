import { Button, TextArea } from "@heroui/react"
import { revalidatePath } from "next/cache"
import { createServerClient } from "../../../lib/supabase/server"
import { SUPPORT_SLA_HOURS } from "../../../lib/support"
import { decideDocumentAction, rejectPendingUserAction, reprocessUserAction } from "./actions"

// The operator panel reads through `service_role` behind `is_current_user_operator`
// and has no possible static form. Without this, `next build` prerenders it and
// throws on the missing NEXT_PUBLIC_* credentials before any request exists.
export const dynamic = "force-dynamic"

const SLA_MS = SUPPORT_SLA_HOURS * 60 * 60 * 1000

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando Portal",
  temporary_error: "Falha temporaria",
  rejected: "Rejeitado",
  verified: "Verificado",
}

const DOC_LABELS: Record<string, string> = {
  "application/pdf": "PDF",
  "image/jpeg": "JPEG",
  "image/png": "PNG",
}

interface QueueEntry {
  user_id: string
  display_name: string
  status: string
  created_at: string
}

interface DocumentEntry {
  document_id: string
  user_id: string
  mime_type: string
  review_status: string
  uploaded_at: string
  expires_at: string
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "agora"
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  return `${days} d`
}

async function reprocess(userId: string) {
  "use server"
  const r = await reprocessUserAction(userId)
  if (!r.ok) {
    throw new Error(r.error ?? "reprocess failed")
  }
  revalidatePath("/admissions")
}

async function decideApprove(documentId: string) {
  "use server"
  const r = await decideDocumentAction(documentId, "approved", "")
  if (!r.ok) {
    throw new Error(r.error ?? "approve failed")
  }
  revalidatePath("/admissions")
}

async function decideReject(formData: FormData) {
  "use server"
  const documentId = String(formData.get("documentId") ?? "")
  const reason = String(formData.get("reason") ?? "")
  const r = await decideDocumentAction(documentId, "rejected", reason)
  if (!r.ok) {
    throw new Error(r.error ?? "reject failed")
  }
  revalidatePath("/admissions")
}

async function rejectPending(formData: FormData) {
  "use server"
  const userId = String(formData.get("userId") ?? "")
  const reason = String(formData.get("reason") ?? "")
  const r = await rejectPendingUserAction(userId, reason)
  if (!r.ok) {
    throw new Error(r.error ?? "reject failed")
  }
  revalidatePath("/admissions")
}

export default async function AdminAdmissionsPage() {
  const serviceClient = createServerClient()

  const [{ data: queue }, { data: documents }] = await Promise.all([
    serviceClient.rpc("list_verification_queue"),
    serviceClient.rpc("list_verification_documents"),
  ])
  const entries: QueueEntry[] = queue ?? []
  const docs: DocumentEntry[] = documents ?? []

  const now = Date.now()

  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12"
      aria-labelledby="admissions-heading"
    >
      <h1 id="admissions-heading" className="text-2xl font-semibold tracking-tight">
        Fila de admissao
      </h1>

      {/* Documentos pendentes de decisao */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Documentos aguardando decisao ({docs.length})</h2>
        {docs.length === 0 ? (
          <p className="text-sm text-muted">Nenhum documento aguardando.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {docs.map((doc) => {
              const uploadedMs = now - new Date(doc.uploaded_at).getTime()
              const pastSla = uploadedMs > SLA_MS
              return (
                <li
                  key={doc.document_id}
                  className="flex flex-col gap-3 rounded-md border border-border p-4"
                >
                  <header className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {DOC_LABELS[doc.mime_type] ?? doc.mime_type}
                    </span>
                    <time className="text-xs text-muted">
                      enviado ha {formatRelative(doc.uploaded_at)}
                    </time>
                    {pastSla && (
                      <span className="rounded-sm bg-danger px-1.5 py-0.5 text-xs font-medium text-danger-foreground">
                        +{SUPPORT_SLA_HOURS}h
                      </span>
                    )}
                  </header>
                  <p className="text-xs text-muted">
                    expira em {formatRelative(doc.expires_at)}; user: {doc.user_id}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <form action={decideApprove.bind(null, doc.document_id)}>
                      <Button type="submit" variant="primary" size="sm">
                        Aprovar
                      </Button>
                    </form>
                    <form action={decideReject} className="flex flex-col gap-2">
                      <input type="hidden" name="documentId" value={doc.document_id} />
                      <TextArea
                        name="reason"
                        placeholder="Motivo da rejeicao"
                        aria-label="Motivo da rejeicao"
                        className="w-80"
                      />
                      <Button type="submit" variant="danger" size="sm">
                        Rejeitar
                      </Button>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Fila de verificacao (sem documento) */}
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Fila de verificacao ({entries.length})</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">Nenhuma admissao pendente.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => {
              const waitingMs = now - new Date(entry.created_at).getTime()
              const pastSla = waitingMs > SLA_MS
              const hasDocument = docs.some((d) => d.user_id === entry.user_id)
              return (
                <li
                  key={entry.user_id}
                  className="flex flex-col gap-3 rounded-md border border-border p-4"
                >
                  <header className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {entry.display_name || "Sem perfil ainda"}
                    </span>
                    <time className="text-xs text-muted">
                      aguardando ha {formatRelative(entry.created_at)}
                    </time>
                    {pastSla && (
                      <span className="rounded-sm bg-danger px-1.5 py-0.5 text-xs font-medium text-danger-foreground">
                        +{SUPPORT_SLA_HOURS}h
                      </span>
                    )}
                  </header>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span>status: {STATUS_LABELS[entry.status] ?? entry.status}</span>
                    {hasDocument && <span> (decidir documento acima)</span>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {entry.status !== "rejected" && !hasDocument && (
                      <form action={reprocess.bind(null, entry.user_id)}>
                        <Button type="submit" variant="secondary" size="sm">
                          Reprocessar
                        </Button>
                      </form>
                    )}
                    {entry.status !== "rejected" && (
                      <form action={rejectPending} className="flex flex-col gap-2">
                        <input type="hidden" name="userId" value={entry.user_id} />
                        <TextArea
                          name="reason"
                          placeholder="Motivo da rejeicao definitiva"
                          aria-label="Motivo da rejeicao definitiva"
                          className="w-80"
                        />
                        <Button type="submit" variant="danger" size="sm">
                          Rejeitar definitivamente
                        </Button>
                      </form>
                    )}
                  </div>
                  <p className="text-xs text-muted">id: {entry.user_id}</p>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
