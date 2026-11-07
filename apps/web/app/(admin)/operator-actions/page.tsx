import type { Route } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { requireOperatorId } from "../../../lib/admin/operator"
import { createServerClient } from "../../../lib/supabase/server"
import { QueryError } from "../admissions/query-error"

export const dynamic = "force-dynamic"

const ACTIONS: Record<string, string> = {
  document_opened: "Acesso ao documento",
  document_approved: "Documento aprovado",
  document_rejected: "Documento recusado",
  document_purge_requested: "Descarte de documentos solicitado",
  verification_reprocessed: "Verificação reprocessada",
  admission_rejected: "Admissão recusada definitivamente",
  report_hide: "Conteúdo ocultado",
  report_dismiss: "Conteúdo mantido",
  report_remove: "Conteúdo removido da comunidade",
  suspension_applied: "Suspensão aplicada",
  suspension_ended: "Suspensão encerrada",
  suspension_expired: "Suspensão encerrada pelo prazo",
}

export default async function OperatorActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ pagina?: string }>
}) {
  const client = createServerClient()
  if (!(await requireOperatorId(client))) notFound()
  const { pagina } = await searchParams
  const parsed = Number(pagina ?? 1)
  const page = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
  const { data, error } = await client
    .from("operator_actions")
    .select("id, actor_id, action, target_type, target_id, reason, created_at, expires_at")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 50, page * 50)

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Registro das ações</h1>
      <p className="text-sm text-muted">
        Histórico restrito à operação. Horário exibido no seu fuso. Não inclui documentos ou a
        identidade de quem denunciou.
      </p>
      {error ? (
        <QueryError message="Não foi possível carregar o registro. Tente novamente." />
      ) : data?.length === 0 ? (
        <p>Nenhuma ação registrada nesta página.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {data?.slice(0, 50).map((row) => (
            <li key={row.id} className="rounded-xl border border-border bg-surface p-5">
              <h2 className="font-semibold">{ACTIONS[row.action] ?? row.action}</h2>
              <dl className="mt-3 grid gap-2 text-sm">
                <div>
                  <dt className="text-muted">Quando</dt>
                  <dd>
                    <time dateTime={row.created_at}>
                      {new Date(row.created_at).toLocaleString("pt-BR")}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Quem</dt>
                  <dd className="break-all">{row.actor_id ?? "Sistema ou conta removida"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Alvo ({row.target_type})</dt>
                  <dd className="break-all">{row.target_id}</dd>
                </div>
                {row.reason && (
                  <div>
                    <dt className="text-muted">Motivo</dt>
                    <dd className="break-words whitespace-pre-wrap">{row.reason}</dd>
                  </div>
                )}
                {row.expires_at && (
                  <div>
                    <dt className="text-muted">Prazo</dt>
                    <dd>{new Date(row.expires_at).toLocaleString("pt-BR")}</dd>
                  </div>
                )}
              </dl>
            </li>
          ))}
        </ol>
      )}
      {!error && (
        <nav aria-label="Páginas do registro" className="flex gap-4">
          {page > 1 && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`/operator-actions?pagina=${page - 1}` as Route}
            >
              Anterior
            </Link>
          )}
          {(data?.length ?? 0) > 50 && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`/operator-actions?pagina=${page + 1}` as Route}
            >
              Próxima
            </Link>
          )}
        </nav>
      )}
    </section>
  )
}
