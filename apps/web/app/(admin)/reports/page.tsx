import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"

// The operator panel reads through `service_role` behind `is_current_user_operator`
// and has no possible static form. Without this, `next build` prerenders it and
// throws on the missing NEXT_PUBLIC_* credentials before any request exists.
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

// H-Task 3: ocultar, registrar e avisar sao um ato so, dentro de
// public.resolve_report. Esta pagina e a rota de API faziam a mesma coisa de
// dois jeitos diferentes, e o jeito daqui — que e o que o operador usa de
// verdade — nunca notificava o denunciante. Enquanto forem dois codigos, um
// volta a divergir.
async function callResolveReport(
  reportId: string,
  operatorId: string,
  action: "hide" | "dismiss",
  note: string | null,
) {
  const serviceClient = createServiceClient()
  // `exactOptionalPropertyTypes` esta ligado: passar `p_note: undefined` nao e
  // o mesmo que omitir a chave. Sem nota, a chave nao vai.
  const { error } = await serviceClient.rpc("resolve_report", {
    p_report_id: reportId,
    p_operator_user_id: operatorId,
    p_action: action,
    ...(note === null ? {} : { p_note: note }),
  })
  if (error) throw new Error(error.message)
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

  await callResolveReport(reportId, userId, "hide", null)
  revalidatePath("/reports")
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

  await callResolveReport(reportId, userId, "dismiss", operatorNote)
  revalidatePath("/reports")
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
