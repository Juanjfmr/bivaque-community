import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

export const dynamic = "force-dynamic"

const ADMIN_NOTES_THRESHOLD = 1

async function getAuthedUserId(): Promise<string | null> {
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
        // Read-only: writes happen in Server Actions elsewhere.
      },
    },
  })
  const {
    data: { user },
  } = await authClient.auth.getUser()
  return user?.id ?? null
}

async function authorizeOperator(userId: string): Promise<boolean> {
  const serviceClient = createServiceClient()
  const { data } = await serviceClient.rpc("is_current_user_operator", {
    p_user_id: userId,
  })
  return data === true
}

async function fetchReport(reportId: string) {
  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from("reports")
    .select("target_type, target_id")
    .eq("id", reportId)
    .single()
  if (error || !data) return null
  return data
}

async function markResolved(reportId: string, operatorNote: string, operatorId: string) {
  const serviceClient = createServiceClient()
  await serviceClient
    .from("reports")
    .update({
      status: "resolved",
      operator_note: operatorNote,
      resolved_by: operatorId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("status", "open")
}

async function softDeleteTarget(targetType: string, targetId: string): Promise<{ ok: boolean }> {
  const serviceClient = createServiceClient()
  if (targetType === "post") {
    const { error } = await serviceClient
      .from("posts")
      .update({ is_deleted: true })
      .eq("id", targetId)
    return { ok: !error }
  }
  if (targetType === "comment") {
    const { error } = await serviceClient
      .from("comments")
      .update({ is_deleted: true })
      .eq("id", targetId)
    return { ok: !error }
  }
  if (targetType === "group") {
    const { error } = await serviceClient
      .from("groups")
      .update({ is_deleted: true })
      .eq("id", targetId)
    return { ok: !error }
  }
  return { ok: false }
}

async function hideReportAction(formData: FormData) {
  "use server"
  const userId = await getAuthedUserId()
  if (!userId) throw new Error("unauthenticated")
  if (!(await authorizeOperator(userId))) throw new Error("forbidden")

  const reportId = formData.get("reportId")
  if (typeof reportId !== "string" || reportId.length === 0) {
    throw new Error("reportId required")
  }

  const report = await fetchReport(reportId)
  if (!report) throw new Error("report not found")

  const { ok } = await softDeleteTarget(report.target_type, report.target_id)
  if (!ok) throw new Error("hide failed")

  await markResolved(reportId, `content hidden (${report.target_type})`, userId)
  revalidatePath("/admin/reports")
}

async function resolveReportAction(formData: FormData) {
  "use server"
  const userId = await getAuthedUserId()
  if (!userId) throw new Error("unauthenticated")
  if (!(await authorizeOperator(userId))) throw new Error("forbidden")

  const reportId = formData.get("reportId")
  if (typeof reportId !== "string" || reportId.length === 0) {
    throw new Error("reportId required")
  }
  const note = formData.get("note")
  const operatorNote =
    typeof note === "string" && note.length >= ADMIN_NOTES_THRESHOLD ? note : null

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from("reports")
    .update({
      status: "resolved",
      operator_note: operatorNote,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .eq("status", "open")
    .select("id")
    .single()

  if (error || !data) throw new Error("not found or already resolved")
  revalidatePath("/admin/reports")
}

export default async function AdminReportsPage() {
  const serviceClient = createServiceClient()
  const { data: reports } = await serviceClient
    .from("reports")
    .select("id, target_type, target_id, reason, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true })

  const queue = reports ?? []

  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12"
      aria-labelledby="reports-heading"
    >
      <h1 id="reports-heading" className="text-2xl font-semibold tracking-tight">
        Fila de denúncias
      </h1>

      {queue.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma denúncia aberta.</p>
      ) : (
        queue.map((report) => (
          <article
            key={report.id}
            className="flex flex-col gap-3 rounded-md border border-border p-4"
          >
            <header className="flex items-baseline justify-between gap-2">
              <span className="text-xs uppercase tracking-wide text-muted">
                {report.target_type}
              </span>
              <time className="text-xs text-muted">
                {new Date(report.created_at).toLocaleString("pt-BR")}
              </time>
            </header>
            <p className="text-sm">{report.reason}</p>
            <p className="text-xs text-muted">alvo: {report.target_id}</p>

            <div className="flex flex-col gap-2 sm:flex-row">
              <form action={hideReportAction} className="flex-1">
                <input type="hidden" name="reportId" value={report.id} />
                <button
                  type="submit"
                  className="w-full rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:bg-danger hover:text-danger-foreground"
                >
                  Ocultar conteúdo
                </button>
              </form>

              <form action={resolveReportAction} className="flex flex-1 gap-2">
                <input type="hidden" name="reportId" value={report.id} />
                <input
                  type="text"
                  name="note"
                  placeholder="Nota (opcional)"
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface px-3 py-2 text-sm"
                />
                <button
                  type="submit"
                  className="rounded-md border border-border bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition-colors hover:bg-accent/90"
                >
                  Resolver
                </button>
              </form>
            </div>
          </article>
        ))
      )}
    </section>
  )
}
