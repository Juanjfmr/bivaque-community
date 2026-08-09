import { createServerClient as createServiceClient } from "../../../lib/supabase/server"
import { SUPPORT_SLA_HOURS } from "../../../lib/support"

// The operator panel reads through `service_role` behind `is_current_user_operator`
// and has no possible static form. Without this, `next build` prerenders it and
// throws on the missing NEXT_PUBLIC_* credentials before any request exists.
export const dynamic = "force-dynamic"

const SLA_MS = SUPPORT_SLA_HOURS * 60 * 60 * 1000

const STATUS_LABELS: Record<string, string> = {
  pending: "Aguardando",
  temporary_error: "Falha temporária",
  rejected: "Rejeitado",
}

interface QueueEntry {
  user_id: string
  display_name: string
  status: string
  created_at: string
}

export default async function AdminAdmissionsPage() {
  const serviceClient = createServiceClient()
  const { data: queue } = await serviceClient.rpc("list_verification_queue")
  const entries: QueueEntry[] = queue ?? []

  const now = Date.now()

  return (
    <section
      className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12"
      aria-labelledby="admissions-heading"
    >
      <h1 id="admissions-heading" className="text-2xl font-semibold tracking-tight">
        Fila de admissão
      </h1>
      <p className="text-sm text-muted">
        {entries.length} pessoa(s) aguardando ou bloqueada(s) na verificação.
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma admissão pendente.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => {
            const waitingMs = now - new Date(entry.created_at).getTime()
            const pastSla = waitingMs > SLA_MS
            return (
              <li
                key={entry.user_id}
                className="flex flex-col gap-2 rounded-md border border-border p-4"
              >
                <header className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-medium">
                    {entry.display_name || "Sem perfil ainda"}
                  </span>
                  <time className="text-xs text-muted">
                    {new Date(entry.created_at).toLocaleString("pt-BR")}
                  </time>
                </header>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wide text-muted">
                    {STATUS_LABELS[entry.status] ?? entry.status}
                  </span>
                  {pastSla && (
                    <span className="rounded-sm bg-danger px-1.5 py-0.5 text-xs font-medium text-danger-foreground">
                      +{SUPPORT_SLA_HOURS}h
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">id: {entry.user_id}</p>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
