import type { Route } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { requireOperatorId, UUID_RE } from "../../../lib/admin/operator"
import { createServerClient } from "../../../lib/supabase/server"
import { QueryError } from "../admissions/query-error"
import { SuspensionForm } from "./forms"

export const dynamic = "force-dynamic"

export default async function SuspensionsPage({
  searchParams,
}: {
  searchParams: Promise<{ membro?: string; pagina?: string }>
}) {
  const client = createServerClient()
  if (!(await requireOperatorId(client))) notFound()
  const { membro, pagina } = await searchParams
  const parsed = Number(pagina ?? 1)
  const page = Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
  const { data, error } = await client
    .from("profile_suspensions")
    .select("user_id, updated_at, expires_at")
    .order("updated_at", { ascending: false })
    .range((page - 1) * 50, page * 50)
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Suspensões</h1>
      <p className="text-sm text-muted">
        Suspender bloqueia novas ações. A leitura e o acesso à Ajuda continuam disponíveis. O motivo
        fica no registro restrito da operação.
      </p>
      <section
        className="rounded-xl border border-border bg-surface p-5"
        aria-labelledby="apply-heading"
      >
        <h2 id="apply-heading" className="mb-4 text-lg font-semibold">
          Aplicar suspensão
        </h2>
        <SuspensionForm userId={membro && UUID_RE.test(membro) ? membro : ""} />
      </section>
      <h2 className="text-lg font-semibold">Contas suspensas</h2>
      {error ? (
        <QueryError message="Não foi possível carregar as suspensões. Tente novamente." />
      ) : data?.length === 0 ? (
        <p>Nenhuma conta suspensa.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {data?.slice(0, 50).map((row) => (
            <li key={row.user_id} className="rounded-xl border border-border bg-surface p-5">
              <h3 className="font-medium break-all">Conta {row.user_id}</h3>
              <p className="my-3 text-sm text-muted">
                {row.expires_at
                  ? `Prazo: ${new Date(row.expires_at).toLocaleString("pt-BR")}`
                  : "Suspensão anterior sem prazo"}
                {row.expires_at && Date.parse(row.expires_at) <= Date.now()
                  ? " · Prazo encerrado; escrita já liberada."
                  : ""}
              </p>
              <SuspensionForm userId={row.user_id} ending />
            </li>
          ))}
        </ul>
      )}
      {!error && (
        <nav aria-label="Páginas de suspensões" className="flex gap-4">
          {page > 1 && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`/suspensions?pagina=${page - 1}` as Route}
            >
              Anterior
            </Link>
          )}
          {(data?.length ?? 0) > 50 && (
            <Link
              className="inline-flex min-h-11 items-center underline"
              href={`/suspensions?pagina=${page + 1}` as Route}
            >
              Próxima
            </Link>
          )}
        </nav>
      )}
    </section>
  )
}
