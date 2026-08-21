import { createServerClient } from "@supabase/ssr"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import { SUPPORT_SLA_HOURS } from "../../../lib/support"

// The operator panel reads through `service_role` behind `is_current_user_operator`
// and has no possible static form. Without this, `next build` prerenders it and
// throws on the missing NEXT_PUBLIC_* credentials before any request exists.
export const dynamic = "force-dynamic"

const ADMIN_NOTES_THRESHOLD = 1
const SLA_MS = SUPPORT_SLA_HOURS * 60 * 60 * 1000

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

// H-Task 4 (F164): o card mostrava tipo, data absoluta, motivo e um UUID.
// Sobre um UUID ninguem decide. O RPC monta o caso — trecho, autor e
// reincidencia no mesmo alvo — porque o PostgREST nao resolve embed onde nao ha
// foreign key, e `reports.target_id` e polimorfico.
const TARGET_LABELS: Record<string, string> = {
  post: "Publicação",
  comment: "Comentário",
  group: "Grupo",
  message: "Mensagem privada",
  recommendation_request: "Pedido de indicação",
  recommendation_reply: "Resposta de indicação",
}

// Link so onde existe rota de detalhe. Mensagem e indicacao nao tem: um link
// que cai em 404 e pior que nenhum (regra 4 da §12).
function targetHref(targetType: string, targetId: string): string | null {
  if (targetType === "post") return `/community?post=${targetId}`
  if (targetType === "group") return `/groups/${targetId}`
  return null
}

export default async function AdminReportsPage() {
  const serviceClient = createServiceClient()
  const { data: reports, error } = await serviceClient.rpc("list_open_reports")

  // Ler o `error` de toda consulta: descartar e como a lista de membros de
  // grupo ficou vazia em producao sem ninguem notar (README, licao do E2E).
  if (error) throw new Error(`fila de denuncias indisponivel: ${error.message}`)

  const queue = reports ?? []
  const now = Date.now()

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
                {TARGET_LABELS[report.target_type] ?? report.target_type}
              </span>
              <div className="flex items-center gap-2">
                {now - new Date(report.created_at).getTime() > SLA_MS && (
                  <span className="rounded-sm bg-danger px-1.5 py-0.5 text-xs font-medium text-danger-foreground">
                    +{SUPPORT_SLA_HOURS}h
                  </span>
                )}
                <time className="text-xs text-muted">
                  {new Date(report.created_at).toLocaleString("pt-BR")}
                </time>
              </div>
            </header>

            <p className="text-sm">{report.reason}</p>

            <div className="rounded-md border border-border bg-surface p-3">
              <p className="text-xs text-muted">
                {report.target_author_name ?? "autor sem perfil"}
                {report.open_reports_on_target > 1 && (
                  <span className="ml-2 font-medium text-danger">
                    {report.open_reports_on_target} denúncias abertas neste alvo
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm break-words whitespace-pre-wrap">
                {report.target_excerpt ?? "conteúdo não encontrado — pode já ter sido removido"}
              </p>
            </div>

            <p className="text-xs text-muted">
              {targetHref(report.target_type, report.target_id) ? (
                <a
                  className="underline"
                  href={targetHref(report.target_type, report.target_id) as string}
                >
                  abrir o alvo
                </a>
              ) : (
                <span>sem tela de detalhe para este tipo</span>
              )}
              <span className="ml-2">id: {report.target_id}</span>
            </p>

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
